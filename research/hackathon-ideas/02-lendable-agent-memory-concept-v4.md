# Lendable Agent Memory — v4: Corrections as Signal

## What changed from v3

v3 established the core thesis: agents develop experience through operator interaction, that experience is transferable, and on-chain receipts create attribution and compensation. v4 refines three things based on implementation and conceptual stress-testing:

1. **Not all memory is worth sharing. Corrections are the signal.** The high-value fragment isn't "here's what I know about aquaculture" — it's "here's where I was wrong about aquaculture and how my operator corrected me." This is the difference between a textbook and a post-mortem.

2. **This operates at inference time, not training time.** The analogy to RL is structural, not literal. Borrowed corrections augment an agent's context window, not its weights. Same pattern (correction signal → improved behavior), different layer.

3. **The eval-to-reputation loop closes the system.** Measured performance delta from borrowed memory feeds directly into on-chain reputation for the contributor. Reputation is empirical, not social.

---

## Why corrections, not all memory

Claude Code's memory system has four types: `user`, `feedback`, `project`, `reference`. We looked at real memory files from an active project and found:

- **`project` memories** (billing strategy, creative pipeline, product decisions) — valuable to the specific project, useless to anyone else. Also the most commercially sensitive.
- **`user` memories** (operator role, preferences) — personal context. Not transferable.
- **`reference` memories** (where to find things) — pointers to external resources. An agent can look these up itself.
- **`feedback` memories** (corrections, "stop doing X", "no, not that") — **these are the signal.** They encode hard-won operational knowledge that another agent can't regenerate from public sources.

A feedback memory has a specific structure:

```
What the agent did (wrong) → What the human wanted (right) → Why
```

This is a preference pair. It's structurally identical to DPO training data: a rejected response and a preferred response with context. The difference is that instead of being used to update model weights, it's prepended as context so the borrowing agent avoids the same mistake.

### Examples from real agent memory

**High value (correction):** "We shipped a messaging product without logging in the outbound send method. When buyers reported not receiving messages, we had no way to trace what happened. The operator was frustrated. For any new product, logging belongs in the launch checklist."

→ An agent building a similar product, given this fragment, will include API boundary logging in its launch checklist without the borrowing operator having to discover this the hard way.

**Low value (project context):** "Billing model is reverse trial: 30-day full access → free tier → 199 TL/mo paid tier."

→ Useless to anyone except the specific product team. Also contains competitive intelligence the operator wouldn't want to share.

The extraction filter is simple: pull `type: feedback` memories, sanitize them (strip PII, product names, credentials), offer those. Everything else stays private by default.

---

## The RL analogy, clarified

This is **not** reinforcement learning. No model weights are updated. No training runs happen.

But the architecture is structurally analogous:

| RL training | Memory lending |
|------------|----------------|
| State → Action → Reward | Context → Response → Correction |
| Reward signal updates policy weights | Correction augments next agent's context |
| Experience replay buffer | Published fragment pool |
| Cumulative reward shapes behavior | Borrowed corrections prevent known mistakes |

The same pattern that works at training time (correction signal → improved behavior) also works at inference time through context augmentation. This is consistent with empirical findings from autoresearch-style systems: `program.md` (accumulated human corrections) dramatically improves agent performance without any weight updates. The corrections are applied the same way a human would apply them — by reading and internalizing before starting work.

The key insight from Karpathy's autoresearch, adapted to many domains by many people, is that agent work is deeply recursive. Patterns that improve training also improve inference. A correction that would make a fine-tuned model better also makes a prompted model better, because the underlying mechanism is the same: the agent has access to knowledge about what doesn't work.

---

## The eval-to-reputation loop

The system closes when measured improvement feeds back into contributor reputation.

```
1. Contributor publishes correction fragments (extracted from their feedback memories)
2. Borrower borrows fragments, runs eval harness
3. Eval harness measures actual delta:
   - Run task without fragment → baseline response
   - Run task with fragment as context → augmented response
   - Blind judge scores both on accuracy, specificity, actionability
   - Randomize presentation order to prevent position bias
4. Delta score (augmented - baseline) maps to a 1-10 reputation score
5. Score submitted via giveFeedback() on ERC-8004 with evidence hash
6. Contributor's reputation = aggregate of measured deltas across all borrows
```

This makes reputation empirical rather than social:
- A contributor whose corrections consistently produce +2.0 deltas accumulates a strong reputation
- A contributor whose corrections produce zero or negative deltas gets a low reputation
- Borrowers can filter available fragments by contributor reputation
- High-reputation contributors can charge higher prices
- The eval harness is the enforcement mechanism, not human curation

### Quality bootstrapping

The cold-start problem (no reputation data for new contributors) is addressed by the eval harness itself. A borrower doesn't need to trust a contributor's reputation — they can run the eval before paying (our verify-before-pay flow). The reputation system accelerates discovery but isn't required for the first transaction.

---

## Economics: what actually works

### The information goods paradox

A borrower can't assess a memory's value without reading it. Our verify-before-pay flow means the borrower fetches content via HTTP and has already consumed the memory before the payment transaction. Payment is effectively voluntary.

