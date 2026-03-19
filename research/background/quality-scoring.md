# Quality Scoring for Shared Memory Fragments

**Date:** 2026-03-19

## Existing Approaches

### EvolveR: Laplace-smoothed success rate
- `s(p) = (c_succ+1)/(c_use+2)`
- New principles start at 0.5 (neutral prior)
- After 10 uses/8 successes: 0.75. After 10 uses/2 successes: 0.25.
- Low-scoring principles pruned (threshold ~0.3-0.4)
- Key finding: self-distilled principles outperform externally provided ones

### INMS: LLM pre-admission gate
- LLM scorer evaluates 0-100 on: correctness, completeness, clarity, relevance, novelty
- Threshold 81/100 for admission (~top 20%)
- Weakness: judges surface quality, not causal impact. Gameable.

### ERC-8004 Reputation Registry
- `giveFeedback(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)`
- Tags enable domain-specific reputation (e.g., "memory-lend" + "aquaculture")
- `getSummary()` returns aggregates filtered by agent + tags
- No built-in Sybil resistance. No weighting by feedback quality.

### Recall Network: PageRank-weighted scores
- Feedback weighted by scorer's own reputation
- Recursive: trust flows through network
- Naturally resists Sybil (fake agents have zero reputation weight)

## Proposed Three-Layer Approach

### Layer 1: Pre-Admission (before usage)
LLM scorer evaluates on: specificity, correctness, transferability, novelty, clarity (each 0-20, total /100).
Threshold: 65/100 for demo (raise to 75+ in production).

### Layer 2: Per-Usage (EvolveR-adapted)
```
s(f) = (c_positive + 1) / (c_use + 2)
```
c_positive = task_succeeded AND (operator_accepted OR borrower_rating >= 4)

### Layer 3: Combined Score (handles cold start → production transition)
```
Q(f) = alpha * pre_admission_score + (1 - alpha) * s(f)
alpha = 2 / (c_use + 2)
```
- Zero uses: alpha=1.0, quality = LLM pre-admission score only
- 2 uses: alpha=0.5, equal weight
- 10 uses: alpha=0.17, usage dominates
- 50 uses: alpha=0.038, pre-admission nearly irrelevant

### Contributor Reputation
```
R(contributor) = weighted_mean(s(f) for all fragments, weights = usage_count)
```
Production extension: weight feedback by borrower reputation (PageRank-style).

### On-Chain Recording
After each borrow: `giveFeedback(contributorAgentId, score*100, 0, "memory-lend", domain_tag, endpoint, evidenceURI, evidenceHash)`

### Pruning
Remove when: Q(f) < 0.3 AND c_use >= 5, OR pre_admission < 50, OR no usage in 90 days.

## Demo-Scale Checklist
1. Run LLM scorer on each fragment at publish time (~30s each)
2. For each task: run without fragment, run with. Record delta.
3. After each borrow, update c_use and c_positive
4. Call giveFeedback() on ERC-8004
5. Display: pre-admission score, usage count, success rate, combined Q(f), A/B delta
