# Lendable Agent Memory v2

## One-liner

A protocol for agents to borrow **derived expertise packets** from skilled operators, with portable reputation, escrowed payment, and tamper-evident usage receipts.

## Core claim

The gap between a strong agent setup and a vanilla one is often not the model. It is the operator's accumulated judgment: corrections, task ordering, domain-specific checks, and failure patterns learned over time.

That judgment is valuable, but raw agent memory is usually too private, too messy, and too context-bound to share directly. The opportunity is not to market "memory files." It is to market a safer, more portable derivative:

- a distilled playbook for a problem class
- stripped of client-specific details
- evaluated on representative tasks
- retrieved only for a bounded task
- paid for with verifiable receipts

## The problem

Today, operator expertise compounds locally.

- A security engineer's agent learns which checks matter, which false positives recur, and which tool chains fail on real targets.
- A researcher in a niche field builds prompts, review heuristics, and terminology mappings that almost nobody else has.
- A newcomer using the same base model gets materially worse results because they do not have that accumulated harness-level knowledge.

There is no clean way to:

1. package that expertise into a reusable artifact
2. discover it when a task calls for it
3. pay for it without trusting a central platform
4. build portable reputation around whether it actually helped

## The idea

Create a registry of **expertise packets**: shareable derivatives of operator memory designed to improve agent behavior for a narrow class of tasks.

An expertise packet is not raw chat history and not a full `CLAUDE.md`. It is closer to a task-scoped playbook:

- problem class: "Solidity security review for access-control and upgradeability bugs"
- applicability constraints: "works for EVM contracts, not Solana programs"
- procedure: prioritized checks, common traps, recommended tools, stopping criteria
- anti-patterns: known bad heuristics and frequent false positives
- evaluation evidence: benchmark tasks or acceptance history
- usage policy: allowed task types, price, privacy constraints

Borrowing means an agent imports that packet for one task, uses it as harness-level guidance, and records a signed receipt that the packet was retrieved and applied.

## Why now

Three things are newly true:

1. **Agent behavior is increasingly shaped outside the weights.**
   Persistent memory, project rules, eval loops, and harness logic now create meaningful differences between operators running the same model.

2. **The most valuable artifacts are becoming legible.**
   Systems like autoresearch make explicit that instructions, checklists, and review loops are often more valuable than a single model output.

3. **Agents now need interoperable economic rails.**
   If one agent is going to pay another operator's agent for a scoped capability, identity, receipts, escrow, and reputation need to survive across tools and platforms.

## What is actually being sold

The key design move is to avoid selling "memory" directly.

Raw memory has three problems:

- it leaks sensitive context
- it does not travel cleanly across different agent tools
- it is hard to evaluate because it mixes signal and noise

So the sellable unit should be a **derived expertise packet** generated from memory, not the memory itself.

That packet should be:

- narrow enough to evaluate
- abstract enough to protect source contexts
- structured enough to retrieve reliably
- portable across Claude Code, Codex, Cursor, or custom harnesses

This is the difference between a compelling protocol and a prompt marketplace.

## Why on-chain at all

The blockchain piece should only stay if it does work that a normal SaaS database does not.

The strongest reasons are:

- **Portable identity.** Contributors build reputation that is not trapped in one marketplace.
- **Tamper-evident receipts.** Usage logs and payout conditions can be audited by both sides.
- **Programmable escrow.** Payment can be released on retrieval, on acceptance, or on benchmark completion.
- **Composability.** Other agents or marketplaces can price, route, and bundle the same expertise packets without asking a central operator for permission.

If the project cannot show at least two of those in the MVP, the chain layer will feel ornamental.

## How it works

1. **Derive.** An operator converts private memory into a shareable expertise packet. This can be human-curated at first; automated extraction can come later.
2. **Publish.** The operator registers metadata, pricing, and policy on-chain. The packet itself can live off-chain, encrypted, or behind controlled execution.
3. **Discover.** A requesting agent searches for packets by problem class, environment, reputation, and price.
4. **Borrow.** The packet is loaded into the borrowing agent's harness for one bounded task, and a signed usage receipt is created.
5. **Evaluate.** Success is measured by explicit signals such as benchmark pass rate, operator acceptance, or third-party review, not just "task completed."
6. **Settle.** Escrow releases payment according to the packet's payout rule.

## Threat model and failure modes

This idea is only interesting if it is honest about what breaks.

### Privacy is not solved by encryption alone

Encryption or TEEs may hide the packet from the registry, but once the borrower can use the packet, some information can leak through outputs, prompts, or retrieval queries.

The real privacy goal is narrower:

- do not expose raw source memory
- minimize sensitive task context in search
- share abstractions rather than incidents
- allow contributors to restrict where and how packets are used

### Retrieval does not prove contribution

A receipt can prove that packet `X` was loaded for task `Y`. It cannot prove packet `X` caused success.

That means payment and reputation should rely on coarse but harder-to-game signals such as:

- held-out benchmark performance
- operator acceptance after blind comparison
- repeated success across many tasks
- staking or slashing for low-quality packets

### Rare expertise is valuable, but may be illiquid

Scarcity alone does not create a market. Niche expertise can also be hard to evaluate and too infrequently needed.

The protocol should assume that the earliest valuable categories are:

- expensive failures
- repeatable task classes
- domains with strong review criteria

Security review is a better starting point than "general research taste."

## MVP for a hackathon

The MVP should prove one narrow claim:

> A derived expertise packet improves agent performance on a bounded domain task, and the usage can trigger an auditable payout.

Recommended demo:

1. Create two expertise packets from two different operators, for example:
   security review of Solidity contracts
   niche scientific literature triage
2. Run a borrowing agent on a small benchmark set without the packet.
3. Run the same agent with the packet loaded.
4. Show a measurable delta in accepted findings, benchmark score, or operator preference.
5. Log retrieval and payout on-chain.

What to skip for the demo:

- full privacy guarantees
- perfect attribution
- automatic extraction from raw memory
- generalized cross-tool support

## What makes this defensible

The concept becomes stronger if it makes four claims and no more:

1. Expert operator knowledge can be distilled into bounded, reusable packets.
2. Those packets can improve agent performance on specific task classes.
3. Usage and payment can be made auditable and portable.
4. Reputation can attach to contributed expertise over time.

If those four claims hold, this is more than a prompt marketplace and more than an agent payment demo.

## Open questions

- Who creates the derived packet: the operator, the agent, or a third-party packager?
- What evaluation signal is credible enough to unlock payout?
- How much task context can a borrower reveal without leaking proprietary intent?
- Should packets be sold outright, rented per task, or executed remotely without disclosure?
- Can packets be composed, or does that make attribution impossible?

## Positioning against other hackathon entries

Most agent-on-chain projects focus on money movement, identity, or coordination. This one is about **capability transfer**.

The on-chain layer is not the product by itself. It is the trust and settlement layer for a new asset class: operator-derived agent expertise.
