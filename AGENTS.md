# AGENTS.md

## What this project is

Lendable Agent Memory — a protocol for sharing operator corrections between AI agents, with on-chain attribution and compensation on Ethereum (Sepolia testnet).

The core thesis: when a human corrects an agent ("no, not that"), that correction is a transferable asset. Another agent facing a similar problem can borrow it, perform measurably better, and the original contributor gets paid and earns reputation.

This is a hackathon demo (Synthesis, ends 2026-03-22), not a production system.

## Design decisions

These are resolved positions, not open questions. Reference them when making implementation choices.

**Corrections are the signal.** Not all agent memory is worth sharing. `type: feedback` memories — human corrections of agent behavior — are the high-value subset. They are structurally analogous to preference pairs (what the agent did wrong → what the human wanted → why). The extraction pipeline filters for these specifically.

**Reputation is per contributor-within-domain.** Not per-fragment (too granular, insufficient signal per fragment) and not per-contributor (too coarse, mixes unrelated domains). A contributor's aquaculture reputation is independent of their SaaS reputation. The eval harness groups results by domain and submits one feedback tx per domain.

**Inference-time augmentation, not training.** Borrowed corrections are prepended as context, not used for fine-tuning or RL. The structural analogy to RL (correction → improved behavior) holds, but operates at the context layer. No weights are updated.

**Public goods with attribution, not paid access control.** The verify-before-pay flow means borrowers read content before paying. This is intentional. The micropayment compensates the contributor for labor that produced the correction, not for access to it. The analogy is tipping or citation royalties, not DRM.

**ERC-8004 compatible pattern, not live integration.** The Sepolia demo uses mock registries implementing the ERC-8004 interface (`ownerOf`, `giveFeedback`). The canonical ERC-8004 registries are not deployed on Sepolia. The contract and scripts would work unchanged against canonical registries. State this plainly in any submission or demo.

**Privacy requires human review.** `sanitize-fragment.ts` catches obvious PII (credentials, names, paths) via LLM review. But the most sensitive fragments are also the most valuable, and deciding what's safe to share requires human judgment. The review UI (`review/index.html`) exists for this purpose. Sanitization is a tool, not an enforcement boundary.

**Mixed eval results are honest results.** Fragments help where genuine knowledge gaps exist (aquaculture: +2.2 avg delta) and can hurt when the baseline is already strong (service-integration-verification: -3.0). This is why reputation scoring matters — contributors whose fragments consistently produce negative deltas accumulate low reputation.

## Architecture

```
contracts/src/MemoryLending.sol    — publish, borrow, deactivate fragments (on-chain)
contracts/src/Mock*.sol            — ERC-8004 mock registries (identity + reputation)
scripts/publish-fragment.ts        — hash content, publish on-chain
scripts/borrow-fragment.ts         — verify-before-pay, save borrow receipt
scripts/evaluate.ts                — A/B eval: baseline vs augmented, blind judge
scripts/give-feedback.ts           — submit reputation to ERC-8004
scripts/extract-corrections.ts     — scan Claude memory dir for type:feedback
scripts/sanitize-fragment.ts       — LLM-powered PII stripping
scripts/serve-fragments.ts         — local HTTP server for dev
scripts/lib/config.ts              — env loading, all ABIs
scripts/lib/wallet.ts              — viem client factories
scripts/lib/erc8004.ts             — identity check, giveFeedback wrapper
fragments/                         — memory fragment markdown files
borrows/                           — borrow receipts (gitignored, runtime artifact)
eval/tasks.json                    — locked benchmark tasks
eval/results/                      — eval output JSON files
research/                          — concept docs, background research (read-only)
```

## Setup from scratch

Prerequisites: Node 20+, Foundry (forge/cast/anvil).

```bash
# Clone with submodules (forge-std)
git clone --recurse-submodules https://github.com/ainsleys/synthesis.git
cd synthesis
npm install

# If already cloned without submodules:
git submodule update --init --recursive

# Verify
npx tsc --noEmit
cd contracts && forge test -vv && cd ..
```

### Foundry gotchas

- Always run `forge` from `contracts/`, not the repo root.
- `contracts/lib/forge-std` is a git submodule, gitignored locally. Without it, compilation fails on `forge-std/Test.sol`.
- If compilation crashes or behaves oddly: `cd contracts && forge clean && forge test`.
- `via_ir = true` is required because `MockReputationRegistry.giveFeedback` has 8 parameters (stack too deep without IR). This makes compilation slower (~4s vs <1s) but is necessary.

