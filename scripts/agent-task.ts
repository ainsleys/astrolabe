import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { keccak256, toHex } from "viem";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config, MEMORY_LENDING_ABI, OPERATOR_REGISTRY_ABI } from "./lib/config.js";
import { getPublicClient, getBorrowerWallet } from "./lib/wallet.js";
import { giveFeedback } from "./lib/erc8004.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(__dirname, "..", "agent-runs");
const BORROWS_DIR = join(__dirname, "..", "borrows");

// ── Types ────────────────────────────────────────────────

interface FragmentInfo {
  fragmentId: bigint;
  operatorId: bigint;
  domain: string;
  priceCredits: bigint;
  contentHash: string;
  contentURI: string;
  active: boolean;
}

interface Scores { accuracy: number; specificity: number; actionability: number; }

interface LogStep {
  step: string;
  timestamp: string;
  [key: string]: unknown;
}

type Provider = "anthropic" | "venice";

// ── Provider abstraction (from evaluate.ts) ──────────────

function getProvider(): Provider {
  if (process.argv.includes("--venice")) return "venice";
  const flag = process.argv.find(a => a.startsWith("--provider="));
  if (flag) return flag.split("=")[1] as Provider;
  return "anthropic";
}

function modelFor(p: Provider): string {
  return p === "venice" ? "llama-3.3-70b" : "claude-sonnet-4-20250514";
}

async function llm(
  provider: Provider, ac: Anthropic | null, vc: OpenAI | null,
  system: string | undefined, user: string, maxTok: number
): Promise<string> {
  if (provider === "venice" && vc) {
    const msgs: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) msgs.push({ role: "system", content: system });
    msgs.push({ role: "user", content: user });
    const r = await vc.chat.completions.create({ model: modelFor(provider), max_tokens: maxTok, messages: msgs });
    return r.choices[0]?.message?.content || "";
  }
  if (ac) {
    const p: Anthropic.MessageCreateParams = { model: modelFor(provider), max_tokens: maxTok, messages: [{ role: "user", content: user }] };
    if (system) p.system = system;
    const r = await ac.messages.create(p);
    return r.content.find(b => b.type === "text")?.text || "";
  }
  throw new Error("No LLM client");
}

function avg(s: Scores): number { return (s.accuracy + s.specificity + s.actionability) / 3; }

// ── Args ─────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const prompt = args[0];
  const domainFlag = process.argv.find(a => a.startsWith("--domain="));
  const domain = domainFlag ? domainFlag.split("=")[1] : process.argv[process.argv.indexOf("--domain") + 1];
  const dryRun = process.argv.includes("--dry-run");

  if (!prompt || !domain) {
    console.error("Usage: agent-task <prompt> --domain <domain> [--venice] [--dry-run]");
    process.exit(1);
  }
  return { prompt, domain, dryRun };
}

// ── Discovery ────────────────────────────────────────────

async function discoverFragments(domain: string): Promise<FragmentInfo[]> {
  const pc = getPublicClient();
  const nextId = await pc.readContract({ address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "nextFragmentId" });
  const results: FragmentInfo[] = [];
  for (let i = 0n; i < nextId; i++) {
    const f = await pc.readContract({ address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "getFragment", args: [i] });
    if (f.active && f.domain === domain) {
      results.push({ fragmentId: i, operatorId: f.operatorId, domain: f.domain, priceCredits: f.priceCredits, contentHash: f.contentHash, contentURI: f.contentURI, active: f.active });
    }
  }
  return results;
}

// ── Budget ───────────────────────────────────────────────

async function checkBudget() {
  const pc = getPublicClient();
  const balance = await pc.readContract({ address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "getBalance", args: [config.borrowerOperatorId] }) as bigint;
  const creditLine = await pc.readContract({ address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "getCreditLine", args: [config.borrowerOperatorId] }) as bigint;
  return { balance, creditLine, available: creditLine + balance };
}

// ── Selection ────────────────────────────────────────────

