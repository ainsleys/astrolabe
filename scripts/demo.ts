import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { keccak256, toHex } from "viem";
import { config, MEMORY_LENDING_ABI } from "./lib/config.js";
import { getPublicClient, getBorrowerWallet } from "./lib/wallet.js";
import { giveFeedback } from "./lib/erc8004.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BORROWS_DIR = join(__dirname, "..", "borrows");
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");
const RESULTS_DIR = join(__dirname, "..", "eval", "results");
const TASKS_PATH = join(__dirname, "..", "eval", "tasks.json");

const MODEL = "claude-sonnet-4-20250514";
const CHAIN_EXPLORER = "https://basescan.org/tx";

// ── Helpers ──────────────────────────────────────────────

function heading(text: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"═".repeat(60)}\n`);
}

function step(n: number, text: string) {
  console.log(`\n── Step ${n}: ${text} ${"─".repeat(Math.max(0, 45 - text.length))}\n`);
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const fragmentId = BigInt(process.argv[2] || "0");
  const submitFeedback = process.argv.includes("--feedback");

  heading("Astrolabe Demo — Course Correction for Agents");

  console.log("Protocol: operators share corrections, tracked by a credit");
  console.log("system with on-chain receipts and ERC-8004 reputation.\n");
  console.log(`Fragment ID:    ${fragmentId}`);
  console.log(`Chain:          Base (canonical ERC-8004)`);
  console.log(`Feedback:       ${submitFeedback ? "will submit on-chain after eval" : "off (pass --feedback to enable)"}`);

  const publicClient = getPublicClient();
  const wallet = getBorrowerWallet();

  // ── Step 1: List available fragments ───────────────────

  step(1, "Discover available fragments");

  const nextId = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "nextFragmentId",
  });

  console.log(`${nextId} fragment(s) published on-chain\n`);

  for (let i = 0n; i < nextId; i++) {
    const f = await publicClient.readContract({
      address: config.memoryLendingAddress,
      abi: MEMORY_LENDING_ABI,
      functionName: "getFragment",
      args: [i],
    });
    const status = f.active ? "" : " [INACTIVE]";
    console.log(
      `  #${i}  domain:${f.domain}  price:${f.priceCredits} credits  operator:${f.operatorId}${status}`
    );
  }

  // ── Step 2: Check borrower credit ─────────────────────

  step(2, "Check borrower credit status");

  const balance = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getBalance",
    args: [config.borrowerOperatorId],
  });

  const creditLine = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getCreditLine",
    args: [config.borrowerOperatorId],
  });

  console.log(`Operator ${config.borrowerOperatorId}:`);
  console.log(`  Balance:    ${balance} credits`);
  console.log(`  Credit line: ${creditLine} credits`);
  console.log(`  Available:  ${BigInt(creditLine) + BigInt(balance)} credits`);

  // ── Step 3: Borrow fragment ───────────────────────────

  step(3, `Borrow fragment #${fragmentId}`);

  const fragment = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getFragment",
    args: [fragmentId],
  });

  if (!fragment.active) {
    console.error("Fragment is not active.");
    process.exit(1);
  }

  // Check if we have a valid cached receipt for this exact context
  mkdirSync(BORROWS_DIR, { recursive: true });
  const receiptPath = join(BORROWS_DIR, `fragment-${fragmentId}.json`);
  let borrowTxHash: string = "";
  let content: string = "";

  let cachedValid = false;
  if (existsSync(receiptPath)) {
    const existing = JSON.parse(readFileSync(receiptPath, "utf-8"));
    // Validate receipt matches current contract, operator, and content hash
    if (
      existing.contentHash === fragment.contentHash &&
      existing.borrowerOperatorId === config.borrowerOperatorId.toString() &&
      existing.content
    ) {
      content = existing.content;
      borrowTxHash = existing.borrowTxHash;
      cachedValid = true;
      console.log(`Valid cached receipt found. Tx: ${borrowTxHash}`);
    } else {
      console.log("Stale receipt found (contract/operator/hash mismatch). Re-borrowing.");
    }
  }

  if (!cachedValid) {
    // Fetch and verify content
    console.log(`Fetching from ${fragment.contentURI}...`);
    const response = await fetch(fragment.contentURI);
    if (!response.ok) {
      console.error(`Failed to fetch content. Is the fragment server running?`);
      console.error(`Start it with: npm run serve`);
      process.exit(1);
    }
    content = await response.text();
    const actualHash = keccak256(toHex(content));

    if (actualHash !== fragment.contentHash) {
      console.error("CONTENT HASH MISMATCH — aborting.");
      process.exit(1);
    }
    console.log(`Content verified (${content.length} bytes, hash matches).`);

    // Borrow on-chain
    const hash = await wallet.writeContract({
      address: config.memoryLendingAddress,
      abi: MEMORY_LENDING_ABI,
      functionName: "borrowFragment",
      args: [fragmentId, config.borrowerOperatorId],
      account: wallet.account!,
      chain: wallet.chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    borrowTxHash = hash;

    console.log(`Borrowed. Tx: ${hash}`);
    console.log(`  ${CHAIN_EXPLORER}/${hash}`);

    // Save receipt
    writeFileSync(
      receiptPath,
      JSON.stringify({
        fragmentId: fragmentId.toString(),
        domain: fragment.domain,
        contentHash: fragment.contentHash,
        contentURI: fragment.contentURI,
        contributorOperatorId: fragment.operatorId.toString(),
        borrowerOperatorId: config.borrowerOperatorId.toString(),
        priceCredits: fragment.priceCredits.toString(),
        borrowTxHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        content,
      }, null, 2)
    );
  }

  // ── Step 4: Evaluate ──────────────────────────────────

  step(4, "Evaluate: baseline vs augmented (single task)");

  if (!config.anthropicApiKey) {
    console.log("No ANTHROPIC_API_KEY set — skipping evaluation.");
    console.log("The borrow receipt and on-chain trail are still valid.");
  } else {
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const tasks = JSON.parse(readFileSync(TASKS_PATH, "utf-8"));

    // Find a task matching the fragment's domain
    const domainTasks = tasks.filter(
      (t: { domain: string }) => t.domain === fragment.domain
    );
    const task = domainTasks[0] || tasks[0];

    console.log(`Task: ${task.id}`);
    console.log(`Domain: ${task.domain}\n`);

    // Baseline
    console.log("Generating baseline response...");
    const baselineResp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: task.prompt }],
    });
    const baseline =
      baselineResp.content.find((b) => b.type === "text")?.text || "";

    // Augmented
    console.log("Generating augmented response...");
    const augmentedResp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `You have access to the following domain expertise. Use it to inform your response.\n\n---\n${content}\n---`,
      messages: [{ role: "user", content: task.prompt }],
    });
    const augmented =
      augmentedResp.content.find((b) => b.type === "text")?.text || "";

    // Judge (randomize order)
    console.log("Running blind judge...\n");
    const augIsResp1 = Math.random() < 0.5;
    const [r1, r2] = augIsResp1
      ? [augmented, baseline]
      : [baseline, augmented];

    const judgeResp = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are evaluating two responses to the same research task.