### Environment

Copy `.env.example` → `.env`. Key vars:

| Variable | Required for | Notes |
|----------|-------------|-------|
| `SEPOLIA_RPC_URL` | all on-chain scripts | Alchemy or Infura |
| `DEPLOYER_PRIVATE_KEY` | deploy | Also used as contributor |
| `CONTRIBUTOR_PRIVATE_KEY` | publish | Same as deployer in demo |
| `BORROWER_PRIVATE_KEY` | borrow, feedback | Separate wallet |
| `MEMORY_LENDING_ADDRESS` | all scripts | From Deploy.s.sol output |
| `IDENTITY_REGISTRY` | all scripts | Mock, from Deploy.s.sol output |
| `REPUTATION_REGISTRY` | give-feedback | Mock, from Deploy.s.sol output |
| `CONTRIBUTOR_AGENT_ID` | publish, feedback | From Deploy.s.sol output (1) |
| `BORROWER_AGENT_ID` | borrow, feedback | From Deploy.s.sol output (2) |
| `ANTHROPIC_API_KEY` | evaluate, sanitize | Claude API |

### Deploy (only if contracts changed)

```bash
cd contracts
source ../.env  # or: set -a && source ../.env && set +a
forge script script/Deploy.s.sol --rpc-url "$SEPOLIA_RPC_URL" --broadcast -vv
```

Prints addresses for `MockIdentityRegistry`, `MockReputationRegistry`, `MemoryLending`, and agent IDs. Paste into `.env`.

## Key flows

### Publish → Borrow → Evaluate → Feedback

```bash
# 1. Start fragment server (background)
npm run serve &

# 2. Publish a fragment
npm run publish-fragment -- fragments/feedback-logging-before-launch.md saas-engineering 0.001

# 3. Borrow it (saves receipt to borrows/)
npm run borrow-fragment -- 0

# 4. Evaluate (uses borrow receipts if available, else local fragments)
npm run evaluate

# 5. Evaluate + submit on-chain reputation (only for borrowed fragments)
npm run evaluate -- --feedback
```

### Extract corrections from Claude memory

```bash
# Dry run — see what would be extracted
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/ --dry-run

# Extract (writes to fragments/extracted/)
npm run extract -- ~/.claude/projects/YOUR-PROJECT/memory/

# Sanitize (writes to fragments/sanitized/)
npm run sanitize -- fragments/extracted/
```

## Contract details

`MemoryLending.sol` — single contract, no admin, no escrow.

- `publishFragment(contributorAgentId, contentHash, contentURI, domain, priceWei)` — verifies caller owns agent ID via identity registry
- `borrowFragment(fragmentId, borrowerAgentId)` payable — verifies caller owns agent ID, transfers ETH to contributor
- `deactivateFragment(fragmentId)` — contributor only
- `getFragment(fragmentId)` — view

Both `FragmentPublished` and `FragmentBorrowed` events include ERC-8004 agent IDs.

ERC-8004 identity check: `identityRegistry.ownerOf(agentId) == msg.sender` in both publish and borrow.

## Eval harness details

`evaluate.ts` runs A/B comparison:
1. For each task: generate response without fragments (baseline) and with fragments (augmented)
2. Randomize presentation order for the judge
3. Judge scores accuracy, specificity, actionability (1-10)
4. Per-domain delta computed; `--feedback` submits per-domain reputation scores

Fragment loading priority: borrow receipts (`borrows/*.json`) > local files (`fragments/*.md`). `--feedback` only fires for borrow-sourced fragments.

## Conventions

- Fragments are markdown with YAML frontmatter (domain, type, format fields)
- `type: feedback` memories are corrections — the high-value signal
- `type: project/user/reference` memories are context — lower transfer value
- Fragment filenames include a content hash prefix to prevent collisions
- All prices in wei, all agent IDs are uint256 ERC-8004 token IDs
- `.env` is gitignored; never commit secrets

## Current Sepolia deployment

| Contract | Address |
|----------|---------|
| MockIdentityRegistry | `0xccF3366cE323236e3b7905396fE30058A1B801e1` |
| MockReputationRegistry | `0xb831Be94a83B581855B2802dE85E3f34aC4F5Fc2` |
| MemoryLending | `0x7d817358A7eaCEB745A1Bb4C83dBE1123B46545D` |

Contributor agent ID: 1, Borrower agent ID: 2.

These are mock ERC-8004 registries — the canonical registries are not deployed on Sepolia.
