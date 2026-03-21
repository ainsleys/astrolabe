# Lendable Agent Memory — v5: Product Design

## One-liner

Agents borrow corrections from other agents' operators, tracked by a credit system that rewards reciprocity. On-chain receipts on Base with ERC-8004 identity.

---

## What changed from v4

v4 established corrections as the signal and explored three compute commitment models. v5 collapses those into a single design: a **credit/debt envelope** that enables a favor economy between operators. No ETH payments, no bilateral commitments, no token. Just a ledger of contributions and borrows with reputation-driven credit lines.

---

## Core concepts

### Operators, not agents

An **operator** is the persistent identity behind one or more agents. An operator registers once, links their agent IDs, and all activity — contributions, borrows, reputation — accrues to the operator.

Self-owned agents (autonomous systems with no human) register as their own operator. The system doesn't distinguish; it just tracks the operator identity.

Why operators and not agents: agents are ephemeral (a Claude Code session, a Cursor tab, an autoresearch run). The operator persists. Corrections carry the operator's expertise, not the agent instance's. Reputation should reflect the operator's track record, not any single session's.

### Corrections as the signal

Not all agent memory is worth sharing. `type: feedback` memories — human corrections of agent behavior — are the high-value subset. They are structurally preference pairs: what the agent did wrong → what the human wanted → why.

The extraction pipeline filters for corrections specifically. Everything else stays private by default.

### The credit envelope

Every operator has a **balance** in the system: contributions minus borrows, denominated in an internal unit (credits). Credits are not a token — they're not transferable, not tradeable, not accumulable as an asset. They're a ledger entry tracking whether you're a net contributor or net consumer.

**How it works:**

- Each fragment has a **price** set by the contributor in credits. This is the contributor's assessment of the correction's value.
- When you borrow a fragment, your balance decreases by the fragment's price.
- When someone borrows your fragment, your balance increases by the fragment's price.
- Your balance can go negative, up to your **credit line**.

**Credit lines:**

- Every new operator starts with a **starter credit** — enough to borrow 3-5 corrections before contributing anything. This solves cold start: you can experience the system before you have anything to give back.
- Your credit line grows with your **reputation score**. High-reputation operators (whose corrections consistently produce positive deltas for borrowers) get larger credit lines.
- Long-standing negative balance without contributions gradually reduces your credit line. You're not punished — you just lose borrowing capacity until you contribute back.

**What this is not:**

- Not a currency. Credits don't leave the system, can't be traded, can't be sold.
- Not bilateral debt. You don't owe a specific counterparty. You owe the commons.
- Not a paywall. The system defaults to sharing. The credit line is a gentle nudge toward reciprocity, not a gate.

The analogy is a library card. You borrow books, you return books. If you're reliable, your checkout limit goes up. If you never return anything, your card gets restricted. Nobody is trying to accumulate library cards.

### Reputation

Reputation accrues to operators, scoped by domain.

**How reputation is earned:**

1. Operator publishes correction fragments
2. Another operator borrows them and runs the eval harness
3. Eval measures the delta: did the correction improve the borrowing agent's performance?
4. Delta score is submitted on-chain as reputation feedback (via ERC-8004 `giveFeedback`)
5. The contributor's reputation in that domain reflects aggregate measured improvement

**What reputation does:**

- Determines credit line size (higher reputation → more borrowing capacity)
- Signals quality to borrowers (filter fragments by contributor reputation)
- Could influence fragment visibility/ranking in discovery (future)

**What reputation does not do:**

- It does not determine price. Contributors set their own prices.
- It does not create social hierarchy. It's a functional signal, not a status marker.

---

## System architecture

### On-chain (Base, canonical ERC-8004)

```
OperatorRegistry.sol (new)
├── registerOperator(operatorURI) → operatorId
├── linkAgent(operatorId, agentId)  // verified via identityRegistry.ownerOf
├── getOperator(operatorId) → Operator
└── getOperatorByAgent(agentId) → operatorId

MemoryLending.sol (modified)
├── publishFragment(operatorId, contentHash, contentURI, domain, priceCredits) → fragmentId
├── borrowFragment(fragmentId, borrowerOperatorId)  // not payable, checks credit line
├── deactivateFragment(fragmentId)
├── getFragment(fragmentId) → Fragment
├── getBalance(operatorId) → int256
├── getCreditLine(operatorId) → uint256
└── setCreditLine(operatorId, newLimit)  // only callable by reputation oracle or governance

ERC-8004 Identity Registry (canonical, Base)
├── ownerOf(agentId)
└── agentURI(agentId)

ERC-8004 Reputation Registry (canonical, Base)
└── giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)
```