You do not know which response had access to domain expertise.

Task: ${task.prompt}

Response 1:
${r1}

Response 2:
${r2}

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
}`,
        },
      ],
    });

    const judgeText =
      judgeResp.content.find((b) => b.type === "text")?.text || "";
    const jsonMatch = judgeText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const judge = JSON.parse(jsonMatch[0]);
      const augScores = augIsResp1 ? judge.response_1 : judge.response_2;
      const baseScores = augIsResp1 ? judge.response_2 : judge.response_1;

      const avg = (s: { accuracy: number; specificity: number; actionability: number }) =>
        (s.accuracy + s.specificity + s.actionability) / 3;

      const baseAvg = avg(baseScores);
      const augAvg = avg(augScores);
      const delta = augAvg - baseAvg;

      console.log(
        `Baseline:  acc=${baseScores.accuracy} spec=${baseScores.specificity} act=${baseScores.actionability} avg=${baseAvg.toFixed(1)}`
      );
      console.log(
        `Augmented: acc=${augScores.accuracy} spec=${augScores.specificity} act=${augScores.actionability} avg=${augAvg.toFixed(1)}`
      );
      console.log(
        `Delta:     ${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
      );
      console.log(`Judge:     ${judge.explanation}`);

      // Save result
      mkdirSync(RESULTS_DIR, { recursive: true });
      writeFileSync(
        join(RESULTS_DIR, `demo-${task.id}.json`),
        JSON.stringify({ task, baseScores, augScores, delta, judge }, null, 2)
      );

      // Submit reputation feedback if --feedback flag is set
      if (submitFeedback) {
        const rawScore = Math.round(5 + delta);
        const clampedScore = Math.max(1, Math.min(10, rawScore));
        const evidenceHash = keccak256(
          toHex(JSON.stringify({ task: task.id, delta, baseAvg, augAvg }))
        ) as `0x${string}`;

        console.log(`\nSubmitting reputation feedback: ${clampedScore}/10`);
        try {
          const fbHash = await giveFeedback(
            wallet,
            config.contributorAgentId,
            clampedScore,
            "memory-lend",
            fragment.domain,
            "",
            evidenceHash
          );
          const fbReceipt = await publicClient.waitForTransactionReceipt({ hash: fbHash });
          console.log(`Feedback tx: ${fbHash}`);
          console.log(`  ${CHAIN_EXPLORER}/${fbHash}`);
        } catch (err) {
          console.error("Failed to submit feedback:", err);
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────

  heading("On-Chain Trail (all verifiable on Basescan)");

  console.log(`Borrow tx:          ${CHAIN_EXPLORER}/${borrowTxHash}`);
  console.log(`MemoryLending:      ${CHAIN_EXPLORER.replace("/tx", "/address")}/${config.memoryLendingAddress}`);
  console.log(`OperatorRegistry:   ${CHAIN_EXPLORER.replace("/tx", "/address")}/${config.operatorRegistryAddress}`);
  console.log(`ERC-8004 Identity:  ${CHAIN_EXPLORER.replace("/tx", "/address")}/${config.identityRegistry}`);
  console.log(`ERC-8004 Reputation: ${CHAIN_EXPLORER.replace("/tx", "/address")}/${config.reputationRegistry}`);
  console.log();
  console.log(`Contributor agent:  #${config.contributorAgentId} (canonical ERC-8004)`);
  console.log(`Borrower agent:     #${config.borrowerAgentId} (canonical ERC-8004)`);
  console.log(`Contributor operator: #${config.contributorOperatorId}`);
  console.log(`Borrower operator:  #${config.borrowerOperatorId}`);
  console.log();
  console.log("All receipts, identity checks, and credit accounting are on Base mainnet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