async function selectFragments(candidates: FragmentInfo[], available: bigint): Promise<{ selected: FragmentInfo[]; reasoning: object[] }> {
  const pc = getPublicClient();
  const reasoning: object[] = [];
  const eligible: FragmentInfo[] = [];

  for (const f of candidates) {
    const borrowed = await pc.readContract({ address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "hasBorrowed", args: [config.borrowerOperatorId, f.fragmentId] });
    if (borrowed) {
      reasoning.push({ fragmentId: f.fragmentId.toString(), action: "skip", reason: "already borrowed" });
    } else {
      eligible.push(f);
    }
  }

  // Sort by price ascending — maximize fragments per credit
  eligible.sort((a, b) => Number(a.priceCredits - b.priceCredits));

  const selected: FragmentInfo[] = [];
  let cost = 0n;
  for (const f of eligible) {
    if (selected.length >= 3) { reasoning.push({ fragmentId: f.fragmentId.toString(), action: "skip", reason: "max fragments reached" }); continue; }
    if (cost + f.priceCredits > available) { reasoning.push({ fragmentId: f.fragmentId.toString(), action: "skip", reason: "exceeds budget" }); continue; }
    selected.push(f);
    cost += f.priceCredits;
    reasoning.push({ fragmentId: f.fragmentId.toString(), action: "select", price: f.priceCredits.toString(), reason: "within budget, cheapest available" });
  }

  return { selected, reasoning };
}

// ── Borrow ───────────────────────────────────────────────

async function borrowAndFetch(f: FragmentInfo, dryRun: boolean): Promise<{ content: string; txHash: string; agentIds: string[] } | null> {
  // Fetch content
  let content: string;
  try {
    const resp = await fetch(f.contentURI);
    if (!resp.ok) { console.log(`  Fragment ${f.fragmentId}: fetch failed (${resp.status})`); return null; }
    content = await resp.text();
  } catch { console.log(`  Fragment ${f.fragmentId}: fetch error (server running?)`); return null; }

  // Verify hash
  const hash = keccak256(toHex(content));
  if (hash !== f.contentHash) { console.log(`  Fragment ${f.fragmentId}: hash mismatch`); return null; }

  // Look up contributor agent IDs
  const pc = getPublicClient();
  let agentIds: string[] = [];
  try {
    const agents = await pc.readContract({ address: config.operatorRegistryAddress, abi: OPERATOR_REGISTRY_ABI, functionName: "getOperatorAgents", args: [f.operatorId] });
    agentIds = (agents as bigint[]).map(a => a.toString());
  } catch { /* no agents linked */ }

  if (dryRun) return { content, txHash: "dry-run", agentIds };

  // Borrow on-chain
  const wallet = getBorrowerWallet();
  try {
    const tx = await wallet.writeContract({
      address: config.memoryLendingAddress, abi: MEMORY_LENDING_ABI, functionName: "borrowFragment",
      args: [f.fragmentId, config.borrowerOperatorId], account: wallet.account!, chain: wallet.chain,
    });
    const receipt = await pc.waitForTransactionReceipt({ hash: tx });

    // Save receipt
    mkdirSync(BORROWS_DIR, { recursive: true });
    writeFileSync(join(BORROWS_DIR, `fragment-${f.fragmentId}.json`), JSON.stringify({
      fragmentId: f.fragmentId.toString(), domain: f.domain, contentHash: f.contentHash,
      contentURI: f.contentURI, contractAddress: config.memoryLendingAddress,
      contributorOperatorId: f.operatorId.toString(), contributorAgentIds: agentIds,
      borrowerOperatorId: config.borrowerOperatorId.toString(),
      priceCredits: f.priceCredits.toString(), borrowTxHash: tx,
      blockNumber: receipt.blockNumber.toString(), content,
    }, null, 2));

    return { content, txHash: tx, agentIds };
  } catch (err) {
    console.log(`  Fragment ${f.fragmentId}: borrow tx failed — ${err}`);
    return null;
  }
}

// ── Judge ────────────────────────────────────────────────

