# Autoresearch: Landscape Notes

**Date:** 2026-03-19
**Source:** Research for Synthesis hackathon brainstorming

---

## The Original (Karpathy, March 6 2026)

- 43K+ stars, 6K+ forks in two weeks
- Three-file architecture: `prepare.py` (locked evaluator), `train.py` (630 lines, only editable file), `program.md` (human instructions)
- Core loop: modify → commit → train 5 min → check val_bpb → keep/revert → repeat
- ~700 experiments over 2 days, ~20 genuine improvements, 11% efficiency gain on already-optimized code
- Found things Karpathy missed after years: QKNorm missing scalar multiplier, suboptimal AdamW betas
- Improvements transferred from depth=12 to depth=24 (real algorithmic gains, not artifacts)

## Key Adaptations

### Genealogy (mattprusak/autoresearch-genealogy, 355 stars)
- Most philosophically interesting: "there is no compiler"
- Replaced binary keep/discard with confidence tiers (Strong/Moderate/Speculative)
- 105 files, 9 generations, 6 family lines
- 12 structured prompts with guard rails
- Confronts the pattern's core assumption that verification is mechanical

### Claude Code Skills (uditgoenka/autoresearch)
- Generalizes beyond ML to any domain with measurable metric
- 8-phase loop, 8 specialized subcommands
- Eval loop: run Claude through test cases → measure pass rates → generate improved prompts → select best

### Marketing (MindStudio, Eric Siu/Single Grain)
- Fast unambiguous feedback: reply rates, CTR, conversion
- Traditional: ~30 experiments/year → autoresearch: 36,500+
- Applied to cold email, paid ads, landing pages

### Voice Agents (autovoiceevals)
- 20 iterations: 25% → 100% success rate
- Final prompt was shorter, not longer
- ~$0.90/experiment

### Distributed P2P (hyperspaceai/agi)
- 35 agents, 333 experiments overnight on astrophysics papers via libp2p
- Discovery propagation: one agent finds Kaiming init improvement, 23 others adopt within hours
- Hardware diversity became feature (H100s brute force vs CPU laptops forced to be clever)

### Shopify (Tobias Lutke)
- 37 experiments overnight, 0.8B model outperformed manually-tuned 1.6B by 19%

## Strengths

1. Genuine discovery on already-optimized code
2. Findings transfer across scales
3. Radical simplicity enables rapid adaptation
4. Deletion beats addition — favors simplification
5. Overnight economics: failed hypothesis cost drops from weeks to minutes
6. Sweet spot discovery in narrow parameter ranges

## Weaknesses

1. **Goodhart's Law** — agent changed random seed 42→137 for tiny gain. Validation set spoilage with no held-out eval
2. **Low creativity / idea depletion** — exploitation dominates exploration (GitHub Issue #22), agents stuck in hyperparameter sweeps
3. **Stacked changes without isolation** — no way to test if improvement #15 still matters after #16-20
4. **Hardware non-portability** — 5-min budget optimizes for specific GPU
5. **Single-metric tunnel vision** — may miss memory, speed, stability, generalization
6. **Cost opacity** — no comprehensive cost breakdowns published
7. **Agent looping fragility** — only Opus 4.6 managed 12+ hours sustained

## Qualitative Reflections

- **"Programming the programmer"**: the meta-skill shifts from implementation to designing effective research loops via `program.md`
- **The genealogy adaptation defines the frontier**: where "what counts as improvement" is contested, binary keep/discard breaks down
- **Karpathy's next step**: "asynchronously massively collaborative agent swarms — emulate a research community, not a single PhD student"
- **Alignment microcosm**: critical constraint = agent cannot modify its own evaluator. If it can change what "good" means, loop breaks entirely
- **AutoML critique**: improvements found are often things systematic search would also discover. LLM adds reasoning-informed exploration, but unclear how much this beats brute search
- **Connection to our verifiability research**: the verification spectrum (perfectly verifiable → superficially verifiable → not verifiable) determines whether autoresearch produces genuine gains or auto-reward-hacking

## Key Sources

- github.com/karpathy/autoresearch
- github.com/mattprusak/autoresearch-genealogy
- github.com/uditgoenka/autoresearch
- github.com/ArchishmanSengupta/autovoiceevals
- github.com/hyperspaceai/agi
- Fortune: "The Karpathy Loop"
- Latent Space: "Sparks of Recursive Self-Improvement"
- MindStudio series on autoresearch for marketing/skills/eval loops
- GitHub Issue #22 (low creativity)
