import Anthropic from "@anthropic-ai/sdk";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { keccak256, toHex } from "viem";
import { config } from "./lib/config.js";
import { getBorrowerWallet, getPublicClient } from "./lib/wallet.js";
import { giveFeedback } from "./lib/erc8004.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Types ---

interface Task {
  id: string;
  prompt: string;
  domain: string;
}

interface JudgeScores {
  accuracy: number;
  specificity: number;
  actionability: number;
}

interface JudgeResult {
  response_1: JudgeScores;
  response_2: JudgeScores;
  better: "1" | "2";
  explanation: string;
}

interface EvalResult {
  taskId: string;
  domain: string;
  prompt: string;
  baselineResponse: string;
  augmentedResponse: string;
  augmentedIsResponse: "1" | "2";
  judgeResult: JudgeResult;
  baselineScores: JudgeScores;
  augmentedScores: JudgeScores;
  source: "borrow" | "local";
  contentHashes: string[];
}

interface BorrowReceipt {
  fragmentId: string;
  domain: string;
  contentHash: string;
  contentURI: string;
  contractAddress?: string;
  contributorOperatorId: string;
  contributorAgentIds?: string[];
  borrowerOperatorId: string;
  priceCredits: string;
  borrowTxHash: string;
  blockNumber: string;
  content: string;
}

// --- Config ---

const TASKS_PATH = join(__dirname, "..", "eval", "tasks.json");
const RESULTS_DIR = join(__dirname, "..", "eval", "results");
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");
const BORROWS_DIR = join(__dirname, "..", "borrows");

const MODEL = "claude-sonnet-4-20250514";
const JUDGE_MODEL = "claude-sonnet-4-20250514";
const MAX_JUDGE_RETRIES = 3;

// --- Fragment loading ---

function loadBorrowReceipts(domain: string): BorrowReceipt[] {
  if (!existsSync(BORROWS_DIR)) return [];
  return readdirSync(BORROWS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(BORROWS_DIR, f), "utf-8")) as BorrowReceipt)
    .filter((r) => r.domain === domain);
}

function loadLocalFragments(domain: string): { content: string; hashes: string[] } | null {
  try {
    const allFiles = readdirSync(FRAGMENTS_DIR).filter(
      (f) => f.endsWith(".md") && f !== ".gitkeep"
    );
    const matched = allFiles.filter((f) => {
      const content = readFileSync(join(FRAGMENTS_DIR, f), "utf-8");
      const domainMatch = content.match(/^domain:\s*(.+)$/m);
      if (domainMatch && domainMatch[1].trim() === domain) return true;
      return f.includes(domain);
    });
    if (matched.length === 0) return null;
    const contents = matched.map((f) =>
      readFileSync(join(FRAGMENTS_DIR, f), "utf-8")
    );
    return {
      content: contents.join("\n\n---\n\n"),
      hashes: contents.map((c) => keccak256(toHex(c))),
    };
  } catch {
    return null;
  }
}

type FragmentSource = {
  content: string;
  hashes: string[];
  source: "borrow" | "local";
  /// Map from contributorOperatorId → list of agentIds that contributed
  contributors: Map<string, string[]>;
};

function loadFragmentsForDomain(domain: string): FragmentSource | null {
  // Prefer borrow receipts — these are on-chain-verified
  const receipts = loadBorrowReceipts(domain);
  if (receipts.length > 0) {
    // Build contributor map: operatorId → agentIds (for per-contributor feedback)
    const contributors = new Map<string, string[]>();
    for (const r of receipts) {
      if (!contributors.has(r.contributorOperatorId)) {
        contributors.set(r.contributorOperatorId, r.contributorAgentIds || []);
      }
    }
    return {
      content: receipts.map((r) => r.content).join("\n\n---\n\n"),
      hashes: receipts.map((r) => r.contentHash),
      source: "borrow",
      contributors,
    };
  }

  // Fall back to local fragments
  const local = loadLocalFragments(domain);
  if (local) {
    return { ...local, source: "local", contributors: new Map() };
  }

  return null;
}

// --- LLM calls ---