async function judge(
  provider: Provider, ac: Anthropic | null, vc: OpenAI | null,
  prompt: string, baseline: string, augmented: string
): Promise<{ baseScores: Scores; augScores: Scores; delta: number; explanation: string }> {
  const augIsResp1 = Math.random() < 0.5;
  const [r1, r2] = augIsResp1 ? [augmented, baseline] : [baseline, augmented];

  const judgePrompt = `You are evaluating two responses to the same task. You do not know which had domain expertise.

Task: ${prompt}

Response 1:
${r1}

Response 2:
${r2}

Score each on accuracy, specificity, actionability (1-10).
Respond with ONLY valid JSON:
{"response_1":{"accuracy":N,"specificity":N,"actionability":N},"response_2":{"accuracy":N,"specificity":N,"actionability":N},"better":"1" or "2","explanation":"one sentence"}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await llm(provider, ac, vc, undefined, judgePrompt, 1024);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const j = JSON.parse(match[0]);
        if (j.response_1 && j.response_2) {
          const augScores = augIsResp1 ? j.response_1 : j.response_2;
          const baseScores = augIsResp1 ? j.response_2 : j.response_1;
          return { baseScores, augScores, delta: avg(augScores) - avg(baseScores), explanation: j.explanation || "" };
        }
      } catch { /* retry */ }
    }
  }
  // Fallback: neutral
  const neutral = { accuracy: 5, specificity: 5, actionability: 5 };
  return { baseScores: neutral, augScores: neutral, delta: 0, explanation: "judge failed to produce valid scores" };
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const { prompt, domain, dryRun } = parseArgs();
  const provider = getProvider();
  const steps: LogStep[] = [];
  const ts = () => new Date().toISOString();
  const startedAt = ts();

  console.log(`\n  ASTROLABE — autonomous agent task`);
  console.log(`  Provider: ${provider} (${modelFor(provider)})`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Dry run: ${dryRun}\n`);

  // Init LLM clients
  let ac: Anthropic | null = null;
  let vc: OpenAI | null = null;
  if (provider === "venice") {
    vc = new OpenAI({ apiKey: process.env.VENICE_API_KEY!, baseURL: "https://api.venice.ai/api/v1" });
  } else {
    ac = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  // Step 1: Discover
  console.log("  [1] Discovering fragments...");
  const fragments = await discoverFragments(domain);
  steps.push({ step: "discover", timestamp: ts(), fragmentsFound: fragments.length, domain });
  console.log(`      ${fragments.length} active fragment(s) in "${domain}"`);

  // Step 2: Budget
  console.log("  [2] Checking credit budget...");
  const budget = await checkBudget();
  steps.push({ step: "check-budget", timestamp: ts(), balance: budget.balance.toString(), creditLine: budget.creditLine.toString(), available: budget.available.toString() });
  console.log(`      Balance: ${budget.balance}, Credit line: ${budget.creditLine}, Available: ${budget.available}`);

  // Step 3: Select
  console.log("  [3] Selecting fragments...");
  const { selected, reasoning } = fragments.length > 0 && budget.available > 0n
    ? await selectFragments(fragments, budget.available)
    : { selected: [], reasoning: [{ action: "skip-all", reason: fragments.length === 0 ? "no fragments" : "no credit" }] };
  steps.push({ step: "select", timestamp: ts(), selected: selected.map(f => f.fragmentId.toString()), reasoning });
  console.log(`      Selected ${selected.length} fragment(s)`);

  // Step 4: Borrow
  console.log("  [4] Borrowing and verifying...");
  const borrowed: { content: string; txHash: string; agentIds: string[]; fragmentId: string }[] = [];
  const borrowLogs: object[] = [];
  for (const f of selected) {
    const result = await borrowAndFetch(f, dryRun);
    if (result) {
      borrowed.push({ ...result, fragmentId: f.fragmentId.toString() });
      borrowLogs.push({ fragmentId: f.fragmentId.toString(), hashVerified: true, txHash: result.txHash });
      console.log(`      #${f.fragmentId}: borrowed (${result.content.length} bytes)`);
    } else {
      borrowLogs.push({ fragmentId: f.fragmentId.toString(), hashVerified: false, txHash: null, skipped: true });
    }
  }
  steps.push({ step: "borrow", timestamp: ts(), borrows: borrowLogs });

  // Step 5: Generate
  console.log("  [5] Generating responses...");
  const baseline = await llm(provider, ac, vc, undefined, prompt, 2048);
  console.log(`      Baseline: ${baseline.length} chars`);

  let augmented: string | null = null;
  let fragmentContent: string | null = null;
  if (borrowed.length > 0) {
    fragmentContent = borrowed.map(b => b.content).join("\n\n---\n\n");
    const sys = `You have access to the following domain expertise. Use it to inform your response.\n\n---\n${fragmentContent}\n---`;
    augmented = await llm(provider, ac, vc, sys, prompt, 2048);
    console.log(`      Augmented: ${augmented.length} chars (${borrowed.length} fragment(s) as context)`);
  } else {
    console.log("      No fragments borrowed — baseline only");
  }
  steps.push({ step: "generate", timestamp: ts(), baselineLength: baseline.length, augmentedLength: augmented?.length || 0, fragmentsUsed: borrowed.length });

  // Step 6: Judge
  let delta = 0;
  let explanation = "no augmented response to judge";
  let baseScores: Scores = { accuracy: 0, specificity: 0, actionability: 0 };
  let augScores: Scores = { accuracy: 0, specificity: 0, actionability: 0 };

  if (augmented) {
    console.log("  [6] Judging (blind comparison)...");
    const result = await judge(provider, ac, vc, prompt, baseline, augmented);
    delta = result.delta;
    explanation = result.explanation;
    baseScores = result.baseScores;
    augScores = result.augScores;
    console.log(`      Baseline:  ${avg(baseScores).toFixed(1)}  Augmented: ${avg(augScores).toFixed(1)}  Delta: ${delta > 0 ? "+" : ""}${delta.toFixed(1)}`);
    console.log(`      Judge: ${explanation}`);
  }
  steps.push({ step: "judge", timestamp: ts(), baselineAvg: avg(baseScores), augmentedAvg: avg(augScores), delta, explanation });

  // Step 7: Feedback
  if (borrowed.length > 0 && !dryRun) {
    console.log("  [7] Submitting reputation feedback...");
    const score = Math.max(1, Math.min(10, Math.round(5 + delta)));
    const evidenceHash = keccak256(toHex(JSON.stringify({ prompt, delta, baseScores, augScores }))) as `0x${string}`;
    const wallet = getBorrowerWallet();
    const feedbackLogs: object[] = [];

    // Collect unique contributor agent IDs
    const agentIdSet = new Set<string>();
    for (const b of borrowed) b.agentIds.forEach(id => agentIdSet.add(id));

    for (const agentIdStr of agentIdSet) {
      try {
        const tx = await giveFeedback(wallet, BigInt(agentIdStr), score, "memory-lend", domain, "", evidenceHash);
        const pc = getPublicClient();
        const receipt = await pc.waitForTransactionReceipt({ hash: tx });
        feedbackLogs.push({ agentId: agentIdStr, score, txHash: tx, block: receipt.blockNumber.toString() });
        console.log(`      Agent #${agentIdStr}: score ${score}/10 (tx: ${tx.slice(0, 10)}...)`);
      } catch (err) {
        feedbackLogs.push({ agentId: agentIdStr, score, error: String(err) });
      }
    }
    steps.push({ step: "feedback", timestamp: ts(), score, submissions: feedbackLogs });
  } else {
    steps.push({ step: "feedback", timestamp: ts(), skipped: true, reason: borrowed.length === 0 ? "no fragments borrowed" : "dry run" });
  }

  // Step 8: Output
  const useAugmented = augmented && delta > 0;
  const response = useAugmented ? augmented : baseline;
  steps.push({ step: "output", timestamp: ts(), selectedResponse: useAugmented ? "augmented" : "baseline", reason: useAugmented ? `delta +${delta.toFixed(1)}` : augmented ? `delta ${delta.toFixed(1)} — baseline was better` : "no augmented response" });

  console.log(`\n  ── Result ──────────────────────────────────────\n`);
  console.log(response);

  // Write agent log
  mkdirSync(RUNS_DIR, { recursive: true });
  const logFile = join(RUNS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${domain}.json`);
  const agentLog = {
    version: "1.0",
    name: "Astrolabe autonomous agent",
    taskPrompt: prompt,
    domain,
    provider,
    model: modelFor(provider),
    chain: "base",
    chainId: 8453,
    startedAt,
    completedAt: ts(),
    contracts: { memoryLending: config.memoryLendingAddress, operatorRegistry: config.operatorRegistryAddress },
    borrowerOperatorId: config.borrowerOperatorId.toString(),
    dryRun,
    steps,
    result: {
      responseUsed: useAugmented ? "augmented" : "baseline",
      delta,
      fragmentsBorrowed: borrowed.length,
      feedbackSubmitted: borrowed.length > 0 && !dryRun,
    },
  };
  writeFileSync(logFile, JSON.stringify(agentLog, null, 2));
  console.log(`\n  Agent log: ${logFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
