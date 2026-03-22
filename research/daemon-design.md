# Extraction Daemon Design

An always-on service that watches an operator's agent memory for new corrections and surfaces them for review and publication. This document is specific enough to implement from. It assumes familiarity with the existing extraction scripts (`extract-corrections.ts`, `extract-steering-corrections.ts`), the sanitization step (`sanitize-fragment.ts`), and the on-chain publication step (`publish-fragment.ts`).

## 1. What it does

The daemon continuously monitors two upstream sources for new correction candidates:

**Claude Code memories.** It watches directories matching `~/.claude/projects/*/memory/` for markdown files with `type: feedback` frontmatter or heuristic correction signals (the same `isCorrectionPattern` logic from `extract-corrections.ts`). Memory files appear when Claude Code writes a new memory during a session. The daemon detects new or modified files and scores them using the existing `scoreFragment` function.

**Codex exports.** It watches a configurable export directory (default: `~/codex-exports/` or a path set in config) for new `.json` thread export files. When a new export lands, the daemon runs the same normalization and episode extraction from `extract-steering-corrections.ts`: find the longest message array in the JSON, normalize events, detect explicit steer events and corrective messages, build episodes with before/after context, score them, and deduplicate.

Both sources feed into a single candidate queue. The daemon does not publish anything automatically. It accumulates candidates and surfaces them to the operator on a configurable schedule:

- **End of session** -- triggered by a Claude Code post-session hook. The hook invokes the daemon's review command for any candidates found during that session.
- **Daily digest** -- the daemon emits a summary at a configured time (default: 6:00 PM local). If running as a background service, it writes a notification file; if running as a cron job, it prints the summary to stdout.
- **On demand** -- the operator runs `npx tsx scripts/daemon.ts review` at any time to see pending candidates.

Minimum viable behavior: scan, score, deduplicate, queue for review. The daemon should be useful even if the operator never configures a background service -- the `review` subcommand alone replaces the current manual `extract` + `sanitize` + `publish` pipeline.

## 2. Operator interaction

### Notification

When new candidates are ready, the daemon produces a one-line summary:

```
3 new correction candidates found (2 from Claude Code, 1 from Codex). Review with: npx tsx scripts/daemon.ts review
```

Delivery depends on the running mode:

- **Hook mode:** printed to stderr at the end of the Claude Code session.
- **Background daemon:** writes to `~/.astrolabe/notifications.log` and optionally sends a macOS notification via `osascript -e 'display notification ...'` or `notify-send` on Linux.
- **Cron mode:** stdout, which cron can route to email or a log file.

### Review flow

`npx tsx scripts/daemon.ts review` presents each pending candidate interactively:

```
--- Candidate 1/3 ---
Source:  ~/.claude/projects/-Users-me-myproject/memory/feedback-logging.md
Score:   7 (threshold: 3)
Signal:  type: feedback (explicit)
PII:     1 flag: file path "/Users/me/myproject/src/config.ts"

Preview:
  # Always check log output before claiming a feature works
  ## Why
  The operator corrected the agent multiple times for claiming deployment
  success without verifying logs. The agent was frustrated because...

  [a]pprove  [e]dit  [r]eject  [s]kip  [q]uit
```

Each field explained:

- **Score** is the numeric score from `scoreFragment` (Claude Code source) or `scoreEpisode` (Codex source), with the configured minimum threshold shown for context.
- **Signal** shows the detection method: `type: feedback` for explicit frontmatter, `heuristic (N signals)` for body-language matches, `explicit-steer` or `corrective-message` for Codex sources.
- **PII flags** are pre-scan results from the privacy filter (section 6). These are warnings, not blocks -- the operator decides.
- **Preview** shows the first ~20 lines of the candidate body, enough to judge relevance without opening the file.

Operator actions:

| Action | What happens |
|--------|-------------|
| **approve** | Candidate is queued for sanitize-and-publish. |
| **edit** | Opens the candidate in `$EDITOR`. After the editor closes, the edited version is queued for sanitize-and-publish. |
| **reject** | Candidate is marked rejected. Its content hash is recorded so it is never surfaced again. |
| **skip** | Candidate stays pending for the next review session. |
| **quit** | Exits review. Remaining candidates stay pending. |