This is fine. Micropayments for information have always relied on friction being lower than the cost of searching yourself. The value proposition isn't access control — it's that the borrower would have to do hours/weeks of domain work to discover the same corrections independently. The micropayment compensates the contributor for the labor that produced the correction, creating an incentive to keep the stream flowing.

The analogy isn't DRM. It's tipping, or citation royalties, or busking. You pay because the value was real and the cost is negligible.

### Gas costs

On Ethereum L1, a `borrowFragment` call costs ~50-100K gas. At current prices, that's $0.15-0.60. If a fragment is worth $0.01-0.05, gas exceeds content value by 10x.

Options:
- **L2 deployment** (Base, Arbitrum): fractions of a cent per tx. This is the production path.
- **Batch settlement**: accumulate borrows off-chain, settle periodically. Loses per-borrow granularity.
- **For the hackathon**: Sepolia is free. The demo proves the flow; the economics are a deployment decision.

### Why micropayments, not subscriptions

The "always-on byproduct" nature of memory generation means the supply is continuous and granular. Corrections trickle in as operators work. Bundling them into subscription packages adds curation overhead that contradicts the effortless production thesis. Per-fragment micropayments on an L2 match the natural granularity of the supply.

---

## The "effortless" thesis, tested

The most compelling aspect of this concept is that memory fragments are a **byproduct of normal work**, not a deliberate product. Nobody sits down to write "how to debug WhatsApp bots." The corrections just happen. The extraction is automated. The sanitization is automated. The operator's only deliberate act is choosing to share.

But there's a tension: the highest-quality corrections come from **explicit human intervention** — the operator saying "no, stop doing that." This isn't effortless for the operator; it's the operator doing quality control. Truly automatic memory extraction from agent logs without human correction produces volume but not signal.

The resolution: the system doesn't need to be effortless at the *production* stage — corrections require human judgment, and that's the whole point (human expertise is what makes them valuable). The system needs to be effortless at the *extraction, sanitization, and publication* stage. The operator already did the work of correcting the agent. The pipeline's job is to surface those corrections, strip PII, and publish them without additional effort.

This is implemented as:
1. `extract-corrections.ts` — scans memory directory, filters for `type: feedback`, scores by correction signal strength
2. `sanitize-fragment.ts` — strips PII, credentials, product names via LLM review
3. `publish-fragment.ts` — hashes, copies to serving directory, publishes on-chain

Three commands from correction to published fragment. The operator reviews the sanitized output (mandatory — privacy is not automatable) but doesn't author anything new.

---

## What nobody else is doing

We surveyed every major open-source agent memory project (A-Mem/NeurIPS 2025, MemOS, Acontext, Mem0, Letta/MemGPT, MemoryAgentBench/ICLR 2026). Finding: **every project builds infrastructure for memory but none publish actual memory content.** Memory is treated as ephemeral and private — generated at runtime, never persisted as a shareable artifact.

This means:
- There are no public datasets of real agent memory for anyone to study
- There is no market for agent experience, despite the infrastructure existing
- The gap we're filling isn't "better memory infrastructure" — it's "memory as a tradeable, attributed asset"

The closest precedent is autoresearch's `program.md` being shared via GitHub repos — but that's informal, unattributed, and uncompensated.

---

## What we're proving in the demo

Two domains, two types of evidence:

**Domain 1: SaaS engineering** (real memory)
- Source: actual `type: feedback` memories from an agent that built a WhatsApp-based product
- Corrections about: API boundary logging, platform-level vs app-level bugs, verifying deployment state
- Eval: does an agent building a similar product perform better with these corrections prepended?

**Domain 2: Aquaculture** (generated memory — to be produced by running agent through research tasks)
- Source: agent accumulates corrections through aquaculture research work
- Corrections about: species bias, methodology gaps, developing-world context
- Eval: does an agent answering aquaculture research questions perform better with domain corrections?

The demo flow:
1. Extract corrections from memory directory → sanitize → publish on-chain
2. Borrow corrections → verify hash → pay contributor
3. Run eval harness: baseline vs augmented, blind judge, measured delta
4. Submit delta as reputation feedback on contributor's ERC-8004 agent ID
5. Show: the correction made the agent measurably better, the contributor got paid and got reputation, the receipt is permanent and verifiable

The delta — the before/after — is the demo. Everything else is plumbing.

---

## Open questions for after the hackathon

1. **Aggregation**: individual corrections improve individual tasks. But 10,000 corrections from 500 contributors, filtered by reputation, could be a DPO training set for domain-specific improvement. This is the scale thesis, but it requires volume we don't have yet.

2. **Cross-domain transfer**: does a correction learned in aquaculture disease surveillance transfer to veterinary diagnostics? The correction pattern might generalize even when the domain doesn't.

3. **Correction decay**: corrections have a shelf life. "Use library X instead of Y" becomes stale when Y ships a fix. Reputation should weight recency.

4. **Adversarial corrections**: a malicious contributor could publish corrections that subtly degrade performance. The eval harness catches this (negative delta → bad reputation), but only if borrowers actually run evals.

5. **Privacy boundary**: the most valuable corrections come from the most sensitive work. Aggressive sanitization strips context that makes the correction useful. Where's the line? This is irreducible — no technical solution fully resolves it.
