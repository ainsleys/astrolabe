import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASKS_PATH = join(__dirname, "..", "eval", "tasks.json");
const RESULTS_DIR = join(__dirname, "..", "eval", "results");
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");
const BORROWS_DIR = join(__dirname, "..", "borrows");

const MODEL = "claude-sonnet-4-20250514";
const RUNS = parseInt(process.argv[2] || "5");

interface Task { id: string; prompt: string; domain: string; }
interface Scores { accuracy: number; specificity: number; actionability: number; }

function avg(s: Scores): number {
  return (s.accuracy + s.specificity + s.actionability) / 3;
}

function loadFragment(domain: string): string | null {
  // Check borrow receipts first
  if (existsSync(BORROWS_DIR)) {
    const receipts = readdirSync(BORROWS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => JSON.parse(readFileSync(join(BORROWS_DIR, f), "utf-8")))
      .filter(r => r.domain === domain);
    if (receipts.length > 0) {
      return receipts.map((r: { content: string }) => r.content).join("\n\n---\n\n");
    }
  }
  // Fall back to local
  const files = readdirSync(FRAGMENTS_DIR).filter(f => {
    if (!f.endsWith(".md") || f === ".gitkeep") return false;
    const content = readFileSync(join(FRAGMENTS_DIR, f), "utf-8");
    const match = content.match(/^domain:\s*(.+)$/m);
    return (match && match[1].trim() === domain) || f.includes(domain);
  });
  if (files.length === 0) return null;
  return files.map(f => readFileSync(join(FRAGMENTS_DIR, f), "utf-8")).join("\n\n---\n\n");
}

