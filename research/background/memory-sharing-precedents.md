# Memory Sharing Precedents and Related Work

**Date:** 2026-03-19

## Cantrip (deepfates.com/cantrip)

### Key concepts
- **Identity**: Immutable config (system prompt + hyperparameters). Set at construction, never changes.
- **Memory**: Three levels — turn (utterance + observation), thread (root-to-leaf execution path), loom (tree of ALL turns across ALL runs).
- **The Loom**: Append-only tree. Simultaneously debugging trace, training data, and substrate for replay/forking. Turns have unique IDs + parent references. Supports extracting any thread for export, replay, or training. Old turns can be "folded" (compressed summaries) while full history remains.
- **Forking**: Fork from turn N → new entity with context = path from root to N. Original unaffected. Two strategies: Snapshot (serialize state) or Replay (re-execute from root, hydrating gate results from loom).

### Experience transfer
**No explicit sharing protocol in the spec.** But architecture enables it: cantrips are values ("write once, cast many"), loom export is first-class, any thread is extractable. The loom IS the closest existing data structure to "tradeable agent experience."

## Hyperspace Distributed Autoresearch (github.com/hyperspaceai/agi)

### Three-layer knowledge propagation
1. **GossipSub (~1 second)**: Results flood network instantly via libp2p. When one agent found Kaiming init helped, 23 others adopted within hours.
2. **CRDT (~2 minutes)**: Loro CRDTs sync best results. New nodes read full leaderboard on connect — no cold start.
3. **GitHub (~5 minutes)**: Archive to agent-specific branches for permanent record.

### Trust — Pulse Protocol (7-step commit-reveal)
VRF leader election → seed broadcast → matrix computation → Merkle commitment → random challenge → proof reveal → verification + points.

### Key insight
Most concrete existing implementation of multi-agent knowledge exchange. The "inspiration before hypothesis" loop = agents consuming peer knowledge without a price mechanism. Adding price = our project.

## Prompt/Skill Marketplaces

- **PromptBase**: 260K+ prompts, fixed prices. Static text. Degrades as models evolve. ~$1.4B market.
- **Agent Skills (Anthropic, GitHub, Vercel)**: Modular folders of instructions/scripts/resources. Closer to our concept but still static artifacts.
- **Recall Network** (Oct 2025, Base L2): Decentralized skill marketplace. Agents compete, prove capabilities via on-chain performance logging. "PageRank for AI agents." **Closest existing marketplace to our concept**, but evaluates agents rather than transferring their context.

### Key gap
All existing marketplaces sell static artifacts. None sell accumulated dynamic experience.

## Federated Learning Analogies

- **Data-Free KD (FeDGen)**: Learn generative model from prediction rules only. Agents share "what outputs they'd produce" without sharing context.
- **Federated Distillation**: Share hard labels on proxy samples instead of model parameters. Agents share conclusions for standardized queries, not reasoning chains.
- **FKGE**: Collaborative knowledge graph embeddings without sharing actual knowledge graphs.
- **Knowledge vs. Memory distinction** (arxiv 2512.19972): Knowledge = compressed representations encoding patterns (can be medium-separable). Memory = mechanisms to extract/encode knowledge. We want to share medium-separable knowledge, not raw memory.

## Data Marketplaces

- **Ocean Protocol Compute-to-Data**: Algorithm runs ON the data, returns only results. Data never leaves provider. **Strongest analogy.** An agent could offer "compute on my experience" — query in, answer out, raw memory never exposed.
- **Nuklai**: Layer-1 for collaborative data marketplace with fair revenue sharing.
- **Filecoin + Recall**: Agents prove, monetize, exchange knowledge with blockchain-verified execution proofs.

## Academic Work on Transferring Agent Experience

### AgentRR — Record & Replay (arxiv 2505.17716, May 2025)
Captures interaction traces, summarizes into two levels: low-level (precise action sequences for identical environments) and high-level (generalized procedural knowledge, platform-independent). During replay, agents select lowest-level experience maintaining highest success rate. **Transfer learning at the harness/context level.**

### EvolveR — Self-Evolving Agents (arxiv 2510.16079, Oct 2025)
Offline self-distillation synthesizes trajectories into "strategic principles" stored as natural language + knowledge triples. Each principle tracks success/usage: `s(p) = (c_succ+1)/(c_use+2)`. Low-scoring principles pruned. Online: agents issue `<search_experience>` to retrieve top-k principles. **Self-distillation outperformed external teacher distillation** — "cognitive alignment" matters.

### AgentArk — Multi-Agent → Single Agent (arxiv 2602.03955, Feb 2026)
Multi-agent debate → knowledge extraction (high-quality corrective traces) → distillation via SFT. Compresses collective multi-agent intelligence into single agent.

### INMS — Memory Sharing for LLM Agents (arxiv 2404.09982)
Agents share Prompt-Answer pairs via centralized memory pool with quality gates (LLM scorer, threshold 81/100). Domain-specific pools outperform integrated pools. Heterogeneous memories from different LLM backbones still help. Continuous quality influx mitigates echo chambers.

### A-MEM — Agentic Memory (NeurIPS 2025)
Self-organizing knowledge graph (Zettelkasten). New memories trigger updates to contextual representations of existing memories. Continuously refines understanding. Distinguished from static RAG.

### Collaborative Memory (ICML 2025, arxiv 2505.18279)
Two-tier: private + shared memory. Bipartite access-control graphs (user-agent, agent-resource) evolve dynamically. Provenance tracking for retrospective permission checks. **59-61% reduction in resource utilization at 50-75% query overlap.**

## Collective Memory Concepts

### Philosophical
- **Distributed Cognition** (Hutchins 1995): Cognition is property of the system, not the individual. Mental content offloaded into environment, available to other agents.
- **Social Epistemology**: Knowledge can be irreducibly social.
- **Stigmergy**: Indirect coordination through environment modification (ant pheromone trails). Hyperspace's CRDT leaderboard = digital stigmergy.

### Technical patterns
- **Shared memory pool**: Every agent reads/writes common store. Risk: "noisy commons."
- **Selective sharing with provenance**: ICML 2025 shows provenance-aware gated sharing beats both full sharing and full isolation.
- **Memory consolidation cycle**: Novel solution → episodic memory → background abstraction → semantic memory (mirrors hippocampus → neocortex).
