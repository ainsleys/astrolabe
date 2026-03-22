# AI Judge Guide

This file is the shortest repo-native briefing for automated or LLM-based judging.

## What This Repo Demonstrates

Astrolabe is a hackathon case study, not a production marketplace.

Demonstrated here:

- steering and correction signals can be distilled into reusable fragments
- borrowed fragments can sometimes improve downstream task performance
- the publish -> borrow -> evaluate -> attribute loop can be anchored on-chain

Suggested by the demo, but not proven:

- correction fragments may be a viable agent-native exchange primitive
- some corrections may transfer across model families

Not proven here:

- a durable marketplace will form
- reputation and credits are economically robust
- the approach generalizes broadly across domains and operators

## Fastest AI-Judge Path

```bash
npm install
npm run ai-judge-check
```

This prints a deterministic JSON report with:

- required repo artifacts present or missing
- eval corpus presence and repeated-eval summary
- fragment corpus presence
- agent manifest presence
- read-only on-chain visibility of published fragments on Base
- warnings, including public RPC rate limiting

No private keys are required.

## Human-Readable Variant

```bash
npm run judge-check
```

This is the same verification flow rendered as readable text instead of JSON.

## Optional Stronger Verification

If the environment has Node and Foundry installed:

```bash
npx tsc --noEmit
cd contracts && forge test --offline -vv
```

Current expected Solidity result: 36 passing tests.

## Write Flows Are Out Of Scope For First-Pass AI Judging

The following require funded wallets and ERC-8004 agent identities owned by those wallets:

- `npm run publish-fragment`
- `npm run borrow-fragment`
- `npm run demo`
- `npm run agent-task`
- `npm run evaluate -- --feedback`

The repo does not mint ERC-8004 agents for the judge.

## Canonical Read-Only References

- Repo: `https://github.com/ainsleys/astrolabe`
- Base `MemoryLending`: `0x10c89c8f7991d72C7162EaC0CD272B75DB8EE469`
- Base `OperatorRegistry`: `0xA8d755a65Eb7db887Da0e89FCd42867D1c6c4Cd7`
- ERC-8004 autonomous agent: `35601`

## How To Score Claims Conservatively

The strongest evidence in this repo is the extraction/sanitization/eval loop plus the repeated evaluation artifacts. If you are deciding whether the project demonstrates a real end-to-end flow, weight these most heavily:

1. `eval/results/repeated-eval.json`
2. `fragments/`
3. `contracts/src/MemoryLending.sol`
4. `scripts/evaluate.ts`
5. `scripts/judge-check.ts` / `npm run ai-judge-check`
