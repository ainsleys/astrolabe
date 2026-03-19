# On-Chain Agent Identity, Receipts, and Payment Infrastructure

**Date:** 2026-03-19

## ERC-8004: Trustless Agents

**Status:** Draft ERC, deployed to mainnet Jan 29 2026 across 30+ chains (Ethereum, Base, Celo, Arbitrum, Optimism, Polygon).

**Three registries:**
1. **Identity Registry** (ERC-721): Agent mints NFT identity with URI → agent registration file (name, description, services, x402Support). Can set separate wallet via `setAgentWallet()`.
2. **Reputation Registry**: Anyone calls `giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)`. Bounded scores on-chain, feedbackURI points to off-chain evidence. Revocable. `getSummary()` returns aggregates.
3. **Validation Registry**: Third-party validators submit 0-100 scores with tags.

**Deployed addresses (same on multiple chains):**
- IdentityRegistry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Authors:** MetaMask, Ethereum Foundation, Google, Coinbase people. The Graph has backed it.

**For our project:** Register borrower/contributor agents → use `giveFeedback()` after each memory transaction with tags like `"memory-lend"` and feedbackURI → decentralized reputation for free.

## ERC-8183: Agentic Commerce (Programmable Escrow)

**Status:** Submitted March 10 2026 by Virtuals Protocol + EF dAI team. Very new.

**Core primitive — a Job:** Client (borrower) → Provider (contributor) → Evaluator (neutral judge).
**State machine:** Open → Funded → Submitted → Terminal (Completed/Rejected/Expired).
**Functions:** createJob, fund (ERC-20 escrow), submit (bytes32 deliverable reference), complete (releases funds), reject (refunds).
**Hooks:** Optional extension contracts for reputation updates, bidding, payment splits.

**For our project:** Could model memory-lending as a Job. But it's 9 days old with no production deployment. Adds complexity vs simpler approaches.

## x402 (Coinbase): HTTP Payment Protocol

**How it works:** Client sends HTTP request → server returns 402 with payment instructions → client signs ERC-20 permit → retries with payment header → server verifies/settles → returns 200 with settlement proof.

**Networks:** Base, Polygon, Solana. Any ERC-20 via Permit2.
**Schemes:** `exact` (fixed per request) or `upto` (variable with cap).
**SDKs:** TypeScript, Python, Go, Java. One middleware line in Express.
**Facilitator:** Coinbase CDP hosts free (1K tx/month, then $0.001/tx).

**For our project:** Most natural fit. Memory fragments behind HTTP API, protected by x402. Borrowing agents pay USDC on Base per fragment. No accounts, no API keys. `npm install @x402/express`.

**THE most hackathon-ready component.**

## Agent Wallets

- **Coinbase Agentic Wallets** (Feb 2026): Base-only. "First wallet in 2 minutes." CLI tool `awal`. Built-in x402 support. Keys never exposed to LLM. Gasless swaps.
- **Coinbase AgentKit**: Framework-agnostic, multi-chain. `npm create onchain-agent@latest`.
- **World AgentKit** (March 17 2026): x402 + World ID for proof-of-humanity behind agents.

## Other Relevant Infrastructure

- **Google A2A**: Cross-framework agent communication. ERC-8004 designed as trustless extension of A2A.
- **MCP (Anthropic)**: Memory retrieval could be exposed as MCP tool.
- **The Graph + x402**: x402-compliant subgraph gateway coming Q2 2026. GraphTally voucher pattern (sign now, settle later) applicable to high-frequency memory queries.
- **OriginTrail DKG**: 1.32B+ knowledge assets. Agents store memories as knowledge assets in "paranets." Closest existing project to lendable memory but focused on structured knowledge.

## Recommended Hackathon Stack

| Layer | Technology | Time |
|-------|-----------|------|
| Agent Identity | ERC-8004 (already deployed on Base) | 1 hour |
| Payment | x402 on Base with USDC | 2 hours |
| Agent Wallet | Coinbase Agentic Wallet | 30 min |
| On-Chain Receipts | Custom event-emitting contract on Base Sepolia | 1 hour |
| Reputation | ERC-8004 Reputation Registry | 2 hours |
| Memory Storage | Off-chain (IPFS or plain HTTP) | As needed |

Hits Synthesis tracks 1 (Pay), 2 (Trust), 3 (Cooperate). Qualifies for Base and potentially Celo bounties.