### Sanitize and publish

After the review loop, all approved candidates are processed in batch:

1. **Sanitize.** Each approved candidate is passed through the same Anthropic-powered sanitization as `sanitize-fragment.ts`, imported as a library function (not a subprocess). The `sanitize` function takes an Anthropic client and content string, returns a `SanitizationResult` with verdict, PII found, changes made, and sanitized text.

2. **Operator confirms sanitization.** For each candidate where `verdict === "redacted"`, the daemon shows the diff (original vs. sanitized) and asks the operator to confirm. If `verdict === "rejected"` by the sanitizer, the daemon reports this and moves on. If `verdict === "clean"`, it proceeds without confirmation.

3. **Publish.** Each confirmed candidate is published on-chain via the same logic as `publish-fragment.ts`, imported as a library call: compute keccak256 content hash, copy to the served fragments directory, call `MemoryLending.publishFragment` with the operator's contributor identity, domain, and price. The daemon infers domain from the fragment frontmatter if present, or falls back to a configurable default.

4. **Record.** The state file is updated with the publication result (fragment ID, tx hash, timestamp).

### Non-interactive mode

For CI or scripted use: `npx tsx scripts/daemon.ts review --auto-approve --min-score 7` approves all candidates at or above the given score, rejects the rest, and runs sanitize+publish without prompts. This still requires `ANTHROPIC_API_KEY` for sanitization and wallet keys for publication. The `--auto-approve` flag is intentionally aggressive and prints a warning.

## 3. Installation and running

Three deployment modes, from lightest to heaviest.

### 3a. Claude Code hook (recommended for most operators)

Claude Code supports post-session hooks. The daemon registers as one:

```json
// ~/.claude/hooks.json (or the project-level equivalent)
{
  "post-session": [
    {
      "command": "npx tsx /path/to/synthesis/scripts/daemon.ts scan --notify"
    }
  ]
}
```

This runs `scan` after every Claude Code session. The `--notify` flag means it prints candidate counts to stderr if any are found. The operator then runs `review` manually when ready.

Setup:

```bash
# From the synthesis repo
npm run daemon -- install-hook
```

This writes the hook entry and prints confirmation. Uninstall with `npm run daemon -- uninstall-hook`.

### 3b. Background daemon (launchd on macOS, systemd on Linux)

For operators who want continuous watching, including Codex export directories:

**macOS (launchd):**

```bash
npm run daemon -- install-service
```

This generates and loads a plist at `~/Library/LaunchAgents/com.astrolabe.extraction-daemon.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.astrolabe.extraction-daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npx</string>
    <string>tsx</string>
    <string>/absolute/path/to/synthesis/scripts/daemon.ts</string>
    <string>watch</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>~/.astrolabe/daemon.log</string>
  <key>StandardErrorPath</key>
  <string>~/.astrolabe/daemon.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>/Users/operator</string>
  </dict>
</dict>
</plist>
```

**Linux (systemd):**

```bash
npm run daemon -- install-service
```

Generates `~/.config/systemd/user/astrolabe-daemon.service`:

```ini
[Unit]
Description=Astrolabe extraction daemon

[Service]
ExecStart=/usr/bin/npx tsx /absolute/path/to/synthesis/scripts/daemon.ts watch
Restart=on-failure
Environment=HOME=/home/operator

[Install]
WantedBy=default.target
```

Then runs `systemctl --user enable --now astrolabe-daemon`.

In both cases, the `watch` subcommand starts the file watcher loop and runs until killed. Logs go to `~/.astrolabe/daemon.log`.

### 3c. Cron job

For operators who prefer periodic batch scanning without a persistent process:

```bash
npm run daemon -- install-cron
```

Appends to the user's crontab:

```
0 18 * * * cd /path/to/synthesis && npx tsx scripts/daemon.ts scan --notify 2>&1 >> ~/.astrolabe/cron.log
```

This runs daily at 6 PM. Adjust the schedule in `~/.astrolabe/config.json`.

## 4. Technical design

### 4.1 Module structure

The daemon is implemented as a single entry point (`scripts/daemon.ts`) with subcommands, plus a library module (`scripts/lib/daemon-core.ts`) that the existing scripts can also import.

