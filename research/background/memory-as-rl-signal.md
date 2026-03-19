# Memory as Reinforcement Signal

**Date:** 2026-03-19

## The connection

Agent memory — the corrections, rules, and accumulated context that operators build over time — functions as reinforcement learning signal applied through context rather than through gradient updates. The weights don't change. The context does. But the effect on behavior is the same.

This is why lending memory actually changes agent behavior, and why it's not just "sharing documents."

## RL primitives inside operator memory

### Experience tuples: `(state, action, reward, next_state)`
The atomic unit of RL. In memory, this is a feedback entry with full context:

> *State:* discussing OCR readiness for production
> *Action:* agent said "OCR is mocked"
> *Reward:* negative — operator corrected this multiple times
> *Next state:* check GOOGLE_VISION_CREDENTIALS env var before claiming it's mocked

A single feedback memory file IS an experience tuple expressed in natural language.

### Preference pairs: "A is better than B"
The core unit of RLHF. In memory, this is a correction — the operator says "not that, this instead":

> Don't suggest ORMs — operator has strong preference for raw SQL with query builders.

> Test names should describe behavior, not implementation: "rejects expired tokens" not "calls validateToken and checks return value."

No scalar reward needed. The correction IS the preference signal: the operator's choice > the agent's default.

### Demonstrations: expert trajectories
In imitation learning, you show the agent how an expert handles a situation. In memory, this is a procedure or workflow:

> 1. Start with Norwegian IMR archive, not PubMed
> 2. When collecting FCR data, always record: species, weight class, temperature, calculation method, trial scale
> 3. Normalize to biological FCR for cross-study comparison

The operator doesn't explain *why* each step is optimal. The reward is implicit in the fact that an expert chose this sequence.

### Reward shaping: auxiliary hints
Signals that guide the agent toward the right region of behavior without being the final objective:

> Production logging at API boundaries is a launch prerequisite, not a nice-to-have.

> Don't trust the OpenAPI spec for the external pricing API — fields marked optional are actually required.

These aren't corrections on a specific action. They're preemptive signals that reshape the agent's decision landscape before it acts.

### Trajectories: full episodes of experience
A complete MEMORY.md or a full set of feedback files represents a trajectory — the accumulated path through a problem space. By the time an operator has 15 feedback memories for a project, those memories encode an entire trajectory of learning that took months.

This is the Cantrip insight: by turn 12, the agent's reasoning looks nothing like turn 1. The trajectory IS the expertise.

## Why this matters for lendable memory

1. **It explains why memory transfer works.** Sharing a memory file isn't sharing a document — it's sharing RL signal. The borrowing agent's behavior changes for the same reason a model's behavior changes after RLHF: it's received corrective signal about what works and what doesn't.

2. **It explains what makes memory more valuable than prompts.** A prompt is a single instruction. Memory is accumulated reward signal from many interactions. The difference between a prompt marketplace and memory lending is the difference between a single training example and a training dataset.

3. **It suggests quality metrics.** RL has well-studied ways to evaluate signal quality: does it reduce regret? Does it improve sample efficiency? Does the improvement transfer to held-out tasks? These apply directly to evaluating memory fragments.

4. **It connects to the verifiability spectrum.** The self-training verifiability research distinguishes genuine from superficial verification. Memory corrections are high-quality signal because they come from real operator feedback on real tasks — not synthetic rewards, not LLM-judged quality, but actual human correction. This is the most grounded form of RL signal available for agent systems.

5. **It frames the scarcity premium.** In RL, diverse reward signal is more valuable than redundant signal. A correction about aquaculture FCR methodology is more valuable in a marketplace than yet another correction about Python formatting — because it's rare signal that fills a gap no other agent has.

## The spectrum of signal types in memory

| RL primitive | Memory equivalent | Example | Signal strength | Privacy risk |
|---|---|---|---|---|
| Experience tuple | Feedback entry with context | "OCR is NOT mocked — check env var" | High — includes state, action, correction | Medium — may reference specific systems |
| Preference pair | Correction without context | "Don't use ORMs, use query builders" | Medium — direction without grounding | Low — abstract preference |
| Demonstration | Procedure / workflow | "Steps for FCR literature review" | High — full expert trajectory | Low — generalizable |
| Reward shaping | Known issue / rule | "Logging before launch is prerequisite" | Medium — preemptive guidance | Low — generic principle |
| Trajectory | Full MEMORY.md | All accumulated feedback for a project | Highest — complete learning history | Highest — full project context |

The privacy/value tradeoff tracks the RL signal strength: the most valuable signals (experience tuples, trajectories) carry the most context, which means the most privacy risk. The least risky signals (abstract preferences, generic principles) are also the least differentiated.

## Connection to autoresearch

Karpathy's autoresearch uses val_bpb as the reward signal — a single scalar that the agent optimizes against. The corrections in operator memory are richer: they're multi-dimensional, contextual, and come with explanations. This is why the `program.md` insight matters — the human-written instructions that encode accumulated research judgment are a form of reward shaping that no scalar metric can replace.

The autoresearch adaptations confirm this:
- Genealogy replaced binary keep/discard with confidence tiers — richer signal
- Voice agents found the optimal prompt got *shorter*, not longer — corrections remove noise
- The most valuable artifact is always the accumulated human judgment, not the automated metric

## Open question

If memory is RL signal, then lending memory is **transfer learning at the context level**. The standard transfer learning questions apply:
- When does transfer help vs. hurt? (domain mismatch)
- How much signal do you need? (sample efficiency)
- Does the transferred signal compose? (can you borrow from multiple contributors?)
- How do you detect negative transfer? (borrowed memory makes the agent worse)

These are researchable questions with existing frameworks from the RL/transfer learning literature.