async function runJudge(
  client: Anthropic,
  taskPrompt: string,
  baseline: string,
  augmented: string
): Promise<{ baseScores: Scores; augScores: Scores; delta: number } | null> {
  const augIsResp1 = Math.random() < 0.5;
  const [r1, r2] = augIsResp1 ? [augmented, baseline] : [baseline, augmented];

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are evaluating two responses to the same research task.
You do not know which response had access to domain expertise.

Task: ${taskPrompt}

Response 1:
${r1}

Response 2:
${r2}

Score each response on three dimensions (1-10):
1. Accuracy: Are claims factually correct and well-grounded?
2. Specificity: Does it include concrete details rather than generalities?
3. Actionability: Could someone act on this without significant additional research?

Respond with ONLY valid JSON, no other text before or after:
{"response_1":{"accuracy":N,"specificity":N,"actionability":N},"response_2":{"accuracy":N,"specificity":N,"actionability":N},"better":"1" or "2","explanation":"one sentence"}`
    }],
  });

  const text = resp.content.find(b => b.type === "text")?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const j = JSON.parse(match[0]);
    if (!j.response_1 || !j.response_2) return null;
    const augScores = augIsResp1 ? j.response_1 : j.response_2;
    const baseScores = augIsResp1 ? j.response_2 : j.response_1;
    return { baseScores, augScores, delta: avg(augScores) - avg(baseScores) };
  } catch {
    return null;
  }
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1));
}

// t-values for 95% CI (two-tailed) by degrees of freedom
const T_VALUES: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  20: 2.086, 25: 2.060, 30: 2.042, 40: 2.021, 60: 2.000,
  120: 1.980,
};

function tValue(df: number): number {
  if (T_VALUES[df]) return T_VALUES[df];
  // Find closest df in table
  const keys = Object.keys(T_VALUES).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df >= keys[i] && df < keys[i + 1]) return T_VALUES[keys[i + 1]];
  }
  return 1.96; // large-sample approximation
}

function ci95(arr: number[]): [number, number] {
  const m = mean(arr);
  const df = arr.length - 1;
  const se = stddev(arr) / Math.sqrt(arr.length);
  const t = tValue(df);
  return [m - t * se, m + t * se];
}

async function main() {
  if (!config.anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const tasks: Task[] = JSON.parse(readFileSync(TASKS_PATH, "utf-8"));

  console.log(`Running ${RUNS} trials per task across ${tasks.length} tasks`);
  console.log(`Estimated API calls: ${RUNS * tasks.length * 3}`);
  console.log(`Estimated cost: ~$${(RUNS * tasks.length * 3 * 0.015).toFixed(2)}\n`);

  const allResults: Record<string, { deltas: number[]; runs: { baseScores: Scores; augScores: Scores; delta: number }[] }> = {};

  for (const task of tasks) {
    const fragment = loadFragment(task.domain);
    if (!fragment) {
      console.log(`SKIP ${task.id} — no fragment for domain "${task.domain}"`);
      continue;
    }

    console.log(`=== ${task.id} (${task.domain}) ===`);
    allResults[task.id] = { deltas: [], runs: [] };

    for (let run = 0; run < RUNS; run++) {
      process.stdout.write(`  Run ${run + 1}/${RUNS}... `);

      // Generate baseline
      const baseResp = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: task.prompt }],
      });
      const baseline = baseResp.content.find(b => b.type === "text")?.text || "";

      // Generate augmented
      const augResp = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: `You have access to the following domain expertise. Use it to inform your response.\n\n---\n${fragment}\n---`,
        messages: [{ role: "user", content: task.prompt }],
      });
      const augmented = augResp.content.find(b => b.type === "text")?.text || "";

      // Judge
      const result = await runJudge(client, task.prompt, baseline, augmented);
      if (result) {
        allResults[task.id].deltas.push(result.delta);
        allResults[task.id].runs.push(result);
        console.log(`delta=${result.delta > 0 ? "+" : ""}${result.delta.toFixed(1)}`);
      } else {
        console.log("judge parse failed, skipping");
      }
    }

    const deltas = allResults[task.id].deltas;
    if (deltas.length >= 2) {
      const [lo, hi] = ci95(deltas);
      const significant = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
      console.log(
        `  Mean: ${mean(deltas) > 0 ? "+" : ""}${mean(deltas).toFixed(2)} ` +
        `SD: ±${stddev(deltas).toFixed(2)} ` +
        `95% CI: [${lo > 0 ? "+" : ""}${lo.toFixed(2)}, ${hi > 0 ? "+" : ""}${hi.toFixed(2)}] ` +
        `${significant ? "SIGNIFICANT" : "not significant"}`
      );
    }
    console.log();
  }

  // Summary table
  console.log("═".repeat(90));
  console.log("REPEATED EVALUATION SUMMARY");
  console.log("═".repeat(90));
  console.log(
    "Task".padEnd(35) +
    "Runs".padStart(5) +
    "Mean".padStart(8) +
    "SD".padStart(8) +
    "95% CI".padStart(20) +
    "Sig?".padStart(12)
  );
  console.log("─".repeat(90));

  const domainDeltas: Record<string, number[]> = {};

  for (const task of tasks) {
    const r = allResults[task.id];
    if (!r || r.deltas.length < 2) {
      console.log(`${task.id.padEnd(35)}  skipped`);
      continue;
    }

    if (!domainDeltas[task.domain]) domainDeltas[task.domain] = [];
    domainDeltas[task.domain].push(...r.deltas);

    const [lo, hi] = ci95(r.deltas);
    const significant = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
    console.log(
      `${task.id.padEnd(35)}` +
      `${r.deltas.length.toString().padStart(5)}` +
      `${(mean(r.deltas) > 0 ? "+" : "") + mean(r.deltas).toFixed(2)}`.padStart(8) +
      `${"±" + stddev(r.deltas).toFixed(2)}`.padStart(8) +
      `[${lo.toFixed(1)}, ${hi > 0 ? "+" : ""}${hi.toFixed(1)}]`.padStart(20) +
      `${significant ? "YES" : "no"}`.padStart(12)
    );
  }

  console.log("─".repeat(90));

  // Per-domain aggregates
  for (const [domain, deltas] of Object.entries(domainDeltas)) {
    if (deltas.length < 2) continue;
    const [lo, hi] = ci95(deltas);
    const significant = (lo > 0 && hi > 0) || (lo < 0 && hi < 0);
    console.log(
      `${(domain + " (aggregate)").padEnd(35)}` +
      `${deltas.length.toString().padStart(5)}` +
      `${(mean(deltas) > 0 ? "+" : "") + mean(deltas).toFixed(2)}`.padStart(8) +
      `${"±" + stddev(deltas).toFixed(2)}`.padStart(8) +
      `[${lo.toFixed(1)}, ${hi > 0 ? "+" : ""}${hi.toFixed(1)}]`.padStart(20) +
      `${significant ? "YES" : "no"}`.padStart(12)
    );
  }

  console.log("═".repeat(90));

  // Save full results
  mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = join(RESULTS_DIR, "repeated-eval.json");
  writeFileSync(outPath, JSON.stringify({ runs: RUNS, tasks: allResults, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\nFull results saved to ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