```
scripts/
  daemon.ts                  # CLI entry point: scan, watch, review, install-hook, install-service, install-cron
  lib/
    daemon-core.ts           # Core logic: scan, score, dedup, state management
    daemon-watcher.ts        # File watcher for watch mode
    daemon-review.ts         # Interactive review UI
    daemon-privacy.ts        # PII pre-scanner (fast, regex-based)
    config.ts                # (existing) wallet and contract config
    wallet.ts                # (existing) wallet helpers
```

### 4.2 File watcher

The `watch` subcommand uses `fs.watch` (Node built-in) with recursive watching on each target directory. No external dependency on chokidar is needed because:

- `fs.watch` supports `recursive: true` on macOS (FSEvents) and on Linux with kernel 5.9+ (fanotify). These are the two target platforms.
- The directories being watched are small (dozens of files, not thousands).
- `fs.watch` is sufficient for detecting new files and modifications. Rename and delete events are also emitted but can be ignored.

The watcher is initialized on:

1. Every directory matching the glob `~/.claude/projects/*/memory/` that exists at startup. New project directories are discovered by re-scanning `~/.claude/projects/` every 5 minutes (a cheap `readdirSync`).
2. The configured Codex export directory (section 5).

When a file change event fires:

1. Debounce: accumulate events for 2 seconds before processing (files may be written in multiple chunks).
2. Read the file. Compute SHA-256 of its content.
3. Check the content hash against `state.json` processed hashes. If already seen, skip.
4. Run the appropriate scoring pipeline (Claude Code or Codex, determined by source directory).
5. If the candidate scores above the configured minimum threshold, add it to the pending candidates list in state.
6. Write the updated state file.

### 4.3 State file

Location: `~/.astrolabe/state.json`

```typescript
interface DaemonState {
  // Schema version for forward compatibility
  version: 1;

  // Content hashes of all files ever processed, mapped to their disposition
  processed: Record<string, {
    source: "claude-code" | "codex";
    sourceFile: string;           // absolute path to the original file
    firstSeen: string;            // ISO 8601 timestamp
    disposition: "pending" | "approved" | "rejected" | "published" | "skipped";
    score: number;
    fragmentId?: number;          // set after on-chain publication
    txHash?: string;              // set after on-chain publication
    publishedAt?: string;         // ISO 8601 timestamp
  }>;

  // Pending candidates waiting for operator review
  pending: Array<{
    contentHash: string;          // key into processed map
    source: "claude-code" | "codex";
    sourceFile: string;
    score: number;
    signalType: string;           // "type-feedback", "heuristic", "explicit-steer", "corrective-message"
    piiFlags: string[];           // from fast pre-scan
    addedAt: string;              // ISO 8601
    preview: string;              // first 500 chars of body
  }>;

  // Operator configuration
  config: DaemonConfig;
}

interface DaemonConfig {
  // Minimum score to surface a candidate (default: 3 for Claude Code, 4 for Codex)
  minScoreClaude: number;
  minScoreCodex: number;

  // Maximum candidates per review batch (default: 20)
  maxBatchSize: number;

  // Default domain for fragments without frontmatter domain field
  defaultDomain: string;

  // Default price in credits for published fragments
  defaultPriceCredits: number;

  // Codex export directory to watch
  codexExportDir: string;

  // Project-level opt-outs: glob patterns for projects to never extract from
  projectOptOuts: string[];

  // Sensitive path patterns to flag (in addition to built-in patterns)
  sensitivePathPatterns: string[];

  // Schedule: "end-of-session" | "daily" | "on-demand"
  schedule: string;

  // Daily digest time (HH:MM in local time, only used when schedule is "daily")
  dailyDigestTime: string;

  // macOS notifications enabled
  desktopNotifications: boolean;
}
```

The state file is written atomically (write to a `.tmp` file, then rename) to avoid corruption if the daemon is killed mid-write. A file lock (`~/.astrolabe/state.lock`) prevents concurrent access when the hook and the background daemon could theoretically overlap.

### 4.4 Deduplication

Dedup happens at two levels:

1. **Content hash.** The SHA-256 of the raw file content. If a file is modified but its content hash is already in `state.processed`, it is not re-surfaced. This handles the case where Claude Code rewrites a memory file with identical content.