async function callClaude(
  client: Anthropic,
  systemPrompt: string | undefined,
  userPrompt: string
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  const params: Anthropic.MessageCreateParams = {
    model: MODEL,
    max_tokens: 2048,
    messages,
  };

  if (systemPrompt) {
    params.system = systemPrompt;
  }

  const response = await client.messages.create(params);
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

async function callJudge(
  client: Anthropic,
  taskPrompt: string,
  response1: string,
  response2: string
): Promise<JudgeResult> {
  const judgePrompt = `You are evaluating two responses to the same research task.
You do not know which response had access to domain expertise.

Task: ${taskPrompt}

Response 1:
${response1}

Response 2:
${response2}

Score each response on three dimensions (1-10):
1. Accuracy: Are claims factually correct and well-grounded?
2. Specificity: Does it include concrete details rather than generalities?
3. Actionability: Could someone act on this without significant additional research?

Respond with ONLY valid JSON, no other text before or after:
{"response_1":{"accuracy":N,"specificity":N,"actionability":N},"response_2":{"accuracy":N,"specificity":N,"actionability":N},"better":"1" or "2","explanation":"one sentence"}`;

  for (let attempt = 0; attempt < MAX_JUDGE_RETRIES; attempt++) {
    const response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const text =
      response.content.find((b) => b.type === "text")?.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]) as JudgeResult;

      if (
        !parsed.response_1 ||
        !parsed.response_2 ||
        !parsed.better ||
        !parsed.explanation
      ) {
        throw new Error("Missing fields");
      }
      for (const key of [
        "accuracy",
        "specificity",
        "actionability",
      ] as const) {
        if (
          typeof parsed.response_1[key] !== "number" ||
          typeof parsed.response_2[key] !== "number"
        ) {
          throw new Error(`Invalid score for ${key}`);
        }
      }

      return parsed;
    } catch (err) {
      console.warn(
        `  Judge attempt ${attempt + 1} failed to parse: ${err}. Retrying...`
      );
    }
  }

  throw new Error("Judge failed to produce valid JSON after retries");
}

function avg(scores: JudgeScores): number {
  return (scores.accuracy + scores.specificity + scores.actionability) / 3;
}

// --- Main ---

