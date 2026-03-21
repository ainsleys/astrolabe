# Astrolabe

A course-correction instrument for agents.

AI agents make mistakes. When a human corrects them — "no, not that," "stop assuming X," "verify before claiming" — that correction is valuable. It carries domain expertise that another agent can't regenerate from public sources alone.

Astrolabe is a protocol for sharing those corrections between operators, with on-chain attribution and reputation on Base using [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity.

## What it does

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

Requires: Node 20+, `.env` configured (see below). The demo borrows a fragment, runs one eval task (~$0.10 API cost), and prints Basescan links.

```bash
npm install
npm run serve &          # start fragment server
npm run demo             # full flow: discover → borrow → eval → Basescan links
```

## Deployed on Base

| Contract | Address |
|----------|---------|
| OperatorRegistry | [`0xb831...C2`](https://basescan.org/address/0xb831Be94a83B581855B2802dE85E3f34aC4F5Fc2) |
| MemoryLending | [`0x7d81...5D`](https://basescan.org/address/0x7d817358A7eaCEB745A1Bb4C83dBE1123B46545D) |
| ERC-8004 Identity | [`0x8004...32`](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) (canonical) |
| ERC-8004 Reputation | [`0x8004...63`](https://basescan.org/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) (canonical) |

All identity checks, borrow receipts, credit accounting, and reputation feedback are on Base mainnet with canonical ERC-8004 registries.

## Eval results

| Domain | Avg delta | Notes |
|--------|-----------|-------|
| Aquaculture | **+1.7** | Corrections about tilapia disease, FCR methodology, and carp breeding improved responses. |
| SaaS engineering | **-0.9** | Mixed — two tasks improved slightly, one regressed. Baseline was already strong. |

Mixed results are honest results. The system correctly assigns low reputation to domains where corrections don't help.

## Setup

### Clone

```bash
git clone --recurse-submodules https://github.com/ainsleys/synthesis.git
cd synthesis
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

Operators start with 5 credits (enough to borrow 1-3 corrections). The deployer can raise credit lines:

```bash
npm run set-credit-line -- <operator-id> 15
```

## Hackathon track alignment

**Protocol Labs "Agents With Receipts"**: ERC-8004 identity, reputation, and validation registries with on-chain verifiability via real transactions on Base.

**Agents that Trust**: Empirical reputation from measured eval deltas. You don't trust the contributor's claims — you trust the A/B eval result.

**Agents that Cooperate**: Credit envelope enables reciprocal correction sharing. Contribute corrections, earn credits, borrow corrections from others.

## Architecture

- **On-chain** (Base): `OperatorRegistry.sol` + `MemoryLending.sol`. Identity checks, credit accounting, borrow receipts. Canonical ERC-8004 for agent identity and reputation.
- **Off-chain**: Fragment content (markdown), evaluation harness (Claude Sonnet), extraction and sanitization scripts.
- **Design**: corrections are public goods with attribution. Content is readable before payment. Credits compensate labor, not access.

See [AGENTS.md](AGENTS.md) for full architecture, design decisions, and working norms.
See [v5 concept doc](research/hackathon-ideas/02-lendable-agent-memory-concept-v5.md) for the product design.