2. **Semantic dedup for Codex.** Codex episodes are deduplicated by `title + triggerText` (the same logic as the existing `dedupeEpisodes` function). This prevents the same steering correction from being surfaced multiple times if the operator exports overlapping thread ranges.

When a file is modified and its content hash is new (content actually changed), it is treated as a new candidate, even if the file path was previously processed. The old entry remains in state for audit purposes; the new content hash gets its own entry.

### 4.5 Scoring integration

The scoring functions from the existing scripts are extracted into `daemon-core.ts` as importable functions. No logic changes -- the daemon uses identical scoring:

- `parseFrontmatter(content)` -- parse YAML-like frontmatter from markdown
- `isCorrectionPattern(fm, body)` -- detect correction signals (explicit `type: feedback` or 2+ heuristic matches)
- `scoreFragment(fm, body)` -- numeric score for Claude Code memories (threshold: 3)
- `normalizeEvents(filePath, payload)` -- parse Codex JSON into normalized events
- `isCorrectiveMessage(event)` -- detect corrective user turns
- `buildEpisode(event, events, domain)` -- construct a candidate episode with before/after context
- `scoreEpisode(event, before, after)` -- numeric score for Codex episodes (threshold: 4)

The existing `extract-corrections.ts` and `extract-steering-corrections.ts` should be refactored to import these functions from `daemon-core.ts`, so there is exactly one copy of the scoring logic.

### 4.6 Sanitization and publication integration

The daemon imports sanitization and publication as library calls, not subprocess invocations:

**Sanitization.** The `sanitize` function from `sanitize-fragment.ts` is extracted into `scripts/lib/sanitize.ts`:

```typescript
export async function sanitizeContent(
  client: Anthropic,
  content: string
): Promise<SanitizationResult>
```

This is the same function that currently exists inside `sanitize-fragment.ts`, lifted to a shared module. The daemon creates one Anthropic client instance and reuses it across the batch.

**Publication.** The publication logic from `publish-fragment.ts` is extracted into `scripts/lib/publish.ts`:

```typescript
export async function publishFragmentOnChain(options: {
  content: string;
  domain: string;
  priceCredits: bigint;
  contributorOperatorId: bigint;
}): Promise<{ fragmentId: bigint; txHash: string }>
```

This handles: compute content hash, copy to served directory, call `MemoryLending.publishFragment`, parse the event log for the fragment ID. The daemon calls this once per approved candidate.

The existing CLI scripts (`sanitize-fragment.ts`, `publish-fragment.ts`) are then thin wrappers around these library functions, preserving backward compatibility.

### 4.7 Error handling

- If the Anthropic API is unavailable during sanitization, the candidate stays in pending state with a note. The operator can retry on the next review.
- If an on-chain transaction fails (insufficient gas, contract error), the candidate is marked with the error. The operator sees this in the next review and can retry.
- If the state file is corrupted, the daemon recreates it from scratch by re-scanning all memory directories. Already-published fragments are not re-extracted because their content hashes appear on-chain; the daemon can optionally query the contract to rebuild the published set.
- File watcher errors (directory deleted, permission denied) are logged and the watcher for that specific directory is removed. The periodic re-scan will re-add the directory if it reappears.

## 5. Codex-specific considerations

### 5.1 Export format

The existing `extract-steering-corrections.ts` makes no assumptions about a fixed JSON schema. It uses a generic approach:

1. Parse the JSON payload (any structure).
2. Recursively collect all arrays of objects (`collectCandidateArrays`).
3. Pick the longest array as the message/event sequence.
4. Normalize each element by extracting `role` (checking `record.role`, `record.author.role`, `record.sender.role`, `record.actor.role`), `kind` (checking `event_type`, `type`, `kind`, `name`, `action`), and `text` (checking `text`, `message`, `body`, `prompt`, etc.).
5. Detect explicit steers by checking if `kind` contains "steer", "redirect", or "trajectory", or if any metadata field mentions "steer".

This format-agnostic approach means the daemon does not need to know the exact Codex export schema. It works with any JSON that contains an array of message-like objects.

### 5.2 Where exports land

