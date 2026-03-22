# Devfolio Submission Draft

## Project Name

Astrolabe

## Tagline (one line)

A course-correction instrument for agents — share human corrections between operators with on-chain attribution and measured impact.

## Description (short — for project cards)

AI agents make mistakes. When humans correct them, those corrections are valuable domain expertise trapped on one machine. Astrolabe extracts corrections from agent memory (Claude, Codex), lets operators share them through a credit economy, and measures their impact with A/B evaluation. All attribution and reputation on Base mainnet via canonical ERC-8004.

## Description (long — for project page)

### What it does

Astrolabe turns human corrections of AI agents into a reusable, attributable asset class. When an operator corrects their agent — "no, not that," "verify before claiming," "the real bottleneck is Stage 2 biofilm, not macrofouling" — that correction is extracted, sanitized, and published on-chain with a content hash, domain tag, and credit price.

Other operators' agents can discover and borrow these corrections, prepend them as context, and measurably improve their responses in domains where they have knowledge gaps. A blind A/B evaluation harness measures the impact, and the delta feeds into ERC-8004 reputation for the contributor.

### Key results

Repeated evaluation (5 runs per task, 95% confidence intervals) across 3 domains and 9 tasks:

- **Aquaculture**: +1.93 avg delta, CI [+0.6, +3.3] — statistically significant
- **Materials science**: +1.76 avg delta, CI [+1.1, +2.4] — statistically significant
- **SaaS engineering**: +0.13 avg delta, CI [-1.2, +1.5] — not significant (baseline already strong)

7 of 9 tasks show statistically significant effects (6 positive, 1 negative). Corrections from Claude operator sessions also improve Llama 3.3 70B responses via Venice's no-data-retention API.

### Autonomous agent

A fully autonomous agent (ERC-8004 #35601) discovers corrections on-chain, borrows within its credit budget, evaluates their impact, and submits reputation feedback — no human in the loop. Structured agent logs record every autonomous decision.

### How it's built

- **Solidity** (Foundry): `OperatorRegistry.sol` + `MemoryLending.sol` — identity-verified publishing, credit-based borrowing (no ETH payments), duplicate prevention, reputation-driven credit lines reading directly from canonical ERC-8004 getSummary()
- **TypeScript** (viem): extraction, sanitization, publishing, borrowing, evaluation, and autonomous agent scripts
- **Base mainnet**: canonical ERC-8004 Identity + Reputation registries, real on-chain transactions
- **Claude Sonnet + Venice/Llama**: dual-provider evaluation harness with cross-model evidence

### What makes it different

Every existing agent memory system (Mem0, Letta, MemOS, A-Mem) treats memory as private and ephemeral. None publish actual memory content for cross-agent sharing. Astrolabe is the first protocol for making corrections publishable, attributable, and measurably useful — with statistical evidence that they work.

## Tracks / Bounties

- Protocol Labs — Agents With Receipts
- Protocol Labs — Let the Agent Cook
- Synthesis Open Track
- Venice — Private Agents, Trusted Actions

## Links

- **GitHub**: https://github.com/ainsleys/synthesis
- **Explorer**: (host explorer/index.html or link to raw GitHub pages)
- **Demo command**: `npm run demo` (quick) or `npm run agent-task` (autonomous)

## Tech Stack

Solidity, Foundry, TypeScript, viem, Base, ERC-8004, Claude API, Venice API

## Team

Ainsley (operator) + Claude Opus 4.6 + Codex (agents)
