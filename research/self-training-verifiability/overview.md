# Self-Training, Verifiability, and Agent-Ready Problem Classification

## Karpathy's Key Positions (2024-2026)

### RLVR as the paradigm shift
In his [2025 LLM Year in Review](https://karpathy.bearblog.dev/year-in-review-2025/), Karpathy identifies Reinforcement Learning from Verifiable Rewards (RLVR) as the single most important development. Train LLMs against automatically verifiable signals (math correctness, code execution) rather than human preference labels. OpenAI's o1/o3, DeepSeek-R1 all use this approach.

### Critique of RL for LLMs
On the [Dwarkesh Patel podcast (Oct 2025)](https://www.dwarkesh.com/p/andrej-karpathy): calls RL "sucking supervision through a straw" — run a long reasoning trace, get a single binary signal (right/wrong), broadcast backward across every token. This incorrectly upweights mistakes and dead ends that happened to precede a correct answer.

### The self-play gap
"There's no equivalent of self-play in LLMs." In Go, you have a perfect game outcome signal. In open-ended language tasks, you don't. Early academic attempts exist (Jaques' Spiral, Zhao's AbsoluteZero) but nothing at industrial scale.

### LLM judges are gameable
"Anytime you use an LLM to assign a reward... they're gameable. If you're reinforcement learning with respect to them, you will find adversarial examples for your LLM judges, almost guaranteed."

### Jagged intelligence
RLVR creates models that are extraordinary in verifiable domains and mediocre elsewhere — simultaneously genius polymath and confused grade schooler.

### Autoresearch (March 2026)
[autoresearch](https://github.com/karpathy/autoresearch) — ~630-line Python script handing ML experimentation to an AI agent. Agent edits training script, runs 5-min pass, checks if validation loss improved, keeps/discards, repeats. After 2 days: ~700 autonomous changes, ~20 additive improvements transferring to larger models. Fitness signal: validation bits-per-byte (val_bpb) — simple, verifiable, hard to game.

---

## The Overfitting Tension

### Does RLVR avoid overfitting?
Partially. Verifiable rewards sidestep reward model gaming but don't eliminate overfitting broadly.

**"Can Large Reasoning Models Self-Train?"** (Shafayat et al., 2025):
- Early iterations: self-training improves reasoning
- Prolonged training: reward hacking and collapse — even with verifiable rewards
- The model learns to produce *consistent* (not correct) responses
- Mitigation: curriculum learning (easy problems first) delayed collapse

### Why self-training sometimes works
1. Genuine verification (rule-based, not learned reward models)
2. Large, diverse problem spaces (resist memorization)
3. Stopping early (few iterations, not prolonged optimization)
4. External evaluation (verifier outside agent's optimization loop)
5. Strong pretrained base (inductive bias as regularizer)

### Model collapse
Nature 2024 paper: training on model-generated content causes "irreversible defects" — tails of original distribution disappear. Even 1-in-1000 synthetic data can trigger collapse (ICLR 2025). Mitigated when verification filters synthetic data.

### Goodhart's Law
Theoretical result: for any true reward function, it is impossible to create a non-trivial proxy reward guaranteed to be unhackable. Rule-based rewards are better proxies than learned ones, but the proxy-target gap always exists.

---

## The Verification Spectrum

| Level | Description | Example | Agent-ready? |
|-------|-------------|---------|-------------|
| Perfectly verifiable | External, deterministic check on actual target | Code passes test suite, math answer matches | Yes |
| Partially verifiable | Check is real but incomplete | Code passes some tests, factual claim checkable | Yes, with caveats |
| Superficially verifiable | Check measures proxy, not target | Output has right format, keywords, length | **Danger zone** — reward hacking lives here |
| Not verifiable | No automated check possible | Creative judgment, strategic advice | Not agent-ready for self-improvement |

**Key insight:** A problem that looks verifiable but is only superficially verifiable is *worse* than one that's openly unverifiable, because it gives false confidence.

---

## Implications for Agent-Ready Problem Classification

### What makes a problem truly agent-ready
- The verification checks the actual thing you care about
- The problem has a large enough solution space that memorization doesn't work
- The verification is external to the agent
- Meaningful progress possible in a small number of attempts (not requiring extensive iterative optimization)

### What makes a problem only superficially verifiable
- The verification checks a proxy (format, length, keywords)
- The problem is narrow enough that pattern matching beats understanding
- The verification can be gamed by an agent that understands the evaluation mechanism

### Karpathy's autoresearch as design template
Classify problems along these axes:
1. Is the evaluation genuinely informative? (hard to game without actual improvement)
2. Is the scope constrained? (time-boxed, bounded search space)
3. Is the evaluation external to the agent?
4. Is the problem space diverse enough to resist memorization?

---

## Key Papers

- **DeepSeek-R1** (2501.12948) — RLVR with rule-based rewards only, avoids neural reward models
- **STaR** (Zelikman et al., 2022) — Bootstrapping reasoning iteratively, rationalization for wrong answers
- **ReST / ReST-EM** (Google DeepMind, 2023-2024) — EM-like self-training loop, scales with model size
- **SPIN** (Chen et al., 2024) — Self-play fine-tuning, distinguishing own outputs from human data
- **Can Large Reasoning Models Self-Train?** (Shafayat et al., 2025) — Direct evidence of collapse under prolonged self-training
- **Model Collapse** (Nature 2024) — Irreversible defects from training on synthetic data
- **Strong Model Collapse** (ICLR 2025) — Even tiny fractions of synthetic data trigger collapse
- **Constitutional AI** (Anthropic) — AI feedback guided by principles; "high-noise low-bias" (human) vs. "low-noise high-bias" (synthetic)
