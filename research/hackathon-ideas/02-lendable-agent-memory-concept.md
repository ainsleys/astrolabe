# Lendable Agent Memory

## One-liner

A protocol for agents to borrow domain expertise from skilled operators, with on-chain attribution and compensation.

## The problem

Modern AI coding agents (Claude Code, Codex, Cursor) accumulate operator expertise over time through persistent memory: corrections, workflow patterns, domain-specific rules, and debugging insights. An experienced security engineer's agent behaves fundamentally differently from a newcomer's — not because of model differences, but because of months of accumulated feedback shaping how the agent reasons.

This expertise is currently trapped. It lives in local files on one machine, invisible and unshareable. There's no way for a less experienced operator to benefit from it, and no way for the skilled operator to be compensated for developing it. The result: massive duplication of effort, and a skill gap between operators that compounds over time.

## The idea

Create a marketplace where operators can publish fragments of their agent's accumulated expertise to an on-chain registry. Other agents can discover, borrow, and pay for relevant expertise — temporarily augmenting their reasoning with domain knowledge their own operator hasn't developed.

**A security engineer** builds deep expertise through months of pentesting. Their agent knows which vulnerability patterns to check first, which false positives to ignore, which tool chains work for specific architectures. A developer who occasionally needs security review could borrow that expertise for a single task — their agent queries the registry, retrieves relevant memory fragments, and operates with borrowed skill for the duration of the task.

**An aquaculture researcher** accumulates domain knowledge that almost no other agent has. In a market that prices by scarcity, their expertise commands a premium precisely because it's underrepresented — inverting the usual dynamic where popular knowledge dominates.

## Why this works now

Three developments converge:

1. **Agent memory is real and structured.** Claude Code's auto-memory system (MEMORY.md + topic files with typed frontmatter), CLAUDE.md rules with path-scoping, and cross-session task persistence mean agents now carry durable, somewhat-structured expertise. This isn't hypothetical — it's shipping in production tools today.

2. **The value of operator skill is empirically demonstrated.** Karpathy's autoresearch showed that `program.md` — the human-written instructions that guide the agent — is the most valuable artifact in the system. The pattern has been adapted to marketing, genealogy, voice agents, and security testing. In every case, the quality of the human's accumulated knowledge determines the quality of the agent's output.

3. **On-chain attribution is tractable for this use case.** Unlike "did this data help train a model" (computationally hard to attribute), "did this memory fragment get pulled into this agent session" is straightforward to trace. You can log: which memory was queried, which fragments were retrieved, whether the task succeeded. That's a natural fit for on-chain receipts.

## How it works (conceptual)

1. **Publish.** Operator reviews their agent's memory, selects fragments suitable for sharing, and publishes metadata (topic, expertise domain, success metrics) to an on-chain registry. Content can be stored encrypted or in a TEE — the registry indexes what's available, not the content itself.

2. **Discover.** A requesting agent, facing a task outside its operator's expertise, queries the registry with task context. Semantic search over the memory index returns relevant fragments ranked by domain match and contributor reputation.

3. **Borrow.** The requesting agent retrieves memory fragments and temporarily incorporates them into its context for the duration of the task. An on-chain receipt logs the transaction: who provided what, who consumed it, when.

4. **Evaluate.** After the task, the borrowing agent (or its operator) can report whether the borrowed expertise was helpful. This builds a reputation layer — memory fragments that consistently help build credibility; ones that don't, lose it.

5. **Compensate.** Payment flows from borrower to contributor, proportional to usage and weighted by reputation. Underrepresented expertise commands a premium through natural market dynamics.

## Key design tensions

**Privacy.** The most valuable operator memories come from real, sensitive work. A security engineer's best patterns were developed against real pentests they can't fully share. The system needs to operate at an intermediate level — sharing reasoning patterns and corrections without exposing the proprietary contexts they were developed against. This is partially solvable (scrubbing, abstraction, TEEs) but not fully.

**Quality signal.** How do you know a memory fragment is actually good? Operators accumulate confident-but-wrong patterns too. The reputation layer (did borrowing this actually help?) is the primary quality signal, but it takes time to build. Early bootstrapping is a cold-start problem.