Codex does not currently write exports to a well-known directory automatically. Operators must export threads manually (via Codex UI or API) and place the JSON files somewhere. The daemon's config specifies this directory:

```json
{
  "codexExportDir": "~/codex-exports"
}
```

If Codex later supports automatic export to a fixed directory, the daemon config can be updated to point there.

For the MVP, the daemon also accepts a `scan --codex <path>` argument to process a specific file or directory on demand, matching the current `extract-steering-corrections.ts` UX.

### 5.3 Detection of new exports

In `watch` mode, the daemon places an `fs.watch` on the Codex export directory. When a new `.json` file appears, it is debounced (5-second window, since JSON exports can be large and may be written incrementally), then processed through the full Codex extraction pipeline.

In `scan` mode (hook or cron), the daemon checks all `.json` files in the export directory against the state file's content hashes. Only files with new hashes are processed.

### 5.4 Domain inference

Codex exports do not carry a domain field. The daemon uses the following priority:

1. `--domain` flag if the operator passed one.
2. The `domain` field in the daemon config's `defaultDomain`.
3. Fallback: `"developer-tooling"`.

The operator can override domain per-candidate during the review step by choosing `edit`.

## 6. Privacy controls

Privacy is the hardest part of this system. The AGENTS.md design position is clear: "Privacy requires a human checkpoint. Sanitization helps, but human review is mandatory for anything publishable." The daemon enforces this in three layers.

### 6.1 Fast pre-scan (regex-based, no API call)

Before a candidate is added to the pending queue, the daemon runs a fast pattern scan to flag potential PII. This does not block the candidate -- it annotates it so the operator sees warnings during review.

Built-in patterns:

| Pattern | Example match | Flag text |
|---------|---------------|-----------|
| `/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}/i` | `user@company.com` | "Email address" |
| `/\b(sk|pk|api|key|token|secret|password|credential)[_-]?[a-zA-Z0-9]{16,}\b/i` | `sk-abc123...` | "Possible API key/secret" |
| `/\/Users\/[^\s/]+/` | `/Users/ainsley` | "macOS user path" |
| `/\/home\/[^\s/]+/` | `/home/deploy` | "Linux user path" |
| `/C:\\Users\\[^\s\\]+/` | `C:\Users\admin` | "Windows user path" |
| `/\b\d{1,3}(\.\d{1,3}){3}\b/` | `192.168.1.1` | "IP address" |
| `/\b(AWS|GCP|AZURE|OPENAI|ANTHROPIC)_[A-Z_]+\b/` | `AWS_SECRET_ACCESS_KEY` | "Cloud env var name" |
| Operator-configured patterns from `sensitivePathPatterns` | varies | "Matches sensitive pattern" |

### 6.2 Auto-reject rules

Certain patterns cause automatic rejection (the candidate is never surfaced to the operator). These are configurable, with defaults:

- Content containing what appears to be a raw private key (hex string 64+ chars after a `PRIVATE_KEY` label).
- Content containing what appears to be a JWT token (`eyJ...`).
- Content from projects matching any `projectOptOuts` glob pattern.

Auto-rejected candidates are recorded in state with `disposition: "rejected"` and a reason field, so the operator can audit what was filtered.

### 6.3 Project-level opt-outs

The operator can exclude entire projects from extraction:

```json
{
  "projectOptOuts": [
    "*finance*",
    "*-Users-me-secret-project*"
  ]
}
```

These are matched against the Claude Code project directory name (the segment after `~/.claude/projects/`). Any memory file in a matching project is silently skipped.

### 6.4 Human approval gate

The daemon never auto-publishes. Even in `--auto-approve` mode, the sanitization step runs and any candidate the sanitizer marks as `rejected` is not published. The `--auto-approve` flag approves for sanitization review, not for bypassing it.

The full gate sequence for every candidate:

```
detected -> pre-scanned (PII flags) -> pending
  -> operator review (approve/edit/reject/skip)
    -> sanitization (Anthropic API)
      -> operator confirms redactions (if verdict is "redacted")
        -> on-chain publication
```

There is no shorter path. This is intentional.

### 6.5 Audit log

Every daemon action is appended to `~/.astrolabe/audit.log` as newline-delimited JSON:

