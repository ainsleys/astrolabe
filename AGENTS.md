# AGENTS.md

## What this project is

Astrolabe is a case study in sharing steering-derived correction fragments between agent operators, with a prototype exchange layer for attribution and measured impact.

The immediate demo is a case study:

- Human steering is valuable data for open-source scaffolding and agent workflows.
- That steering can be extracted from systems like Claude memories and Codex thread steering.
- The resulting correction fragments can be published, borrowed, evaluated, and attributed on-chain.

The broader product direction is larger than the demo. Correction fragments are the first asset class. Other agent-native exchanges, like task execution or reciprocal work commitments, may follow, but they are not the core demonstration in this repo today.

This is a hackathon project, not a production system.

## Claim hierarchy

Use three levels of claim consistently across docs, UI, and demos:

1. **Demonstrated here**
   - steering and correction signals can be turned into reusable fragments
   - some borrowed fragments measurably improve downstream tasks
   - the publish -> borrow -> evaluate -> attribute loop can be anchored on-chain
2. **Suggested by the demo**
   - correction fragments may be a viable agent-native exchange primitive
   - some corrections may transfer across model families
3. **Not yet proven**
   - a durable marketplace will form
   - reputation and credits are economically robust
   - the approach generalizes broadly across domains, operators, and models

## What the current repo demonstrates

Be precise when describing the project. The current codebase is best understood as demonstrating three things:

1. Steering and correction signals can be turned into reusable artifacts.
2. Borrowed correction fragments can sometimes improve downstream task performance.
3. An agent-native exchange loop can be scaffolded around those artifacts using operator identity, borrow receipts, evaluation, and reputation feedback.

Do not over-claim beyond that. The repo does not yet demonstrate a mature marketplace, a robust discovery system, or a durable reputation economy at scale.

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

**This is a case study first, a marketplace second.** The demo should foreground the claim that steering data can improve open-source scaffolding and adjacent agent tasks, supported by measured eval deltas. The marketplace layer exists to show how those artifacts could be exchanged, attributed, and rewarded.

**The marketplace is operator-first.** Agents are ephemeral. Operators persist. Publishing, borrowing, and balance accounting should accrue to operators, while agent-level ERC-8004 identity remains the canonical bridge for linked agents and reputation submission where required.

**Fragments are the current exchange primitive.** Steering-derived correction fragments are the thing this repo actually supports end to end. Task execution, compute commitments, or other agent-native goods are future extensions, not the present demonstration.

**The system uses a reciprocity ledger, not a token.** Credits are an internal accounting unit. They are not an asset, are not transferable, and are meant to encourage contribution back to the commons rather than to create speculation.

**Public goods with attribution, not paid access control.** The verify-before-pay flow means borrowers read content before paying. The micropayment compensates the contributor for labor that produced the correction, not for access to it. The analogy is tipping or citation royalties, not DRM.

**Inference-time augmentation, not training.** Borrowed corrections are prepended as context, not used for fine-tuning or RL. The structural analogy to RL still holds, but it operates at the context layer rather than in model weights.

**ERC-8004 identity is the trust anchor.** Agent IDs are verified on-chain through the canonical registry, and reputation is submitted through canonical ERC-8004 primitives even though the product narrative is operator-first. This is the basis for the trust and attribution story in the demo.

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
  - require a linked agent before borrowing
  - track operator balances
  - emit on-chain borrow receipts
  - derive credit line from a base allowance plus measured reputation
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
  - preflight linked-agent and credit eligibility
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
git clone --recurse-submodules https://github.com/ainsleys/astrolabe.git
cd astrolabe
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

Operators start with a base credit line of 5. Credit lines grow automatically as your corrections earn positive reputation from borrowers via the ERC-8004 Reputation Registry (`CREDIT_PER_REPUTATION = 2` per reputation point). There is no admin override.

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
- Use `demonstrates`, `suggests`, `initial evidence`, and `prototype` more often than `proves`.
- If a claim depends on future discovery, pricing, governance, or anti-Sybil layers, label it as product direction rather than current capability.
- Treat the extraction/sanitization/eval loop as the core product evidence; do not let marketplace language outrun that evidence.

## Current Base deployment

