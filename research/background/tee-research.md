# TEEs for Agent Memory Sharing: Research Notes

**Date:** 2026-03-19

## Hardware Landscape

### What's actually usable for LLM inference in a TEE
- **Intel TDX + NVIDIA H100/H200**: The proven stack. TDX isolates entire VMs (not small enclaves like SGX). H100/H200 encrypt GPU memory and PCIe bus. <5% overhead for most queries. Full GPU memory available (80-141GB).
- **Intel SGX**: Deprecated on consumer chips. Still on Xeon but enclave memory too small for LLMs. Legacy.
- **AMD SEV-SNP**: Works for CPU-only VMs. GPU passthrough still problematic with H100s.
- **ARM CCA**: Nascent for server workloads. Not viable today.

## Projects Running LLM Inference in TEEs

- **OLLM** (ollm.com): Confidential inference per-request. TDX + NVIDIA attestation. H200 GPUs. Partnered with Phala (Dec 2025).
- **Chutes** (chutes.ai): TDX + NVIDIA. Defense-in-depth: filesystem validation, bytecode inspection, per-token verification, GPU attestation, random integrity challenges.
- **Phala Network / dstack**: Open-source confidential container orchestration. Docker-based deployment to TEE hardware. Supports H100/H200/B200/A100/A10. Managed cloud option. **Most hackathon-friendly.**
- **Secret Network**: SecretAI + SecretVM. Confidential RAG coming Q1-Q2 2026. More enterprise-focused.
- **Oasis Network**: ROFL framework. TDX on mainnet. Has ERC-8004 + Eliza agent tutorial.

## The Realistic Threat Model

### What TEEs protect
- Infrastructure operator can't read memory fragments from system memory
- Host OS/hypervisor can't access trust domain memory
- Other tenants can't access data
- Remote attestation proves correct code on genuine hardware

### What TEEs do NOT protect
- **Output channel is the critical gap.** If the agent processes a borrowed memory fragment and then generates outputs, those outputs leave the TEE. The borrowing operator sees every token. TEE can't prevent the agent from leaking memory content through behavior.
- **TEE.fail** (Oct 2025): Sub-$1K DDR5 interposer extracts secrets from TDX and SEV-SNP. Requires physical access. Forged TDX attestations on Ethereum BuilderNet.
- **Whisper Leak** (Nov 2025, Microsoft Research): Infers prompt topics from encrypted LLM traffic via packet timing/size. >98% accuracy across 28 LLMs.
- **Code inside the TEE matters**: TEE protects from host, not from malicious code inside the enclave.

### For memory sharing specifically
TEE ensures the node operator can't read the raw fragment. But the agent WILL use the fragment in generating visible outputs. The real question: "how much of the original memory content leaks through observable behavior?" TEEs don't answer this.

## Alternatives

- **FHE**: Orders of magnitude too slow for interactive LLM inference. Not hackathon-viable.
- **MPC**: Requires per-token interaction. Not viable for full inference. OK for narrow operations.
- **Differential privacy on fragments**: Tension between utility and privacy — useful memories contain specific information that DP removes. Weak guarantees for this use case.
- **"Share abstractions, accept imperfect privacy"**: The most practical approach. Share derived patterns, not raw context. Privacy from information loss in abstraction, not from cryptography. **Hackathon-viable.**
- **Hybrid: TEE for processing + abstraction for sharing**: Run summarization/abstraction step inside TEE. Raw memory never leaves; only abstractions do. **Best of both, hackathon-viable with Phala dstack.**

## Closest Academic Work
- **Collaborative Memory** (ICML 2025, arxiv 2505.18279): Two-tier memory (private + shared), dynamic access controls as bipartite graphs, immutable metadata per fragment. Software access controls, not TEEs.
- **Unveiling Privacy Risks in LLM Agent Memory** (ACL 2025): Demonstrates memory extraction attacks against agent memory systems.

## Hackathon Assessment

### Achievable in 3 days
1. Deploy agent inside TEE via Phala dstack (Docker-based, half day)
2. Memory sharing flow: fragment loaded into agent context inside TEE, inference happens in enclave (1-2 days)
3. Abstraction-based privacy: summarize/strip PII inside TEE before sharing (half day)
4. Show attestation proof that memory was processed in genuine enclave

### Research problems (not solvable)
- Output-channel leakage prevention
- FHE-based inference
- Formal privacy guarantees for memory abstractions
- TEE hardware security (TEE.fail)
- Side-channel resistance for LLM inference