### Off-chain (TypeScript)

```
scripts/
├── register-operator.ts        — register operator, link agent IDs
├── publish-fragment.ts          — extract → sanitize → hash → publish on-chain
├── borrow-fragment.ts           — check credit line → fetch → verify hash → borrow on-chain → save receipt
├── evaluate.ts                  — A/B eval with blind judge, per-domain delta
├── give-feedback.ts             — submit eval delta as reputation on ERC-8004
├── extract-corrections.ts       — scan Claude memory dir for type:feedback
├── sanitize-fragment.ts         — LLM-powered PII stripping
├── serve-fragments.ts           — local HTTP server for dev
└── lib/
    ├── config.ts
    ├── wallet.ts
    └── erc8004.ts
```

### Fragment lifecycle

```
1. EXTRACT    — scan memory dir, filter type:feedback, score by correction signal
2. SANITIZE   — LLM strips PII, human reviews output (mandatory)
3. PUBLISH    — hash content, publish metadata on-chain (operatorId, contentHash, domain, price)
4. DISCOVER   — borrower finds relevant fragments (by domain, contributor reputation)
5. BORROW     — fetch content, verify hash, record borrow on-chain (credit deducted)
6. EVALUATE   — run A/B harness: baseline vs augmented, blind judge, measure delta
7. FEEDBACK   — submit delta as reputation on ERC-8004 (per domain)
```

---

## Contract design

### OperatorRegistry.sol

```solidity
struct Operator {
    address owner;
    string  operatorURI;       // profile, domains of expertise
    uint256 registeredAt;
}

// Storage
mapping(uint256 => Operator) public operators;       // operatorId → Operator
mapping(uint256 => uint256) public agentToOperator;  // agentId → operatorId
mapping(uint256 => uint256[]) public operatorAgents; // operatorId → agentId[]
uint256 public nextOperatorId;

// Functions
function registerOperator(string calldata operatorURI) external returns (uint256 operatorId);
function linkAgent(uint256 operatorId, uint256 agentId) external;
    // requires: identityRegistry.ownerOf(agentId) == msg.sender
    // requires: operators[operatorId].owner == msg.sender
function getOperator(uint256 operatorId) external view returns (Operator memory);
function getOperatorByAgent(uint256 agentId) external view returns (uint256 operatorId);
```

### MemoryLending.sol (modified)

```solidity
struct Fragment {
    uint256 operatorId;          // contributor operator (not just agentId)
    address contributor;         // payment address (kept for potential future ETH tips)
    bytes32 contentHash;
    string  contentURI;
    string  domain;
    uint256 priceCredits;        // internal credit units, not wei
    uint256 createdAt;
    bool    active;
}

// Credit accounting
mapping(uint256 => int256) public balances;       // operatorId → net balance (can be negative)
mapping(uint256 => uint256) public creditLines;   // operatorId → max negative balance allowed

uint256 public constant BASE_CREDIT_LINE = 5;     // starter credit for new operators
uint256 public constant CREDIT_PER_REPUTATION = 2; // additional credit per reputation point

// Events
event FragmentPublished(
    uint256 indexed fragmentId,
    uint256 indexed operatorId,
    bytes32 contentHash,
    string domain,
    uint256 priceCredits
);

event FragmentBorrowed(
    uint256 indexed fragmentId,
    uint256 indexed borrowerOperatorId,
    uint256 indexed contributorOperatorId,
    uint256 priceCredits,
    bytes32 contentHash
);

// Functions
function publishFragment(
    uint256 operatorId,
    bytes32 contentHash,
    string calldata contentURI,
    string calldata domain,
    uint256 priceCredits
) external returns (uint256 fragmentId);
    // requires: caller is operator owner (via OperatorRegistry)
    // no balance change on publish — balance changes when someone borrows

function borrowFragment(
    uint256 fragmentId,
    uint256 borrowerOperatorId
) external;
    // requires: caller is borrower operator owner
    // requires: balances[borrowerOperatorId] - priceCredits >= -creditLines[borrowerOperatorId]
    // effects: balances[borrowerOperatorId] -= priceCredits
    // effects: balances[contributorOperatorId] += priceCredits
    // emits: FragmentBorrowed

function getBalance(uint256 operatorId) external view returns (int256);
function getCreditLine(uint256 operatorId) external view returns (uint256);
```

### Credit line management

Credit lines start at `BASE_CREDIT_LINE` for every new operator. They increase based on reputation:

```solidity
function effectiveCreditLine(uint256 operatorId) public view returns (uint256) {
    return BASE_CREDIT_LINE + (reputationScores[operatorId] * CREDIT_PER_REPUTATION);
}
```

Reputation scores are updated when `giveFeedback` is called. The contract can either:
- Read directly from the ERC-8004 reputation registry (if it exposes `getSummary`)
- Accept reputation updates from a trusted oracle / the eval script

For v0, the simpler path: the eval script calls `updateCreditLine(operatorId, newLimit)` after submitting reputation feedback. This is a trusted-caller pattern, not fully decentralized, but honest for a demo.

---

## Pricing model

### What are credits?

Credits are an internal accounting unit. They are not:
- An ERC-20 token (not transferable, not tradeable)
- ETH or any real currency
- Accumulable as an asset (no reason to hoard them beyond your borrowing needs)

Credits measure **relative contribution to the correction commons**. A positive balance means you've contributed more than you've consumed. A negative balance means the reverse. The credit line determines how negative you can go.

### How contributors price fragments

Contributors set a credit price when publishing. There's no formula — it's the contributor's assessment of value. Guidelines:

- A simple, narrow correction ("log at API boundaries before launch"): 1-2 credits
- A detailed domain correction with methodology and traps ("FCR normalization across Norwegian and Chilean salmon research"): 3-5 credits
- A deep, multi-part domain expertise fragment with confidence notes: 5-10 credits

The market will self-correct: if a contributor prices too high, nobody borrows. If they price too low, they get lots of borrows but their credit gains are small. Reputation (from measured deltas) is the real signal, not price.

### Starter credit

Every new operator gets `BASE_CREDIT_LINE` (default: 5 credits) to borrow with before contributing anything. This is a gift from the commons, paid back through future contributions.

A new operator can:
- Borrow 5 × 1-credit fragments, or
- Borrow 1 × 5-credit fragment, or
- Any combination up to 5 credits of negative balance

After borrowing, their balance is negative. To borrow more, they need to either:
- Contribute corrections that others borrow (balance goes up)
- Earn reputation that extends their credit line

### Credit decay (future consideration)

Should long-standing debt decay? Options:
- No decay: debt is permanent until repaid through contributions. Simple, maybe too harsh.
- Slow decay: debt reduces by 1 credit per month. Prevents permanent lockout from a bad early experience.
- Reputation-gated decay: debt only decays if reputation is above a threshold. Prevents gaming.

For v0: no decay. Keep it simple.

---

## Eval harness

Unchanged from v4. A/B comparison with blind judge:

1. For each task: generate response without fragments (baseline) and with fragments (augmented)
2. Randomize presentation order to prevent position bias
3. Judge scores accuracy, specificity, actionability (1-10 each)
4. Compute delta per domain
5. Map delta to reputation score: `score = clamp(5 + delta, 1, 10)`
6. Submit per-domain via `giveFeedback()` on ERC-8004

The eval harness is the enforcement mechanism for the entire system. Without it, reputation is meaningless and credit lines are arbitrary. The eval proves that corrections actually help (or hurt), and that proof feeds into the credit system.

### When does eval run?

Borrower-run for v0. The borrower has incentive to run eval because they want to know if the correction helped. They can suppress negative results, but:
- Not running eval means no reputation accrual for the contributor
- Contributors with no reputation data have small credit lines and low visibility
- So suppressing results hurts contributors, which means fewer contributions, which hurts the borrower in the long run

The incentive alignment isn't perfect but it's good enough for v0. Future: independent eval oracle, potentially in a TEE.

---

## Migration plan: Sepolia → Base

### What changes

| Component | Sepolia (current) | Base (target) |
|-----------|-------------------|---------------|
| MemoryLending.sol | Deployed, ETH payment model | Redeploy with credit model + operator support |
| Identity Registry | Mock (`0xccF3...`) | Canonical ERC-8004 (`0x8004A1...`) |
| Reputation Registry | Mock (`0xb831...`) | Canonical ERC-8004 (`0x8004BA...`) |
| OperatorRegistry.sol | Does not exist | New deployment |
| Agent registration | Mock `registerAgent()` | Canonical registry |
| Chain config | `sepolia` in wallet.ts | `base` in wallet.ts |

### Pre-migration checklist

1. Verify canonical ERC-8004 addresses on Base
   ```bash
   cast code 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 --rpc-url $BASE_RPC_URL
   cast code 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 --rpc-url $BASE_RPC_URL
   ```

2. Fund deployer wallet on Base (need ETH for gas — Base L2 gas is fractions of a cent)

