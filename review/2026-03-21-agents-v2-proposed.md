# AGENTS.md

## What this project is

Synthesis is an agent-first marketplace experiment built around one concrete asset class: **steering-derived correction fragments**.

The immediate demo is a case study:

- Human steering is valuable data for open-source scaffolding and agent workflows.
- That steering can be extracted from systems like Claude memories and Codex thread steering.
- The resulting correction fragments can be published, borrowed, evaluated, and attributed on-chain.

The broader product direction is larger than the demo. Correction fragments are the first asset class. Other agent-native exchanges, like task execution or reciprocal work commitments, may follow, but they are not the core proof in this repo today.

This is a hackathon project, not a production system.

## What the current repo proves

Be precise when describing the project. The current codebase is best understood as proving three things:

1. Steering and correction signals can be turned into reusable artifacts.
2. Borrowed correction fragments can sometimes improve downstream task performance.
3. An agent-native exchange loop can be scaffolded around those artifacts using operator identity, borrow receipts, evaluation, and reputation feedback.

Do not over-claim beyond that. The repo does not yet prove a mature marketplace, a robust discovery system, or a durable reputation economy at scale.

## Current state vs target state

The code in this repo currently implements the v5 direction more than the old Sepolia/ETH design:

- Base chain in scripts and env config
- operator-first identity via `OperatorRegistry.sol`
- internal credit envelope in `MemoryLending.sol`
- fragment borrowing without ETH payment
- off-chain fragment storage with on-chain receipts
- evaluation and reputation feedback as the quality loop

There are still gaps between the product thesis and the fully realized system:

- discovery is still lightweight and mostly manual
- reputation remains simpler than the long-term marketplace story
- credit-line policy is demo-grade, not governance-complete
- the demo focuses on correction fragments, not the full future asset surface

When writing docs or explaining the demo, separate:

- what the code does now
- what the demo demonstrates
- what the marketplace could support next

## Design positions

These are the repo's resolved positions unless a document explicitly marks something as exploratory.

**Corrections are the signal.** Not all memory is worth sharing. The highest-value transferable unit is operator correction: what the agent was doing, what the operator changed, and why.

**Claude memories and Codex steering are equivalent upstream sources.** Claude `type: feedback` files are direct correction artifacts. Codex contributes the same class of signal through explicit steer events, interrupt-and-redirect actions, and corrective user turns. Both should be distilled into the same fragment format.

**This is a case study first, a marketplace second.** The demo should foreground the empirical claim that steering data can improve open-source scaffolding and adjacent agent tasks. The marketplace layer exists to show how those artifacts could be exchanged, attributed, and rewarded.

**The marketplace is operator-first.** Agents are ephemeral. Operators persist. Publishing, borrowing, and balance accounting should accrue to operators, while agent-level ERC-8004 identity remains the canonical bridge for linked agents and reputation submission where required.

**Fragments are the current exchange primitive.** Steering-derived correction fragments are the thing this repo actually supports end to end. Task execution, compute commitments, or other agent-native goods are future extensions, not the present proof.

**The system uses a reciprocity ledger, not a token.** Credits are an internal accounting unit. They are not an asset, are not transferable, and are meant to encourage contribution back to the commons rather than to create speculation.

**Content stays off-chain.** The contract stores identifiers, hashes, domains, prices, balances, and receipts. Fragment bytes remain off-chain and must be hash-verified before a borrow is recorded.

**Evaluation is part of the product, not a side utility.** The quality loop is: borrow, use, evaluate, then submit feedback. If the demo loses the measured delta story, it loses its strongest claim.

**Privacy requires a human checkpoint.** Sanitization helps, but human review is mandatory for anything publishable. Valuable fragments often contain the most sensitive operational detail.

**Claims must match the current implementation.** Do not describe future architecture as already shipped. If a document mixes current state and target state, label those sections clearly.

## System architecture

### On-chain

```
contracts/src/OperatorRegistry.sol
  - register operator identities
  - link ERC-8004 agent IDs to operators
  - resolve agent -> operator ownership

contracts/src/MemoryLending.sol
  - publish fragments under operator identity
  - borrow fragments against a credit line
  - track operator balances
  - emit on-chain borrow receipts
  - allow deployer-managed credit line updates in v0
```

### Off-chain

