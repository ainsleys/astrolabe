import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS_DIR = join(__dirname, "..", "fragments");
const SANITIZED_DIR = join(__dirname, "..", "fragments", "sanitized");

const MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 2;

interface SanitizationResult {
  sanitized: string;
  changes: string[];
  pii_found: string[];
  verdict: "clean" | "redacted" | "rejected";
}

const SANITIZE_PROMPT = `You are a PII and sensitive data reviewer for agent memory fragments.
These fragments will be published on-chain and shared publicly. You must ensure they contain
ZERO private or sensitive information.

Review the following memory fragment and:

1. Identify ALL instances of:
   - Personal names (real people, not generic roles)
   - Email addresses, phone numbers, physical addresses
   - API keys, credentials, tokens, secret values, service account filenames
   - Specific company names that could identify the source (generic industry names are OK)
   - Repository paths, file paths that reveal identity
   - Financial details (specific prices, revenue, account numbers)
   - IP addresses, internal URLs, deployment platform names
   - Any information that could identify the original author or organization

2. Produce a sanitized version where:
   - Personal names → generic roles ("the operator", "the CTO", "a team member")
   - Company names → generic descriptions ("a SaaS startup", "the company")
   - Credentials/keys → "[REDACTED]" or removed entirely
   - Specific file paths → generic descriptions ("the config file", "the service module")
   - Prices in specific currencies → relative descriptions or removed
   - Platform names (Railway, Vercel, etc.) → "the deployment platform"
   - Product names → generic descriptions ("the messaging product", "the invoicing tool")

3. Preserve:
   - The operational lesson / correction / heuristic (this is the valuable part)
   - Technical patterns and approaches (these are generic knowledge)
   - The frontmatter structure (domain, type, format fields)
   - Confidence notes

Respond with ONLY this JSON:
{
  "verdict": "clean" | "redacted" | "rejected",
  "pii_found": ["list of PII/sensitive items found, empty if clean"],
  "changes": ["list of changes made, empty if clean"],
  "sanitized": "the full sanitized markdown content (or original if clean)"
}

If the fragment is so specific to one organization that sanitization would destroy the useful content, set verdict to "rejected" and explain why in changes.`;

async function sanitize(
  client: Anthropic,
  content: string
): Promise<SanitizationResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${SANITIZE_PROMPT}\n\n---\n\nFRAGMENT TO REVIEW:\n\n${content}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]) as SanitizationResult;
      if (!parsed.verdict || !parsed.sanitized) throw new Error("Missing fields");
      return parsed;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to parse sanitization result after ${MAX_RETRIES + 1} attempts: ${err}`);
      }
      console.warn(`  Parse attempt ${attempt + 1} failed, retrying...`);
    }
  }

  throw new Error("Unreachable");
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: sanitize-fragment <fragment-file-or-dir>");
    console.error("");
    console.error("  Single file:  npx tsx scripts/sanitize-fragment.ts fragments/my-memory.md");
    console.error("  All files:    npx tsx scripts/sanitize-fragment.ts fragments/");
    process.exit(1);
  }

  if (!config.anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY is required for sanitization");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  mkdirSync(SANITIZED_DIR, { recursive: true });

  // Determine files to process
  const { statSync, readdirSync } = await import("fs");
  const stat = statSync(inputPath);
  let files: string[];

  if (stat.isDirectory()) {
    files = readdirSync(inputPath)
      .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
      .map((f) => join(inputPath, f));
  } else {
    files = [inputPath];
  }

  console.log(`Sanitizing ${files.length} fragment(s)...\n`);

  let clean = 0;
  let redacted = 0;
  let rejected = 0;

  for (const file of files) {
    const name = basename(file);
    console.log(`--- ${name} ---`);

    const content = readFileSync(file, "utf-8");
    const result = await sanitize(client, content);

    console.log(`  Verdict: ${result.verdict}`);

    if (result.pii_found.length > 0) {
      console.log(`  PII found:`);
      result.pii_found.forEach((p) => console.log(`    - ${p}`));
    }

    if (result.changes.length > 0) {
      console.log(`  Changes:`);
      result.changes.forEach((c) => console.log(`    - ${c}`));
    }

    if (result.verdict === "rejected") {
      console.log(`  REJECTED — not safe to publish.`);
      rejected++;
    } else {
      const outPath = join(SANITIZED_DIR, name);
      writeFileSync(outPath, result.sanitized);
      console.log(`  Saved: ${outPath}`);

      if (result.verdict === "clean") clean++;
      else redacted++;
    }

    console.log();
  }

  console.log("=== SUMMARY ===");
  console.log(`  Clean: ${clean}`);
  console.log(`  Redacted: ${redacted}`);
  console.log(`  Rejected: ${rejected}`);
  console.log(`  Total: ${files.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
