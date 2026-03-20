import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "fragments", "extracted");

/**
 * Extract correction-pattern memories (type: feedback) from a Claude Code
 * memory directory. These are the high-value signal — human corrections
 * of agent behavior — structurally analogous to preference pairs.
 *
 * Usage: npx tsx scripts/extract-corrections.ts <memory-dir> [--dry-run]
 *
 * After extraction, run sanitize-fragment.ts on the output to strip PII.
 */

interface ParsedMemory {
  frontmatter: Record<string, string>;
  body: string;
  file: string;
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return { frontmatter: fm, body: match[2] };
}

function isCorrectionPattern(fm: Record<string, string>, body: string): boolean {
  // Explicit type: feedback
  if (fm.type === "feedback") return true;

  // Heuristic: body contains correction language
  const correctionSignals = [
    "corrected",
    "stop doing",
    "don't ",
    "do not ",
    "not that",
    "wrong",
    "the user was frustrated",
    "multiple times",
    "How to apply",
  ];
  const lower = body.toLowerCase();
  const matches = correctionSignals.filter((s) => lower.includes(s));
  return matches.length >= 2;
}

function scoreFragment(fm: Record<string, string>, body: string): number {
  let score = 0;

  // Explicit feedback type
  if (fm.type === "feedback") score += 3;

  // Has "Why" section — explains the correction context
  if (body.includes("**Why:**") || body.includes("## Why")) score += 2;

  // Has "How to apply" — actionable guidance
  if (body.includes("**How to apply:**") || body.includes("## How to apply"))
    score += 2;

  // Contains correction language (stronger signals)
  if (/corrected.*multiple times/i.test(body)) score += 2;
  if (/the user was frustrated/i.test(body)) score += 1;
  if (/stop (saying|doing|suggesting)/i.test(body)) score += 1;

  // Penalize if too short (likely not enough context to be useful)
  if (body.length < 200) score -= 2;

  // Penalize if too project-specific (contains many proper nouns / paths)
  const pathCount = (body.match(/\/[\w/.-]+/g) || []).length;
  if (pathCount > 3) score -= 1;

  return score;
}

async function main() {
  const memoryDir = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!memoryDir) {
    console.error(
      "Usage: extract-corrections <memory-dir> [--dry-run]"
    );
    console.error("");
    console.error(
      "  Scans a Claude Code memory directory for correction-pattern memories"
    );
    console.error("  (type: feedback) and extracts them as publishable fragments.");
    console.error("");
    console.error("  Example:");
    console.error(
      "    npx tsx scripts/extract-corrections.ts ~/.claude/projects/-Users-me-myproject/memory/"
    );
    process.exit(1);
  }

  const files = readdirSync(memoryDir).filter(
    (f) => f.endsWith(".md") && f !== "MEMORY.md"
  );

  console.log(`Scanning ${files.length} memory files in ${memoryDir}\n`);

  const candidates: (ParsedMemory & { score: number })[] = [];

  for (const file of files) {
    const content = readFileSync(join(memoryDir, file), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    if (!isCorrectionPattern(frontmatter, body)) {
      console.log(`  SKIP  ${file} (not a correction pattern)`);
      continue;
    }

    const score = scoreFragment(frontmatter, body);
    console.log(`  MATCH ${file} (score: ${score})`);
    candidates.push({ frontmatter, body, file, score });
  }

  console.log(`\nFound ${candidates.length} correction-pattern memories\n`);

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    console.log("No corrections found. Try a different memory directory.");
    return;
  }

  console.log("Ranked candidates:");
  for (const c of candidates) {
    console.log(`  ${c.score >= 5 ? "★" : " "} [${c.score}] ${c.file}`);
  }
  console.log();

  if (dryRun) {
    console.log("Dry run — no files written.");
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  let written = 0;
  for (const c of candidates) {
    if (c.score < 3) {
      console.log(`  Skipping ${c.file} (score ${c.score} < threshold 3)`);
      continue;
    }

    const content = readFileSync(join(memoryDir, c.file), "utf-8");
    const outPath = join(OUTPUT_DIR, c.file);
    writeFileSync(outPath, content);
    console.log(`  Wrote ${outPath}`);
    written++;
  }

  console.log(`\nExtracted ${written} fragments to ${OUTPUT_DIR}`);
  console.log(
    "Next step: npx tsx scripts/sanitize-fragment.ts fragments/extracted/"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
