import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
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
  prompt: string;
  baselineResponse: string;
  augmentedResponse: string;
  augmentedIsResponse: "1" | "2";
  judgeResult: JudgeResult;
  baselineScores: JudgeScores;
  augmentedScores: JudgeScores;
}

// --- Config ---

const TASKS_PATH = join(__dirname, "..", "eval", "tasks.json");
const RESULTS_DIR = join(__dirname, "..", "eval", "results");
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");

const MODEL = "claude-sonnet-4-20250514";
const JUDGE_MODEL = "claude-sonnet-4-20250514";
const MAX_JUDGE_RETRIES = 3;

// --- Helpers ---

function loadTasks(): Task[] {
  return JSON.parse(readFileSync(TASKS_PATH, "utf-8"));
}

function loadFragment(domain: string): string | null {
  // Look for any .md file in fragments/ matching the domain
  const { readdirSync } = require("fs");
  try {
    const files: string[] = readdirSync(FRAGMENTS_DIR);
    const match = files.find(
      (f: string) => f.endsWith(".md") && f.includes(domain)
    );
    if (match) {
      return readFileSync(join(FRAGMENTS_DIR, match), "utf-8");
    }
  } catch {
    // fragments dir may not exist yet
  }
  return null;
}

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

Respond with ONLY this JSON:
{
  "response_1": {"accuracy": N, "specificity": N, "actionability": N},
  "response_2": {"accuracy": N, "specificity": N, "actionability": N},
  "better": "1" or "2",
  "explanation": "one sentence"
}`;

  for (let attempt = 0; attempt < MAX_JUDGE_RETRIES; attempt++) {
    const response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const text =
      response.content.find((b) => b.type === "text")?.text || "";

    try {
      // Extract JSON from response (may have markdown fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]) as JudgeResult;

      // Validate structure
      if (
        !parsed.response_1 ||
        !parsed.response_2 ||
        !parsed.better ||
        !parsed.explanation
      ) {
        throw new Error("Missing fields");
      }
      for (const key of ["accuracy", "specificity", "actionability"] as const) {
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

  console.log(`Loaded ${tasks.length} evaluation tasks\n`);

  mkdirSync(RESULTS_DIR, { recursive: true });

  const results: EvalResult[] = [];

  for (const task of tasks) {
    console.log(`=== Task: ${task.id} ===`);
    console.log(`  Domain: ${task.domain}`);

    // Load fragment for this domain
    const fragment = loadFragment(task.domain);
    if (!fragment) {
      console.warn(`  No fragment found for domain "${task.domain}", skipping`);
      continue;
    }
    console.log(`  Fragment loaded (${fragment.length} chars)`);

    // Generate baseline response (no fragment)
    console.log("  Generating baseline response...");
    const baselineResponse = await callClaude(client, undefined, task.prompt);

    // Generate augmented response (with fragment as system context)
    console.log("  Generating augmented response...");
    const augmentedSystemPrompt = `You have access to the following domain expertise. Use it to inform your response.\n\n---\n${fragment}\n---`;
    const augmentedResponse = await callClaude(
      client,
      augmentedSystemPrompt,
      task.prompt
    );

    // Randomize order for judge
    const augmentedIsResponse = Math.random() < 0.5 ? "1" : "2" as "1" | "2";
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
      prompt: task.prompt,
      baselineResponse,
      augmentedResponse,
      augmentedIsResponse,
      judgeResult,
      baselineScores,
      augmentedScores,
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

  let totalBaselineAvg = 0;
  let totalAugmentedAvg = 0;

  for (const r of results) {
    const bAvg = avg(r.baselineScores);
    const aAvg = avg(r.augmentedScores);
    const delta = aAvg - bAvg;
    totalBaselineAvg += bAvg;
    totalAugmentedAvg += aAvg;
    console.log(
      `  ${r.taskId}: baseline=${bAvg.toFixed(1)} augmented=${aAvg.toFixed(1)} delta=${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
    );
  }

  const avgBaseline = totalBaselineAvg / results.length;
  const avgAugmented = totalAugmentedAvg / results.length;
  const avgDelta = avgAugmented - avgBaseline;

  console.log();
  console.log(
    `  Overall: baseline=${avgBaseline.toFixed(1)} augmented=${avgAugmented.toFixed(1)} delta=${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)}`
  );
  console.log();
  console.log(
    avgDelta > 0
      ? "Memory fragments improved performance."
      : avgDelta === 0
        ? "No measurable difference."
        : "Baseline outperformed augmented — check fragment quality."
  );

  // --- Submit reputation feedback on-chain if --feedback flag is set ---
  const submitOnChain = process.argv.includes("--feedback");
  if (submitOnChain && config.contributorAgentId && config.borrowerAgentId) {
    console.log("\n=== SUBMITTING ON-CHAIN FEEDBACK ===");

    // Score: map delta to 1-10 scale (0 delta = 5, +3 delta = 8, -3 delta = 2, clamped)
    const rawScore = Math.round(5 + avgDelta);
    const clampedScore = Math.max(1, Math.min(10, rawScore));

    // Build feedback evidence from results
    const evidence = JSON.stringify({
      tasksEvaluated: results.length,
      avgBaselineScore: avgBaseline,
      avgAugmentedScore: avgAugmented,
      avgDelta,
      perTask: results.map((r) => ({
        id: r.taskId,
        baselineAvg: avg(r.baselineScores),
        augmentedAvg: avg(r.augmentedScores),
      })),
    });
    const evidenceHash = keccak256(toHex(evidence)) as `0x${string}`;

    // Save evidence file
    const evidencePath = join(RESULTS_DIR, "feedback-evidence.json");
    writeFileSync(evidencePath, evidence);

    // Determine domain from first task
    const domain = results[0]?.taskId.split("-")[0] || "unknown";

    console.log(`  Score: ${clampedScore}/10 (delta: ${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)})`);
    console.log(`  Contributor agent: ${config.contributorAgentId}`);
    console.log(`  Domain: ${domain}`);

    try {
      const wallet = getBorrowerWallet();
      const publicClient = getPublicClient();

      const hash = await giveFeedback(
        wallet,
        config.contributorAgentId,
        clampedScore,
        "memory-lend",
        domain,
        "", // feedbackURI — could point to hosted evidence
        evidenceHash
      );

      console.log(`  Tx: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log("  Reputation feedback submitted.");
    } catch (err) {
      console.error("  Failed to submit on-chain feedback:", err);
    }
  } else if (submitOnChain) {
    console.log("\nSkipping on-chain feedback — agent IDs not configured.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