3. Understand canonical registry's `registerAgent` function signature (may differ from our mock)

### New contracts to write

```
contracts/src/OperatorRegistry.sol       — new
contracts/src/MemoryLending.sol          — rewrite (credit model, operatorId, no payable)
contracts/src/interfaces/IOperatorRegistry.sol — new interface
contracts/test/MemoryLending.t.sol       — rewrite tests for credit model
contracts/test/OperatorRegistry.t.sol    — new tests
contracts/script/DeployBase.s.sol        — new deploy script for Base
```

### Script changes

```
scripts/register-operator.ts             — new (register operator, link agents)
scripts/lib/config.ts                    — add operator registry ABI, update chain
scripts/lib/wallet.ts                    — change from sepolia to base
scripts/publish-fragment.ts              — use operatorId instead of agentId, priceCredits instead of priceWei
scripts/borrow-fragment.ts              — remove ETH payment, add credit line check display
scripts/evaluate.ts                      — minor (operatorId in evidence)
scripts/give-feedback.ts                 — minor
```

### Migration steps

1. Write and test new contracts locally (`forge test`)
2. Update TypeScript for Base chain + operator model + credit accounting
3. Verify ERC-8004 on Base
4. Deploy OperatorRegistry + MemoryLending to Base
5. Register operator on canonical Identity Registry
6. Link agent IDs to operator
7. Publish fragments (with credit prices)
8. Borrow fragments (credit deducted)
9. Run eval → submit reputation feedback
10. Verify credit balances reflect the borrow/contribute ledger

### What the registered agent needs to do

The hackathon registration was done by a different agent. For submission:
- Prep all code, commit to GitHub
- The registered agent handles the Devfolio submission
- If the deployment must come from the registered agent's address, we prepare the deploy script and the agent runs it

---

## Submission framing

### Primary target: Protocol Labs "Agents With Receipts" ($8,004)

> "Trusted agent systems using ERC-8004 identity, reputation, and validation registries. Must show onchain verifiability via real transactions."

We show:
- Operators register with canonical ERC-8004 identity on Base
- Corrections are published with content hash and operator ID on-chain
- Borrows create permanent receipts with both operator IDs
- Eval measures improvement; delta feeds into ERC-8004 reputation
- Credit balances are on-chain, derived from real borrow/publish transactions
- Everything is verifiable from events alone

### Secondary: Synthesis Open Track ($14,500)

Cross-theme alignment:
- **Agents that Trust**: empirical reputation from measured deltas, canonical ERC-8004 identity
- **Agents that Cooperate**: credit envelope enables reciprocal correction sharing without bilateral negotiation
- **Agents that Pay**: credit system is a transparent, enforceable spending scope for agent knowledge consumption

### What the demo shows

1. Extract corrections from real agent memory (Claude Code `type: feedback` memories)
2. Sanitize (LLM strips PII, human reviews)
3. Publish on-chain with credit price
4. Borrow on-chain (credit deducted from borrower, credited to contributor)
5. Run eval: baseline vs augmented, blind judge, measured delta
6. Submit reputation feedback on-chain
7. Show credit balances reflecting the flow
8. Show that corrections measurably improved agent performance in some domains and honestly didn't in others

### What the demo does NOT claim

- This is not a production marketplace
- Credit pricing is not market-optimized
- Reputation is not Sybil-resistant at scale
- Privacy depends on human review, not technical enforcement
- The eval harness uses LLM-as-judge, which is a noisy proxy for quality
- Mixed eval results (some positive, some negative) are honest findings, not a failure

---

## Open questions (documented, not blocking)

1. **Credit line formula tuning**: `BASE_CREDIT_LINE + (reputation * multiplier)` — what are the right constants? Needs real usage data.

2. **Fragment discovery**: currently manual (browse fragments by domain). Future: searchable index, recommendation based on task similarity.

3. **Cross-model transfer**: corrections from a Claude operator may not help a Llama agent equally. Untested.

4. **Credit decay**: should long-standing debt decay? Probably yes, but the parameters need usage data.

5. **Eval oracle**: borrower-run eval is honest enough for v0 but not trustless. TEE-based eval oracle is the production path.

6. **Compute commitment (v1)**: the credit system tracks borrow/contribute balance. A future version could add explicit work commitments — "I'll run a research task for you" — with fulfillment tracking on-chain. See v4 concept doc for the bilateral and pool models.

7. **Agent-level reputation**: currently operator-only. Should individual agent IDs within an operator also carry reputation? Deferred — operator accountability is sufficient for v0.
