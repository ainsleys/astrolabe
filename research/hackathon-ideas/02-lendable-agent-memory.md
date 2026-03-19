# Idea 2: Lendable Agent Memory — Borrowing Expertise Across Operators

**Status:** Brainstorm
**Date:** 2026-03-19

## Core concept

Skilled operators accumulate domain expertise in their agent's memory (CLAUDE.md rules, feedback corrections, workflow patterns). This expertise is currently trapped on one machine. Create a protocol where operators can publish memory fragments to an on-chain registry, other agents can borrow relevant expertise for specific tasks, and contributors get attribution and compensation.

## The problem it solves

The gap between a well-configured agent and a vanilla one is enormous and invisible. Two people using the same model get wildly different results because one has months of accumulated memory/feedback. There's no market for that accumulated skill.

## How agent memory actually works (Claude Code as reference)

### Two layers of persistent memory

**1. CLAUDE.md — human-written instructions**
- Hierarchical: global (~/.claude/CLAUDE.md) → project (./CLAUDE.md) → topic-specific (.claude/rules/*.md)
- Contains: build commands, architecture decisions, coding standards, workflow conventions, risk posture
- Can be path-scoped (e.g., security.md only loads when working in src/api/**/*.ts)
- Target: under 200 lines per file

**2. Auto memory (MEMORY.md + topic files) — agent-written**
- Stored at ~/.claude/projects/<project>/memory/
- MEMORY.md index (first 200 lines loaded every session) + topic files loaded on demand
- Each file has frontmatter with name, description, type
- Types: user (who you are), feedback (corrections/confirmations), project (ongoing work), reference (external system pointers)
- Free-form markdown content, very unstructured in practice

### What makes one operator's agent better than another

- **Feedback memories**: encode corrections — things the agent got wrong and the operator fixed. A security engineer's "no, check for X before Y" corrections are distilled expertise.
- **CLAUDE.md rules**: encode workflow patterns — how a skilled operator structures their approach to a problem class.
- **Path-scoped rules**: domain-specific knowledge that activates only in certain contexts.

## The Cantrip connection

Cantrip (deepfates.com/cantrip) models agent behavior as emergent from accumulated episode history — by turn 12, the agent reasons completely differently from turn 1, not from weight updates but from in-context learning. This idea extends that across operators: what if your agent could start at "turn 12" by borrowing someone else's accumulated path?

## The autoresearch connection

Karpathy's key insight: the most valuable artifact is program.md — how you instruct the agent, not the code it writes. The accumulated operator knowledge that shapes agent behavior is exactly what this puts on the market.

## How it could work

1. Operator publishes memory fragment metadata to on-chain registry (topic, expertise area, success metrics) — content stays private or in encrypted storage
2. Requesting agent queries registry with task context ("I need security audit expertise for Solidity contracts")
3. Semantic search over memory index returns relevant fragments
4. On-chain receipt logs: which memory was queried, which fragments retrieved, task outcome
5. Payment flows to contributor proportional to usage
6. Success/failure feedback builds reputation layer for memory quality

## Hackathon fit

- **Payment & Transparency**: agents paying for borrowed expertise with verifiable spending
- **Trust & Identity**: on-chain reputation for memory contributors, receipts for usage
- **Cooperation & Enforcement**: agent-to-agent knowledge sharing with attribution
- **Privacy**: share reasoning patterns without exposing proprietary codebases they were developed against

## Key tensions and open questions

### Privacy (core tension, not a side concern)
- Most valuable memories come from real, sensitive work (pentests, proprietary codebases)
- Need to share reasoning structure while scrubbing specific targets/clients
- Somewhere between "share the CLAUDE.md" (too shallow) and "share full conversation history" (too private)
- Could memory be useful at an intermediate level — patterns and corrections without the specific context?

### Quality signal
- How do you know a memory fragment is actually good? Operators accumulate confident-but-wrong patterns too
- Borrowing agents could report success/failure rates → reputation layer
- Connects to autoresearch eval problem: what's genuinely helpful vs. what just looks helpful

### Indexing unstructured expertise
- Memory files are messy free-form markdown
- Retrieval needs semantic understanding, not just keyword matching
- Need to match "what expertise is needed" to "what expertise is available"

### Economic model
- Underrepresented expertise should be more valuable (same inversion as idea #1)
- If everyone's security agents are good but nobody's aquaculture agent knows anything, aquaculture expertise commands a premium
- Market naturally incentivizes filling gaps

### What gets shared — the granularity question
- Full memory files? Too coarse, too private
- Individual rules/corrections? Better granularity but needs extraction
- Synthesized expertise summaries? Loses the specific corrections that make it valuable
- Could an agent generate a "shareable derivative" of its memory — the patterns without the specifics?

## MVP scope (3 days)

- Two operators with Claude Code, each with different domain-specific memory files
- Simple on-chain registry (Base or Celo) where operators publish memory fragment metadata
- Retrieval mechanism: second agent queries registry, pulls relevant fragments with on-chain receipt
- Demo: borrowing agent performs measurably better on a domain-specific task with borrowed memory vs. without
- Payment flows back to contributor on-chain
- Skip full privacy solution for demo — mention MPC/TEE as future work

## Connections to existing research

- Bias weighting: underrepresented expertise should command premium (inverse of Matthew effect)
- Problem-gate: memory fragments could carry verifiability scores — is this expertise testable?
- Self-training verifiability: quality signal for borrowed memory has same genuine-vs-superficial problem
- Autoresearch: program.md as the most valuable artifact; the pattern generalizes to all operator knowledge
- Past MPC work: privacy-preserving data sharing is directly relevant
- Cantrip: agents evolve through accumulated context, not weight updates — this extends that across operators