| Contract | Address | Chain |
|----------|---------|-------|
| OperatorRegistry | `0xA8d755a65Eb7db887Da0e89FCd42867D1c6c4Cd7` | Base |
| MemoryLending | `0x10c89c8f7991d72C7162EaC0CD272B75DB8EE469` | Base |
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Base (canonical) |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Base (canonical) |

| Identity | ID |
|----------|-----|
| Contributor agent | 35279 |
| Borrower agent | 35280 |
| Autonomous agent | 35601 |
| Contributor operator | 1 |
| Borrower operator | 2 |

## Eval results

### Repeated evaluation with confidence intervals

Single eval runs can't distinguish real effects from LLM judge variance. A cold concept review flagged this: "a skeptic can dismiss every result as judge variance." To address this, each task was run 5 times independently (`scripts/eval-repeated.ts`). Full results in `eval/results/repeated-eval.json`.

| Domain | Mean delta | 95% CI | Significant? |
|--------|-----------|--------|-------------|
| aquaculture | +1.93 | [+0.6, +3.3] | Yes |
| materials-science | +1.76 | [+1.1, +2.4] | Yes |
| saas-engineering | +0.13 | [-1.2, +1.5] | No |

7 of 9 individual tasks show statistically significant effects (6 positive, 1 negative). The service-integration-verification regression is the most consistent finding across all runs (mean -2.27, SD ±0.43, CI [-2.8, -1.7]) — corrections reliably hurt when the baseline is already strong. The current system records that negative evidence rather than hiding it.

The two non-significant tasks (carp breeding, WhatsApp debugging) have high variance across runs — the corrections sometimes help and sometimes don't, which the confidence interval honestly reflects.

### Cross-model evaluation via Venice

A cold concept review identified cross-model transfer as an important next test for the public correction layer thesis. To address this, the eval harness supports a `--venice` flag that routes all inference through Venice's no-data-retention API using Llama 3.3 70B instead of Claude Sonnet.

Results with corrections generated from Claude operator interactions, applied to Llama:

| Domain | Claude delta | Llama delta | Pattern matches? |
|--------|------------|-------------|-----------------|
| aquaculture | +1.93 | +1.4 | Yes |
| materials-science | +1.76 | +0.4 | Weaker but same direction |
| saas-engineering | +0.13 | +0.1 | Both near zero |

The service-integration-verification regression reproduces on Llama (-2.0 vs -2.27 on Claude) — the negative transfer is not model-specific but content-specific.

This provides initial evidence that corrections are transferable across model families, not just within Claude. The deltas are smaller on Llama (expected — corrections were authored in a Claude context), but the direction is consistent.

The Venice integration also adds a privacy property: fragment content is evaluated through a no-data-retention inference provider, meaning correction content is never persisted by the inference service.

## Known limitations

These are acknowledged gaps between the demo and a production system:

1. **Cross-model evaluation is preliminary.** Venice/Llama eval shows the same direction as Claude but with smaller deltas (single run, no confidence intervals). More rigorous cross-model testing with repeated trials would strengthen the evidence.

2. **Two-operator demo.** Both operators are controlled by the same developer. Multi-party dynamics (price discovery, adversarial behavior, Sybil resistance) are untested. A second independent operator would strengthen the demonstration.

4. **Borrower-run evaluation.** The borrower runs the eval and self-reports. A borrower could suppress negative results. The production path is an independent eval oracle, potentially in a TEE.

5. **No Sybil resistance.** An operator could register many identities to game the credit system. Production would need identity verification or staking.

6. **Content is readable before payment.** The verify-before-pay flow means the economic incentive to pay is reciprocity, not access control. This is intentional (public goods model) but means the system depends on long-term repeated interaction that a hackathon demo cannot demonstrate.

## Working norms

- Prefer small, verifiable loops over speculative mechanism design.
- If a change weakens the borrow -> evaluate -> feedback story, treat that as a serious regression.
- If a new doc or UI concept blurs the difference between proof, product direction, and future roadmap, tighten the framing.
- Keep fragments portable. The fragment format will likely evolve, but it should remain model-agnostic and source-agnostic.
- Favor evidence over elegance. Mixed or negative eval results are useful if they are honest.