```
scripts/register-operator.ts
  - register contributor and borrower operators
  - link configured agent IDs to those operators

scripts/publish-fragment.ts
  - prepare fragment content
  - hash it
  - copy it into the served fragment set
  - publish metadata on-chain

scripts/borrow-fragment.ts
  - read fragment metadata
  - fetch off-chain content
  - verify hash before borrowing
  - submit the borrow tx
  - save a borrow receipt into borrows/

scripts/evaluate.ts
  - run baseline vs augmented A/B evaluation
  - prefer borrowed fragments when available
  - compute per-domain deltas
  - optionally submit on-chain reputation feedback

scripts/give-feedback.ts
  - push reputation-shaped feedback to the configured registry

scripts/extract-corrections.ts
  - extract correction fragments from Claude memory exports

scripts/extract-steering-corrections.ts
  - extract correction fragments from Codex steer events and corrective turns

scripts/sanitize-fragment.ts
  - strip or rewrite sensitive details before review

scripts/serve-fragments.ts
  - serve fragment files for local borrowing and dev flows
```

### Runtime artifacts

```
fragments/        - source and processed fragment markdown
borrows/          - runtime borrow receipts
eval/tasks.json   - locked evaluation tasks
eval/results/     - saved evaluation outputs
research/         - concept docs and background research
review/           - review artifacts and proposal docs
```

## Fragment lifecycle

```
1. Capture steering or correction signals
2. Extract candidate fragments
3. Sanitize and review them
4. Publish fragment metadata on-chain
5. Borrow and hash-verify content
6. Evaluate baseline vs augmented behavior
7. Submit reputation feedback and update the commons signal
```

This lifecycle is the center of the repo. If you are deciding between polishing peripheral features and strengthening this loop, strengthen this loop.

## Fresh clone setup

Prerequisites:

- Node 20+
- Foundry (`forge`, `cast`, `anvil`)

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/ainsleys/synthesis.git
cd synthesis
npm install
```

If the repo was cloned without submodules:

```bash
git submodule update --init --recursive
```

Verify the workspace:

```bash
npx tsc --noEmit
cd contracts
forge clean
forge test --offline -vv
```

Notes:

- Run `forge` from `contracts/`, not the repo root.
- `forge-std` is provided via submodule.
- `--offline` avoids a Foundry network-backed trace path that can crash before assertions run in some environments.

## Environment

Copy `.env.example` to `.env` and fill in the current deployment values.

Important variables:

- `RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `CONTRIBUTOR_PRIVATE_KEY`
- `BORROWER_PRIVATE_KEY`
- `MEMORY_LENDING_ADDRESS`
- `OPERATOR_REGISTRY_ADDRESS`
- `IDENTITY_REGISTRY`
- `REPUTATION_REGISTRY`
- `CONTRIBUTOR_OPERATOR_ID`
- `BORROWER_OPERATOR_ID`
- `CONTRIBUTOR_AGENT_ID`
- `BORROWER_AGENT_ID`
- `ANTHROPIC_API_KEY`

## Core workflows

### Register operators

```bash
npm run register-operator -- https://example.com/operator.json
```

This registers contributor and borrower operators from the configured wallets and prints the operator IDs to copy into `.env`.

### Publish, borrow, and evaluate

```bash
npm run serve
npm run publish-fragment -- fragments/feedback-logging-before-launch.md saas-engineering 1
npm run borrow-fragment -- 0
npm run evaluate
npm run evaluate -- --feedback
```

### Extract from Claude memory

```bash
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/ --dry-run
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/
npm run sanitize -- fragments/extracted/
```

### Extract from Codex steering

```bash
npm run extract-steering -- exports/thread.json --domain developer-tooling --dry-run
npm run extract-steering -- exports/ --domain developer-tooling
npm run sanitize -- fragments/extracted-codex/
```

Treat explicit steer-button events as the highest-quality correction signal when available.

## Documentation rules

When updating docs, README text, demo scripts, or submission material:

- Lead with the case-study claim: steering data is valuable and reusable.
- Make clear that the current end-to-end demo is about correction fragments.
- Frame the marketplace as agent-first and extensible, but do not imply that future asset classes are already implemented.
- Separate current implementation from target architecture whenever both appear in the same document.
- Prefer honest language like `the current demo shows`, `the current repo implements`, and `future extensions include`.

## Working norms

- Prefer small, verifiable loops over speculative mechanism design.
- If a change weakens the borrow -> evaluate -> feedback story, treat that as a serious regression.
- If a new doc or UI concept blurs the difference between proof, product direction, and future roadmap, tighten the framing.
- Keep fragments portable. The fragment format will likely evolve, but it should remain model-agnostic and source-agnostic.
- Favor evidence over elegance. Mixed or negative eval results are useful if they are honest.