```json
{"ts":"2026-03-22T18:00:00Z","action":"scan","source":"claude-code","file":"feedback-logging.md","hash":"abc123","score":7,"piiFlags":["macOS user path"]}
{"ts":"2026-03-22T18:05:00Z","action":"approve","hash":"abc123","operator":"manual"}
{"ts":"2026-03-22T18:05:02Z","action":"sanitize","hash":"abc123","verdict":"redacted","changes":["Replaced /Users/me with generic path"]}
{"ts":"2026-03-22T18:05:10Z","action":"publish","hash":"abc123","fragmentId":3,"txHash":"0xdef456"}
```

This lets the operator trace every decision that led to a publication, which matters for the attribution and provenance story that Astrolabe is built on.

## 7. Configuration

All configuration lives in `~/.astrolabe/config.json`, created with defaults on first run:

```json
{
  "minScoreClaude": 3,
  "minScoreCodex": 4,
  "maxBatchSize": 20,
  "defaultDomain": "developer-tooling",
  "defaultPriceCredits": 1,
  "codexExportDir": "~/codex-exports",
  "projectOptOuts": [],
  "sensitivePathPatterns": [],
  "schedule": "end-of-session",
  "dailyDigestTime": "18:00",
  "desktopNotifications": true
}
```

The operator can edit this file directly or use `npx tsx scripts/daemon.ts config set <key> <value>`.

## 8. CLI reference

```
npx tsx scripts/daemon.ts <command> [options]

Commands:
  scan [--notify] [--codex <path>]
      Scan all watched directories for new candidates.
      --notify: print summary to stderr if candidates found.
      --codex <path>: also scan a specific Codex export file or directory.

  watch
      Start the persistent file watcher. Runs until killed.
      Intended for use as a background service.

  review [--auto-approve --min-score <n>]
      Interactive review of pending candidates.
      --auto-approve: skip interactive prompts, approve all above threshold.
      --min-score: override minimum score for auto-approve (default: 7).

  status
      Print daemon state: pending count, last scan time, watched directories.

  config set <key> <value>
      Update a configuration value.

  config show
      Print current configuration.

  install-hook
      Register the daemon as a Claude Code post-session hook.

  uninstall-hook
      Remove the Claude Code post-session hook.

  install-service
      Install and start a background service (launchd or systemd).

  uninstall-service
      Stop and remove the background service.

  install-cron
      Add a daily scan to the user's crontab.

  uninstall-cron
      Remove the cron entry.
```

## 9. Dependencies

The daemon adds no new npm dependencies beyond what the project already uses:

- `fs` / `path` / `crypto` / `child_process` -- Node built-ins for file watching, hashing, and service installation.
- `@anthropic-ai/sdk` -- already a dependency, used for sanitization.
- `viem` -- already a dependency, used for on-chain publication.
- `dotenv` -- already a dependency, for `.env` loading.
- `readline` -- Node built-in, for the interactive review prompt.

The `chokidar` package is not required. `fs.watch` is sufficient for the directory counts and platforms involved.

## 10. Implementation sequence

Recommended build order, each step independently useful:

1. **Extract `daemon-core.ts`** -- lift scoring, parsing, and dedup functions out of the two extraction scripts into a shared module. Refactor the existing scripts to import from it. This is pure refactoring with no behavior change.

2. **Implement `scan` subcommand** -- reads all Claude Code memory directories and the Codex export directory, scores candidates, writes state file. This replaces the manual `extract-corrections` and `extract-steering-corrections` workflows.

3. **Implement `review` subcommand** -- interactive review loop with approve/edit/reject. Calls sanitization and publication as library functions. This replaces the manual `sanitize` + `publish-fragment` workflow.

4. **Implement `watch` subcommand** -- file watcher loop that calls scan logic on change events. This enables background operation.

5. **Implement `install-*` subcommands** -- service installation helpers. These are convenience wrappers around writing config files and calling `launchctl`/`systemctl`/`crontab`.

6. **Implement privacy pre-scan** -- regex-based PII flagger, auto-reject rules, project opt-outs. This can be developed in parallel with steps 2-3.

Steps 1-3 deliver the core value. Steps 4-6 are operational polish.
