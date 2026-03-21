import {
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { basename, dirname, extname, join, resolve } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = join(__dirname, "..", "fragments", "extracted-codex");

type JsonLike =
  | null
  | boolean
  | number
  | string
  | JsonLike[]
  | { [key: string]: JsonLike };

interface CliOptions {
  inputPath: string;
  domain: string;
  dryRun: boolean;
  outputDir: string;
}

interface NormalizedEvent {
  id: string;
  sourceFile: string;
  index: number;
  role: string;
  kind: string;
  timestamp?: string;
  text: string;
  explicitSteer: boolean;
}

interface CandidateEpisode {
  id: string;
  sourceFile: string;
  signalType: "explicit-steer" | "corrective-message";
  role: string;
  score: number;
  title: string;
  taskClass: string;
  confidence: "HIGH" | "MEDIUM";
  domain: string;
  triggerText: string;
  assistantBefore?: string;
  assistantAfter?: string;
  timestamp?: string;
}

interface ManifestEntry {
  file: string;
  sourceFile: string;
  signalType: CandidateEpisode["signalType"];
  score: number;
  title: string;
  taskClass: string;
  confidence: CandidateEpisode["confidence"];
  timestamp?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  let domain = "developer-tooling";
  let outputDir = DEFAULT_OUTPUT_DIR;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--domain") {
      domain = argv[i + 1] || domain;
      i++;
      continue;
    }

    if (arg === "--out-dir") {
      outputDir = resolve(argv[i + 1] || outputDir);
      i++;
      continue;
    }

    positional.push(arg);
  }

  if (positional.length === 0) {
    console.error(
      "Usage: extract-steering-corrections <thread-export.json|dir> [--domain <domain>] [--out-dir <dir>] [--dry-run]"
    );
    console.error("");
    console.error(
      "  Extracts correction fragments from Codex thread exports, prioritizing explicit"
    );
    console.error(
      "  steer events and falling back to corrective user messages when needed."
    );
    console.error("");
    console.error("  Examples:");
    console.error(
      "    npx tsx scripts/extract-steering-corrections.ts exports/thread.json --domain developer-tooling"
    );
    console.error(
      "    npx tsx scripts/extract-steering-corrections.ts exports/ --domain saas-engineering --dry-run"
    );
    process.exit(1);
  }

  return {
    inputPath: resolve(positional[0]),
    domain,
    dryRun,
    outputDir,
  };
}

function listJsonFiles(inputPath: string): string[] {
  const stats = statSync(inputPath);
  if (stats.isDirectory()) {
    return readdirSync(inputPath)
      .filter((entry) => extname(entry) === ".json")
      .map((entry) => join(inputPath, entry))
      .sort();
  }

  return [inputPath];
}

function collectCandidateArrays(value: JsonLike, arrays: JsonLike[][]): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    const objectCount = value.filter(
      (item) => item && typeof item === "object" && !Array.isArray(item)
    ).length;
    if (objectCount >= 1) arrays.push(value);
    for (const item of value) collectCandidateArrays(item, arrays);
    return;
  }

  const record = value as Record<string, JsonLike>;
  for (const nested of Object.values(record)) {
    collectCandidateArrays(nested, arrays);
  }
}

function asRecord(value: JsonLike): Record<string, JsonLike> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonLike>)
    : {};
}

