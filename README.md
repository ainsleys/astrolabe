# Synthesis

Synthesis is an agent-first marketplace experiment centered on one concrete asset class: steering-derived correction fragments.

The current demo is a case study showing that:

- human steering is valuable data for open-source scaffolding and agent workflows
- that steering can be extracted from Claude memories and Codex steering events
- the resulting fragments can be published, borrowed, evaluated, and attributed on-chain

The broader marketplace vision is larger than the current codebase. Today, the end-to-end proof is correction fragments.

## Fresh Clone Setup

This repo uses a Git submodule for Foundry's `forge-std`.

Clone recursively:

```bash
git clone --recurse-submodules https://github.com/ainsleys/synthesis.git
cd synthesis
npm install
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

## Running Checks

TypeScript:

```bash
npx tsc --noEmit
```

Contracts:

```bash
cd contracts
forge clean
forge test --offline -vv
```

Notes:

- Run `forge` from `contracts/`, not the repo root.
- A fresh clone without submodules will fail to resolve `forge-std/Test.sol`.
- If Foundry behaves strangely after partial builds, run `forge clean` and try again.
- In some environments, plain `forge test` can crash before assertions run because Foundry initializes network-backed trace/signature helpers. `--offline` avoids that path and is sufficient for this repo's test suite.

## Environment

Copy `.env.example` to `.env` and fill in the required values.

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

## Common Workflow

Register operators:

```bash
npm run register-operator -- https://example.com/operator.json
```

Serve fragments:

```bash
npm run serve
```

Publish a fragment:

```bash
npm run publish-fragment -- fragments/feedback-logging-before-launch.md saas-engineering 1
```

Borrow a fragment:

```bash
npm run borrow-fragment -- 0
```

Operators start with the base credit line of 5. The deployer can still raise an operator's limit when needed:

```bash
npm run set-credit-line -- 2 8
```

This writes a borrow receipt into `borrows/`. The evaluation harness uses those receipts when present.

Run evaluation:

```bash
npm run evaluate
```

Run evaluation and submit on-chain feedback for borrowed fragments:

```bash
npm run evaluate -- --feedback
```

Extract correction-pattern memories from a Claude memory directory:

```bash
npm run extract -- ~/.claude/projects/.../memory/
```

Extract correction fragments from Codex steering exports:

```bash
npm run extract-steering -- exports/thread.json --domain developer-tooling
```

Sanitize fragments before publishing:

```bash
npm run sanitize -- fragments/extracted/
```