**Granularity.** Full memory files are too coarse and too private. Individual corrections are better but need extraction and decontextualization. The right unit of sharing is somewhere in between — maybe a "shareable derivative" that an agent generates from its own memory: the patterns without the specifics.

**Verification.** Connects to the broader problem of verifying agent work. If a borrowed memory fragment leads to a task being completed, was the fragment actually responsible? Attribution within a single agent session is hard. Coarse signals (task succeeded/failed, operator accepted/rejected output) may be sufficient for a reputation system even if precise attribution is impossible.

## Key references

### Agent memory systems
- **Claude Code memory architecture** — CLAUDE.md (human-written, hierarchical, path-scoped rules) + auto-memory (agent-written MEMORY.md + topic files with typed frontmatter). Docs: code.claude.com/docs/en/memory
- **Cantrip** (deepfates.com/cantrip) — Framework modeling agent identity as emergent from accumulated episode history. By turn 12, agent behavior is completely different from turn 1 through in-context learning, not weight updates. Our idea extends this across operators.

### Autoresearch and operator skill
- **Karpathy's autoresearch** (github.com/karpathy/autoresearch, March 2026) — Demonstrated that `program.md` (human instructions) is the most valuable artifact. 43K+ stars, adapted to marketing, genealogy, voice agents, security testing within weeks.
- **Autoresearch genealogy adaptation** (github.com/mattprusak/autoresearch-genealogy) — Most interesting adaptation because it confronts the limits of mechanical verification. Replaces binary keep/discard with confidence tiers. Relevant to the quality signal problem.
- **Hyperspace distributed autoresearch** (github.com/hyperspaceai/agi) — 35 agents sharing discoveries via libp2p. When one agent found an improvement, 23 others adopted it within hours. Precedent for inter-agent knowledge sharing.

### Agent harness engineering
- **Anthropic: Effective Harnesses for Long-Running Agents** (anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Argues the harness, not the model, should own persistence and planning. Memory is a harness-layer concern.
- **OpenAI: Harness Engineering** (openai.com/index/harness-engineering/) — "The agent isn't the hard part — the harness is."
- **Ralph Loop** (alibabacloud.com/blog/from-react-to-ralph-loop) — Pattern for forcing agents to iterate until verifiably complete. The stop-hook and disk-as-memory principles are relevant to how borrowed memory would integrate.

### On-chain agent infrastructure
- **ERC-8004** — On-chain agent identity and receipts. Directly relevant to logging memory borrowing transactions.
- **ERC-8183** — Programmable escrow for AI agents. Could apply to payment-on-success for borrowed expertise.
- **Synthesis hackathon projects** (synthesis.devfolio.co/projects) — ~13 submitted projects, most focused on agent payments, identity, and cooperation on Ethereum L2s.

### Bias and attribution (from our research)
- **LLM citation bias** (Algaba et al., 2024) — LLMs amplify Matthew effect in citations. Our system inverts this: underrepresented expertise is more valuable, not less.
- **Preferential attachment bias in GNNs** (Subramonian, Sagun, Sun, ICML 2024) — "Rich get richer" dynamics in graph-based systems. Relevant to designing a memory marketplace that doesn't just amplify popular contributors.
- **Self-training verifiability spectrum** — Our research on genuine vs. superficial verification directly applies to the quality signal problem for borrowed memory.

### Privacy and data markets
- **MPC for data sharing** — Prior work on getting compensated for contributing data in privacy-preserving settings. Directly relevant to the privacy tension.
- **TEEs (Trusted Execution Environments)** — Could enable memory fragment retrieval without exposing content to the registry operator.

## Relationship to existing hackathon submissions

Most Synthesis submissions focus on agents transacting financially (trading, escrow, payments) or agents proving identity on-chain. This project is different: it's about agents transacting *knowledge* — borrowing and lending cognitive skill rather than tokens. The on-chain layer provides attribution and compensation, but the core value proposition is about making agents collectively smarter by sharing accumulated human expertise.