function extractText(value: JsonLike): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value) return "";

  if (Array.isArray(value)) {
    return value
      .map((item) => extractText(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const record = asRecord(value);
  const prioritizedFields = [
    "text",
    "message",
    "body",
    "prompt",
    "instruction",
    "reason",
    "comment",
    "summary",
    "detail",
    "details",
    "value",
    "content",
  ];

  for (const field of prioritizedFields) {
    const nested = extractText(record[field] ?? null);
    if (nested) return nested;
  }

  return Object.values(record)
    .map((nested) => extractText(nested))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractRole(record: Record<string, JsonLike>): string {
  const direct = record.role;
  if (typeof direct === "string") return direct.toLowerCase();

  const author = asRecord(record.author);
  if (typeof author.role === "string") return author.role.toLowerCase();
  if (typeof author.type === "string") return author.type.toLowerCase();

  const sender = asRecord(record.sender);
  if (typeof sender.role === "string") return sender.role.toLowerCase();

  const actor = asRecord(record.actor);
  if (typeof actor.role === "string") return actor.role.toLowerCase();

  return "unknown";
}

function extractKind(record: Record<string, JsonLike>): string {
  const fields = ["event_type", "type", "kind", "name", "action"];
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.toLowerCase();
  }

  return "message";
}

function hasExplicitSteer(record: Record<string, JsonLike>, kind: string): boolean {
  if (kind.includes("steer")) return true;
  if (kind.includes("redirect")) return true;
  if (kind.includes("trajectory")) return true;

  const metadata = asRecord(record.metadata);
  for (const [key, value] of Object.entries(metadata)) {
    if (key.toLowerCase().includes("steer") && value) return true;
    if (typeof value === "string" && value.toLowerCase().includes("steer")) {
      return true;
    }
  }

  return false;
}

function normalizeEvents(filePath: string, payload: JsonLike): NormalizedEvent[] {
  const candidateArrays: JsonLike[][] = [];
  collectCandidateArrays(payload, candidateArrays);

  const bestArray =
    candidateArrays
      .sort((a, b) => b.length - a.length)
      .find((array) => array.length > 0) ?? [];

  return bestArray
    .map<NormalizedEvent | null>((item, index) => {
      const record = asRecord(item);
      const kind = extractKind(record);
      const text = extractText(record);
      const role = extractRole(record);

      if (!text && kind === "message") return null;

      return {
        id:
          (typeof record.id === "string" && record.id) ||
          `${basename(filePath, ".json")}-${index}`,
        sourceFile: basename(filePath),
        index,
        role,
        kind,
        timestamp:
          typeof record.timestamp === "string"
            ? record.timestamp
            : typeof record.created_at === "string"
              ? record.created_at
              : undefined,
        text,
        explicitSteer: hasExplicitSteer(record, kind),
      };
    })
    .filter((event): event is NormalizedEvent => Boolean(event));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, limit = 220): string {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function isCorrectiveMessage(event: NormalizedEvent): boolean {
  const lower = event.text.toLowerCase();
  const signals = [
    "don't ",
    "do not ",
    "not that",
    "wrong",
    "verify",
    "re-check",
    "needs to work",
    "must",
    "stop",
    "that assumption",
    "fresh clone",
    "current demo",
    "not enough",
  ];

  return signals.filter((signal) => lower.includes(signal)).length >= 1;
}

function findNearest(
  events: NormalizedEvent[],
  startIndex: number,
  direction: -1 | 1,
  role: string
): NormalizedEvent | undefined {
  for (
    let i = startIndex + direction;
    i >= 0 && i < events.length;
    i += direction
  ) {
    if (events[i].role.includes(role) && events[i].text) {
      return events[i];
    }
  }

  return undefined;
}

function classifyTask(text: string): string {
  const lower = text.toLowerCase();

  if (
    lower.includes("fresh clone") ||
    lower.includes("submodule") ||
    lower.includes("setup")
  ) {
    return "environment-verification";
  }
  if (
    lower.includes("deploy") ||
    lower.includes("production") ||
    lower.includes("environment variable")
  ) {
    return "deployment-verification";
  }
  if (
    lower.includes("review") ||
    lower.includes("claim") ||
    lower.includes("current demo")
  ) {
    return "scope-and-claims";
  }
  if (
    lower.includes("test") ||
    lower.includes("assert") ||
    lower.includes("verification")
  ) {
    return "testing-and-verification";
  }
  if (
    lower.includes("architecture") ||
    lower.includes("per-domain") ||
    lower.includes("global")
  ) {
    return "architecture-correction";
  }

  return "operator-steering";
}

function deriveTitle(triggerText: string, taskClass: string): string {
  const lower = triggerText.toLowerCase();

  if (taskClass === "environment-verification") {
    return "Verify setup from a true fresh clone";
  }
  if (taskClass === "deployment-verification") {
    return "Verify deployment state before making claims";
  }
  if (taskClass === "scope-and-claims") {
    return "Match product claims to what the demo actually proves";
  }
  if (taskClass === "testing-and-verification") {
    return "Verify behavior before turning assumptions into conclusions";
  }
  if (taskClass === "architecture-correction") {
    return "Keep architecture decisions scoped to the actual signal";
  }
  if (lower.includes("don't ")) {
    const clause = triggerText.slice(
      lower.indexOf("don't "),
      Math.min(triggerText.length, lower.indexOf("don't ") + 80)
    );
    return normalizeWhitespace(clause).replace(/^./, (c) => c.toUpperCase());
  }

  return "Capture steering corrections as reusable operator feedback";
}

function scoreEpisode(event: NormalizedEvent, before?: string, after?: string): number {
  let score = 0;
  const lower = event.text.toLowerCase();

  if (event.explicitSteer) score += 4;
  if (event.role.includes("user")) score += 1;
  if (isCorrectiveMessage(event)) score += 2;
  if (lower.includes("verify")) score += 1;
  if (lower.includes("wrong") || lower.includes("not true")) score += 1;
  if (lower.includes("must") || lower.includes("needs to")) score += 1;
  if (before) score += 1;
  if (after) score += 2;
  if (normalizeWhitespace(event.text).length < 30) score -= 1;

  return score;
}

function buildEpisode(event: NormalizedEvent, events: NormalizedEvent[], domain: string): CandidateEpisode {
  const assistantBefore = findNearest(events, event.index, -1, "assistant")?.text;
  const assistantAfter = findNearest(events, event.index, 1, "assistant")?.text;
  const triggerText = truncate(event.text, 320);
  const taskClass = classifyTask(triggerText);
  const score = scoreEpisode(event, assistantBefore, assistantAfter);

  return {
    id: event.id,
    sourceFile: event.sourceFile,
    signalType: event.explicitSteer ? "explicit-steer" : "corrective-message",
    role: event.role,
    score,
    title: deriveTitle(triggerText, taskClass),
    taskClass,
    confidence: event.explicitSteer || score >= 6 ? "HIGH" : "MEDIUM",
    domain,
    triggerText,
    assistantBefore: assistantBefore ? truncate(assistantBefore, 280) : undefined,
    assistantAfter: assistantAfter ? truncate(assistantAfter, 280) : undefined,
    timestamp: event.timestamp,
  };
}

function dedupeEpisodes(episodes: CandidateEpisode[]): CandidateEpisode[] {
  const seen = new Set<string>();
  const deduped: CandidateEpisode[] = [];

  for (const episode of episodes.sort((a, b) => b.score - a.score)) {
    const key = `${episode.title}|${episode.triggerText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(episode);
  }

  return deduped.sort((a, b) => b.score - a.score);
}

function episodeToMarkdown(episode: CandidateEpisode): string {
  const whyBits = [
    `The operator steered the run with: "${episode.triggerText}"`,
  ];

  if (episode.signalType === "explicit-steer") {
    whyBits.push(
      "This came from an explicit Codex steer event rather than a passive chat preference."
    );
  }

  if (episode.assistantBefore) {
    whyBits.push(
      `Before the steer, the agent trajectory was: "${episode.assistantBefore}"`
    );
  }

  const whatILearned = episode.assistantAfter
    ? `The correction changed the agent's trajectory. After steering, the agent moved toward: "${episode.assistantAfter}"`
    : "The steering event indicates the original trajectory needed correction, even if the post-steer resolution is not fully captured in the export.";

  const slugSource = `${episode.sourceFile}:${episode.id}:${episode.title}`;
  const provenanceHash = createHash("sha1").update(slugSource).digest("hex").slice(0, 8);

  return `---
domain: ${episode.domain}
task_class: ${episode.taskClass}
format: experience-narrative-b
source: codex steering transcript (sanitized)
type: feedback
signal: ${episode.signalType}
provenance: ${episode.sourceFile}#${episode.id}
---

# ${episode.title}

## When This Applies

When an agent is working in a similar task setting and there is a risk of repeating the same incorrect assumption, verification gap, or scope mistake that prompted the steering event.

## What I Learned

${whatILearned}

## Why

${whyBits.join(" ")}

## How to apply

1. Treat explicit steering as a high-signal correction event, not just a conversational preference.
2. Check whether the same assumption or workflow mistake is appearing again before proceeding.
3. Promote repeated steering into reusable guidance so future runs start from the corrected behavior.

## Confidence Notes

- ${episode.confidence} confidence. Extracted from ${episode.signalType === "explicit-steer" ? "an explicit steer event" : "a corrective Codex message"} in ${episode.sourceFile}.
- Provenance hash: ${provenanceHash}.
`;
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildManifestEntry(fileName: string, episode: CandidateEpisode): ManifestEntry {
  return {
    file: fileName,
    sourceFile: episode.sourceFile,
    signalType: episode.signalType,
    score: episode.score,
    title: episode.title,
    taskClass: episode.taskClass,
    confidence: episode.confidence,
    timestamp: episode.timestamp,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = listJsonFiles(options.inputPath);

  console.log(`Scanning ${files.length} Codex export file(s)\n`);

  const allEpisodes: CandidateEpisode[] = [];

  for (const filePath of files) {
    const payload = JSON.parse(readFileSync(filePath, "utf-8")) as JsonLike;
    const events = normalizeEvents(filePath, payload);

    console.log(`--- ${basename(filePath)} ---`);
    console.log(`  Normalized ${events.length} event(s)`);

    const fileEpisodes = events
      .filter((event) => event.explicitSteer || isCorrectiveMessage(event))
      .map((event) => buildEpisode(event, events, options.domain));

    if (fileEpisodes.length === 0) {
      console.log("  No steering corrections found\n");
      continue;
    }

    for (const episode of fileEpisodes) {
      console.log(
        `  MATCH ${episode.signalType === "explicit-steer" ? "STEER" : "CORRECT"} [${episode.score}] ${episode.title}`
      );
      allEpisodes.push(episode);
    }

    console.log();
  }

  const ranked = dedupeEpisodes(allEpisodes).filter((episode) => episode.score >= 4);

  if (ranked.length === 0) {
    console.log("No publishable steering corrections found.");
    return;
  }

  console.log("Ranked steering corrections:");
  for (const episode of ranked) {
    console.log(
      `  ${episode.score >= 7 ? "★" : " "} [${episode.score}] ${episode.title} (${episode.signalType})`
    );
  }
  console.log();

  if (options.dryRun) {
    console.log("Dry run — no files written.");
    return;
  }

  mkdirSync(options.outputDir, { recursive: true });
  const manifest: ManifestEntry[] = [];

  for (const episode of ranked) {
    const slug = safeSlug(episode.title);
    const suffix = createHash("sha1")
      .update(`${episode.sourceFile}:${episode.id}`)
      .digest("hex")
      .slice(0, 8);
    const fileName = `${slug}-${suffix}.md`;
    const outPath = join(options.outputDir, fileName);

    writeFileSync(outPath, episodeToMarkdown(episode));
    manifest.push(buildManifestEntry(fileName, episode));
    console.log(`  Wrote ${outPath}`);
  }

  const manifestPath = join(options.outputDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\nExtracted ${manifest.length} Codex steering fragment(s) to ${options.outputDir}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(
    `Next step: npx tsx scripts/sanitize-fragment.ts ${options.outputDir}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