async function main() {
  if (!config.anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY is required for evaluation");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const tasks = loadTasks();
  const submitOnChain = process.argv.includes("--feedback");

  console.log(`Loaded ${tasks.length} evaluation tasks\n`);

  mkdirSync(RESULTS_DIR, { recursive: true });

  const results: EvalResult[] = [];

  // Group tasks by domain to load fragments once per domain
  const domainFragments = new Map<string, FragmentSource | null>();

  for (const task of tasks) {
    if (!domainFragments.has(task.domain)) {
      domainFragments.set(task.domain, loadFragmentsForDomain(task.domain));
    }
  }

  for (const task of tasks) {
    console.log(`=== Task: ${task.id} ===`);
    console.log(`  Domain: ${task.domain}`);

    const frag = domainFragments.get(task.domain);
    if (!frag) {
      console.warn(
        `  No fragment found for domain "${task.domain}", skipping`
      );
      continue;
    }
    console.log(
      `  Fragment loaded (${frag.content.length} chars, source: ${frag.source})`
    );

    // Generate baseline response (no fragment)
    console.log("  Generating baseline response...");
    const baselineResponse = await callClaude(client, undefined, task.prompt);

    // Generate augmented response (with fragment as system context)
    console.log("  Generating augmented response...");
    const augmentedSystemPrompt = `You have access to the following domain expertise. Use it to inform your response.\n\n---\n${frag.content}\n---`;
    const augmentedResponse = await callClaude(
      client,
      augmentedSystemPrompt,
      task.prompt
    );

    // Randomize order for judge
    const augmentedIsResponse = (
      Math.random() < 0.5 ? "1" : "2"
    ) as "1" | "2";
    const [resp1, resp2] =
      augmentedIsResponse === "1"
        ? [augmentedResponse, baselineResponse]
        : [baselineResponse, augmentedResponse];

    // Run judge
    console.log("  Running judge...");
    const judgeResult = await callJudge(client, task.prompt, resp1, resp2);

    // Map scores back to baseline/augmented
    const augmentedScores =
      augmentedIsResponse === "1"
        ? judgeResult.response_1
        : judgeResult.response_2;
    const baselineScores =
      augmentedIsResponse === "1"
        ? judgeResult.response_2
        : judgeResult.response_1;

    const result: EvalResult = {
      taskId: task.id,
      domain: task.domain,
      prompt: task.prompt,
      baselineResponse,
      augmentedResponse,
      augmentedIsResponse,
      judgeResult,
      baselineScores,
      augmentedScores,
      source: frag.source,
      contentHashes: frag.hashes,
    };

    results.push(result);

    // Save per-task result
    const outPath = join(RESULTS_DIR, `${task.id}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2));

    console.log(
      `  Baseline:  acc=${baselineScores.accuracy} spec=${baselineScores.specificity} act=${baselineScores.actionability} avg=${avg(baselineScores).toFixed(1)}`
    );
    console.log(
      `  Augmented: acc=${augmentedScores.accuracy} spec=${augmentedScores.specificity} act=${augmentedScores.actionability} avg=${avg(augmentedScores).toFixed(1)}`
    );
    console.log(`  Judge says: ${judgeResult.explanation}`);
    console.log();
  }

  // Summary
  if (results.length === 0) {
    console.log("No tasks evaluated. Add fragment files to fragments/");
    return;
  }

  console.log("=== SUMMARY ===");
  console.log(`Tasks evaluated: ${results.length}\n`);

  // Group by domain for per-domain summary and feedback
  const domains = [...new Set(results.map((r) => r.domain))];

  let totalBaselineAvg = 0;
  let totalAugmentedAvg = 0;

  for (const domain of domains) {
    const domainResults = results.filter((r) => r.domain === domain);
    const frag = domainFragments.get(domain)!;

    let domBaselineSum = 0;
    let domAugmentedSum = 0;

    console.log(`  --- ${domain} (source: ${frag.source}) ---`);
    for (const r of domainResults) {
      const bAvg = avg(r.baselineScores);
      const aAvg = avg(r.augmentedScores);
      domBaselineSum += bAvg;
      domAugmentedSum += aAvg;
      totalBaselineAvg += bAvg;
      totalAugmentedAvg += aAvg;
      console.log(
        `    ${r.taskId}: baseline=${bAvg.toFixed(1)} augmented=${aAvg.toFixed(1)} delta=${(aAvg - bAvg) > 0 ? "+" : ""}${(aAvg - bAvg).toFixed(1)}`
      );
    }

    const domAvgBaseline = domBaselineSum / domainResults.length;
    const domAvgAugmented = domAugmentedSum / domainResults.length;
    const domDelta = domAvgAugmented - domAvgBaseline;
    console.log(
      `    domain avg: baseline=${domAvgBaseline.toFixed(1)} augmented=${domAvgAugmented.toFixed(1)} delta=${domDelta > 0 ? "+" : ""}${domDelta.toFixed(1)}`
    );
    console.log();

    // --- Per-domain on-chain feedback ---
    if (submitOnChain && frag.source === "borrow") {
      const rawScore = Math.round(5 + domDelta);
      const clampedScore = Math.max(1, Math.min(10, rawScore));

      const evidence = JSON.stringify({
        domain,
        tasksEvaluated: domainResults.length,
        avgBaseline: domAvgBaseline,
        avgAugmented: domAvgAugmented,
        delta: domDelta,
        contentHashes: frag.hashes,
        perTask: domainResults.map((r) => ({
          id: r.taskId,
          baselineAvg: avg(r.baselineScores),
          augmentedAvg: avg(r.augmentedScores),
        })),
      });
      const evidenceHash = keccak256(toHex(evidence)) as `0x${string}`;

      const evidencePath = join(
        RESULTS_DIR,
        `feedback-evidence-${domain}.json`
      );
      writeFileSync(evidencePath, evidence);

      console.log(`    Submitting on-chain feedback for ${domain}...`);
      console.log(`    Score: ${clampedScore}/10 (delta: ${domDelta > 0 ? "+" : ""}${domDelta.toFixed(1)})`);
      console.log(`    Content hashes: ${frag.hashes.length} fragment(s)`);
      console.log(`    Contributors: ${frag.contributors.size} operator(s)`);

      const wallet = getBorrowerWallet();
      const publicClient = getPublicClient();

      // Submit feedback per contributor, using their actual agent IDs from receipts
      for (const [opId, agentIds] of frag.contributors) {
        if (agentIds.length === 0) {
          console.log(`    Operator ${opId}: no agent IDs in receipt, skipping feedback`);
          continue;
        }

        // Submit feedback for each agent ID linked to this contributor
        for (const agentIdStr of agentIds) {
          const agentId = BigInt(agentIdStr);
          console.log(`    Feedback → agent #${agentId} (operator ${opId})`);

          try {
            const hash = await giveFeedback(
              wallet,
              agentId,
              clampedScore,
              "memory-lend",
              domain,
              "",
              evidenceHash
            );

            console.log(`      Tx: ${hash}`);
            const receipt = await publicClient.waitForTransactionReceipt({
              hash,
            });
            console.log(`      Block: ${receipt.blockNumber}`);
          } catch (err) {
            console.error(`      Failed:`, err);
          }
        }
      }
      console.log(`    Reputation feedback submitted for ${domain}.`);
      console.log();
    } else if (submitOnChain && frag.source === "local") {
      console.log(
        `    Skipping on-chain feedback for ${domain} — fragments are local, not borrowed.`
      );
      console.log(
        `    Run borrow-fragment first to create a borrow receipt.\n`
      );
    }
  }

  // Overall
  const overallBaseline = totalBaselineAvg / results.length;
  const overallAugmented = totalAugmentedAvg / results.length;
  const overallDelta = overallAugmented - overallBaseline;

  console.log(
    `  Overall: baseline=${overallBaseline.toFixed(1)} augmented=${overallAugmented.toFixed(1)} delta=${overallDelta > 0 ? "+" : ""}${overallDelta.toFixed(1)}`
  );
  console.log();
  console.log(
    overallDelta > 0
      ? "Memory fragments improved performance."
      : overallDelta === 0
        ? "No measurable difference."
        : "Baseline outperformed augmented — check fragment quality."
  );
}

function loadTasks(): Task[] {
  return JSON.parse(readFileSync(TASKS_PATH, "utf-8"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
