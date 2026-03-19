# Memory Fragment Formats: Research Notes

**Date:** 2026-03-19

## Existing Approaches

### EvolveR "Strategic Principles" (arxiv 2510.16079)
- Natural language statement + knowledge triples + success/usage metadata
- Generated via self-distillation: agent reflects on its own trajectories
- Self-distillation outperformed external teacher distillation ("cognitive alignment")
- Scoring: `s(p) = (c_succ+1)/(c_use+2)` — Laplace-smoothed success rate
- Retrieved via `<search_experience>` action, top-k by semantic similarity
- Preserves: strategy, failure patterns, heuristics. Loses: specific contexts, reasoning chains.

### AgentRR Multi-Level Experiences (arxiv 2505.17716)
- **Low-level**: precise action sequences tied to specific environments (like a macro/script)
- **High-level**: generalized procedural knowledge, platform-independent
- Selection logic: prefer lowest-level experience that maintains highest success rate
- Preserves: at high level — strategy, failure modes, ordering constraints. Loses: raw observations, failed explorations.

### INMS Prompt-Answer Pairs (arxiv 2404.09982)
- Shared as {prompt, answer, source_agent, domain, quality_score}
- LLM scorer evaluates 0-100, threshold 81/100 for admission
- Domain-specific pools outperform integrated pools
- Heterogeneous memories from different LLM backbones still help
- Preserves: task framing, solution. Loses: reasoning chain, corrections, iterations.

### Claude Code Memory (production)
- CLAUDE.md rules: hierarchical, path-scoped, under 200 lines each
- Auto-memory files: typed frontmatter (user/feedback/project/reference), free-form markdown
- Feedback type is richest: "no, not that" corrections with context
- MEMORY.md index loaded every session, topic files on demand

## Three Proposed Formats

### Format A: "Experience Card" (Maximally Structured)
- YAML with fields: domain, task_class, applicability, principles (with confidence + source_type), anti_patterns, procedures, quality metrics, provenance
- Optimized for retrieval and filtering
- Closest to EvolveR
- Good for registry metadata / on-chain indexing

### Format B: "Experience Narrative" (Semi-Structured)
- Markdown with frontmatter + sections: When This Applies, What I Learned, Traps and False Positives, Procedure, Confidence Notes
- Preserves correction context and nuance ("my agent kept doing X, operator said no")
- Closest to Claude Code feedback memories
- Easiest to generate from existing memory files
- **Recommended for hackathon MVP** — an LLM can summarize feedback memories into this format with minimal prompt engineering

### Format B: "Experience Narrative" (Semi-Structured)### Format C: "Experience Diff" (Minimal, Composable)
- Single atomic lesson per fragment: trigger, lesson, reasoning, type, confidence
- Composability fields: supersedes, conflicts_with, composes_with
- Best privacy (minimal context per fragment)
- Most interesting for production but requires most tooling
- Closest to INMS PA pairs + EvolveR scoring

## Recommendation
Start with Format B for the demo (closest to raw memory, easiest to generate). Use Format A fields for on-chain registry metadata. Format C is the production vision.
