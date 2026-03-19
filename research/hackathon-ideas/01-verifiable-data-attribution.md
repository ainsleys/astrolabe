# Idea 1: Verifiable Data Attribution with Bias-Corrected Payments

**Status:** Brainstorm
**Date:** 2026-03-19

## Core concept

An agent that builds research problem graphs and creates verifiable on-chain receipts for every data source it uses — with bias-corrected attribution scores driving payment splits.

## How it works

1. Agent does research (e.g., aquaculture problem graph), pulling from various sources
2. Each source usage logged as on-chain trace (Base or Celo for cheap txns)
3. Attribution weighted by bias-correction: underrepresented but valuable sources get proportionally more credit
4. Data contributors verify their data was used and receive payment proportional to bias-corrected attribution, not raw citation count

## Hackathon fit

- **Payment & Transparency**: agents paying for data with verifiable spending
- **Trust & Identity**: on-chain receipts (ERC-8004 adjacent — "Agents With Receipts" prize track)
- **Privacy**: MPC background — contributors could prove data was used without revealing data itself
- **Cooperation**: agent-to-agent or agent-to-human resource sharing with enforcement

## Why it's better than "funding the commons"

Not asking people to donate — creating a market mechanism where contributing underrepresented data is more profitable than contributing popular data, because bias correction weights it higher. Actual incentive structure, not charity.

## MVP scope (3 days)

- Use existing aquaculture problem graph as demo case
- Agent re-derives part of it while logging source attribution to a contract on Base/Celo
- Simple bias-corrected attribution score (frequency-inverse weighting)
- Show that contributor of underrepresented data (e.g., African catfish research) gets proportionally more reward than another salmon paper
- Skip MPC for demo, mention as future work

## Connections to existing research

- Bias weighting: Matthew effect in citations, frequency-driven vs. quality-driven recommendations
- Problem-gate: structured pipeline where attribution happens at each stage
- Self-training verifiability: distinguishing genuine vs. superficial verification
- Aquaculture problem graph: concrete worked example with explicit bias flags
- Past MPC work: data sharing with compensation

## Open questions

- How to make attribution scoring credible (not just inverse frequency)?
- What contract standard to use (ERC-8004? custom?)
- How to handle attribution for indirect sources (source-of-source)?
