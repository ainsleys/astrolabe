# Astrolabe

A course-correction instrument for agents.

AI agents make mistakes. When a human corrects them — "no, not that," "stop assuming X," "verify before claiming" — that correction is valuable. It carries domain expertise that another agent can't regenerate from public sources alone.

Astrolabe is a case study and protocol prototype for sharing those corrections between operators, with on-chain attribution and reputation on Base using [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity. Unlike existing agent memory systems (Mem0, Letta, MemOS), which treat memory as private and ephemeral, Astrolabe makes corrections publishable, attributable, and measurably useful.

**[Interactive explorer](explorer/index.html)** — eval results with confidence intervals, on-chain verification trail, protocol diagram, and theory.

## What this demo shows

- Steering and correction signals can be distilled into reusable fragments.
- Borrowed correction fragments can measurably improve some downstream tasks.
- A publish -> borrow -> evaluate -> attribute loop can be scaffolded on-chain.

## What this does not show yet

- It does not prove a durable marketplace will form.
- It does not prove the reputation or credit system is economically robust.
- It does not show that all corrections are portable after sanitization.
- It does not yet provide mature discovery, pricing, or anti-Sybil mechanics.

## Current workflow

```
Extract corrections    Operators work with agents. Corrections are
from agent memory  --> extracted from Claude feedback memories or
                       Codex steering events.

Sanitize + publish     Corrections are stripped of PII, reviewed by
on-chain           --> the operator, and published with a content hash,
                       domain tag, and credit price on Base.

Borrow + verify        A second operator borrows the correction.
                   --> Content is fetched and hash-verified before
                       the on-chain borrow is recorded. Credits are
                       deducted from the borrower and credited to
                       the contributor.

Evaluate + reputation  The borrower runs an A/B eval: task response
                   --> without the correction (baseline) vs with it
                       (augmented). Measured delta feeds into ERC-8004
                       reputation for the contributor.
```

## Key concepts

| Term | Meaning |
|------|---------|
| **Correction** | A human correction of agent behavior — what the agent did wrong, what the human wanted, why. Structurally a preference pair. |
| **Fragment** | A publishable correction in markdown format, sanitized and ready to share. The on-chain unit. |
| **Operator** | The persistent identity behind one or more agents. Reputation and credits accrue to operators. |
| **Agent** | An ERC-8004 on-chain identity (NFT) linked to an operator. Ephemeral sessions share a persistent agent ID. |
| **Credits** | Internal accounting unit. Not a token, not transferable. Tracks whether you're a net contributor or net consumer. |
| **Credit line** | How far negative your balance can go. Starts at 5 (enough to borrow a few corrections before contributing). Grows with reputation. |

## Quick demo

Requires: Node 20+, [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`), `.env` configured (see below). The demo borrows a fragment, runs one eval task (~$0.10 API cost), and prints Basescan links.

```bash
npm install
npm run serve &          # start fragment server
npm run demo             # full flow: discover → borrow → eval → Basescan links
```

## Autonomous agent

A fully autonomous agent that discovers corrections on-chain, borrows within its credit budget, evaluates their impact, and submits reputation feedback — no human in the loop. Registered as ERC-8004 agent [#35601](https://basescan.org/token/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432?a=35601).

```bash
npm run agent-task -- "Design a biofouling prevention strategy for aquaculture" --domain materials-science
npm run agent-task -- "..." --domain aquaculture --venice   # cross-model via Venice/Llama
npm run agent-task -- "..." --domain saas-engineering --dry-run  # test without on-chain txs
```

Every run produces a structured agent log in `agent-runs/` with timestamps, tx hashes, and reasoning for every autonomous decision. See [agent.json](agent.json) for the full manifest.

## Deployed on Base

| Contract | Address |
|----------|---------|
| OperatorRegistry | [`0xA8d7...d7`](https://basescan.org/address/0xA8d755a65Eb7db887Da0e89FCd42867D1c6c4Cd7) |
| MemoryLending | [`0x10c8...69`](https://basescan.org/address/0x10c89c8f7991d72C7162EaC0CD272B75DB8EE469) |
| ERC-8004 Identity | [`0x8004...32`](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) (canonical) |
| ERC-8004 Reputation | [`0x8004...63`](https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) (canonical) |

All identity checks, borrow receipts, credit accounting, and reputation feedback are on Base mainnet with canonical ERC-8004 registries.

## Eval results

Each task was run 5 times with a blind judge. 95% confidence intervals distinguish real effects from judge variance.

| Domain | Mean delta | 95% CI | Significant? |
|--------|-----------|--------|-------------|
| Aquaculture | **+1.93** | [+0.6, +3.3] | **Yes** |
| Materials science | **+1.76** | [+1.1, +2.4] | **Yes** |
| SaaS engineering | +0.13 | [-1.2, +1.5] | No |

7 of 9 individual tasks show statistically significant effects (6 positive, 1 negative). Results suggest correction fragments help most where genuine domain knowledge gaps exist. The service-integration-verification task shows a significant *negative* effect (mean -2.27, CI [-2.8, -1.7]) — corrections can also hurt when the baseline is already strong.

### Cross-model transfer (Venice / Llama 3.3 70B)

Corrections from Claude operator sessions also improve Llama responses, evaluated via Venice's no-data-retention API:

| Domain | Claude delta | Llama delta | Pattern? |
|--------|------------|-------------|----------|
| Aquaculture | +1.93 | +1.4 | Same direction |
| Materials science | +1.76 | +0.4 | Weaker, same direction |
| SaaS engineering | +0.13 | +0.1 | Both near zero |

The service-verification regression reproduces on Llama (-2.0), suggesting the failure is content-specific, not model-specific. Fragment content is never persisted by Venice's inference service.

## Setup

### Clone

```bash
git clone --recurse-submodules https://github.com/ainsleys/astrolabe.git
cd astrolabe
npm install
```

If cloned without submodules: `git submodule update --init --recursive`

### Environment

Copy `.env.example` to `.env`. The example file includes the current Base deployment addresses — you only need to add wallet private keys and an Anthropic API key.

```bash
cp .env.example .env
# Edit .env: add DEPLOYER_PRIVATE_KEY, BORROWER_PRIVATE_KEY, ANTHROPIC_API_KEY
```

### Verify

```bash
npx tsc --noEmit                          # TypeScript
cd contracts && forge test --offline -vv   # Solidity (34 tests)
```

## Workflow

### 1. Discover available fragments

```bash
npm run list-fragments                     # all domains
npm run list-fragments -- saas-engineering # filter by domain
```

### 2. Publish a fragment

```bash
npm run serve                              # start local fragment server
npm run publish-fragment -- fragments/feedback-logging-before-launch.md saas-engineering 1
```

Arguments: `<file> [domain] [price-in-credits]`

### 3. Borrow a fragment

```bash
npm run borrow-fragment -- 0               # borrow fragment #0
```

Fetches content, verifies hash, records borrow on-chain, saves receipt to `borrows/`.

### 4. Evaluate

```bash
npm run evaluate                           # baseline vs augmented, all tasks
npm run evaluate -- --feedback             # + submit reputation on-chain (borrowed fragments only)
```

### 5. Extract corrections from your own agent

From Claude Code memory:
```bash
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/ --dry-run
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/
```

From Codex steering exports:
```bash
npm run extract-steering -- exports/thread.json --domain developer-tooling
```

Then sanitize before publishing:
```bash
npm run sanitize -- fragments/extracted/
```

### Credit management

Operators start with 5 credits (enough to borrow 1-3 corrections). Credit lines grow automatically as your corrections earn positive reputation from borrowers via the ERC-8004 Reputation Registry. Each reputation point adds 2 credits to your credit line.

## Hackathon track alignment

**Protocol Labs "Agents With Receipts"**: ERC-8004 identity, reputation, and validation registries with on-chain verifiability via real transactions on Base.

**Agents that Trust**: Reputation shaped by measured eval deltas. You don't trust the contributor's claims — you trust the A/B eval result.

**Agents that Cooperate**: Credit envelope enables reciprocal correction sharing. Contribute corrections, earn credits, borrow corrections from others.

**Protocol Labs "Let the Agent Cook"**: Autonomous agent loop (`agent-task.ts`) with ERC-8004 identity, `agent.json` manifest, structured `agent_log.json`, and real on-chain tool use.

**Venice "Private Agents, Trusted Actions"**: Cross-model eval runs through Venice's no-data-retention API. Correction content evaluated on Llama 3.3 70B without persisting data on the inference provider.

## Architecture

- **On-chain** (Base): `OperatorRegistry.sol` + `MemoryLending.sol`. Identity checks, credit accounting, borrow receipts. Canonical ERC-8004 for agent identity and reputation.
- **Off-chain**: Fragment content (markdown), evaluation harness (Claude Sonnet), extraction and sanitization scripts.
- **Design**: corrections are public goods with attribution. Content is readable before payment. Credits compensate labor, not access.

## Why this matters even if the market thesis is early

Even without proving a mature marketplace, the repo argues for a new class of agent artifact: steering-derived corrections that can be extracted, sanitized, reused, and attributed. A market is one coordination mechanism around that artifact. A commons, team knowledge layer, or model-agnostic correction library would also be valuable outcomes.

See [AGENTS.md](AGENTS.md) for full architecture, design decisions, and working norms.
See [v5 concept doc](research/hackathon-ideas/02-lendable-agent-memory-concept-v5.md) for the product design.
