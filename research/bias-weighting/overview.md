# Bias Weighting in AI Agents and Neural Networks

**Prepared for:** Hackathon project -- Autonomous research agent with bias-corrected problem graphs
**Date:** 2026-03-18
**Status:** Background research (preparatory)

---

## Table of Contents

1. [Levent Sagun's Work on Loss Geometry and Bias](#1-levent-saguns-work-on-loss-geometry-and-bias)
2. [Training Data Bias Measurement](#2-training-data-bias-measurement)
3. [Bias in Agent Decision-Making](#3-bias-in-agent-decision-making)
4. [Debiasing Approaches Relevant to Our Use Case](#4-debiasing-approaches-relevant-to-our-use-case)
5. [Open Problems and Gaps](#5-open-problems-and-gaps)
6. [Research Notes](#6-research-notes)

---

## 1. Levent Sagun's Work on Loss Geometry and Bias

Levent Sagun (affiliated with FAIR / Meta AI Research) has published extensively on loss surface geometry, Hessian spectrum analysis, and their connections to generalization, overfitting, and bias in neural networks. His work spans from foundational Hessian analysis to fairness-oriented evaluation and graph-level bias amplification.

### 1.1 Foundational Hessian Analysis

#### "Eigenvalues of the Hessian in Deep Learning: Singularity and Beyond"
- **Authors:** Levent Sagun, Leon Bottou, Yann LeCun
- **Year:** 2016 (arXiv:1611.07476, revised 2017)
- **Key findings:**
  - The eigenvalue distribution of the Hessian of neural network loss functions is composed of two parts: a **bulk** concentrated around zero, and **edges** (outliers) scattered away from zero.
  - The bulk reflects the degree to which the network is **over-parametrized** (more parameters than needed).
  - The edge eigenvalues depend on the **structure of the input data**, not the model architecture.
  - This decomposition holds both before and after training, suggesting that the loss landscape's fundamental geometry is determined by the data-model interaction from the start.

#### "Empirical Analysis of the Hessian of Over-Parametrized Neural Networks"
- **Authors:** Levent Sagun, Utku Evci, V. Ugur Guney, Yann Dauphin, Leon Bottou
- **Year:** 2017 (arXiv:1706.04454)
- **Key findings:**
  - Fixing data and increasing parameters merely scales the bulk of the Hessian spectrum.
  - Fixing the dimension and changing the data (e.g., adding more clusters, making data less separable) only affects the outlier eigenvalues.
  - The small number of large eigenvalues can be linked to the **spectrum of the covariance matrix of gradients of model outputs** -- meaning data distribution directly shapes the curvature of the loss.
  - Small-batch and large-batch gradient descent appear to converge to different basins of attraction but are in fact connected through their flat region. This challenges conventional wisdom about the relationship between batch size, minima sharpness, and generalization bias.

**Relevance to our project:** The Hessian spectrum provides a potential diagnostic tool for measuring how strongly a model's loss landscape is shaped by particular data distributions. High-eigenvalue directions correspond to data-dependent features -- if a model is biased toward certain training data patterns, this should be visible in the outlier eigenvalues. This could inform a "bias signature" in the loss geometry.

### 1.2 Overfitting, Generalization, and Triple Descent

#### "Triple Descent and the Two Kinds of Overfitting: Where & Why Do They Appear?"
- **Authors:** Stephane d'Ascoli, Levent Sagun, Giulio Biroli
- **Year:** 2020 (NeurIPS 2020)
- **Key findings:**
  - There are two distinct kinds of overfitting in neural networks:
    1. A **nonlinear peak** at N~P (number of training samples ~ number of parameters), caused by extreme sensitivity of the output function to noise and initialization. This survives even in the absence of noise and can be suppressed by regularization.
    2. A **linear peak** at N~D (number of training samples ~ input dimension), solely due to overfitting the noise in labels. This forms earlier during training.
  - Both peaks can co-exist, producing a "triple descent" curve.
  - The relative size of the peaks is governed by the degree of nonlinearity of the activation function.

**Relevance:** Understanding where overfitting occurs and why is critical for understanding when a model's outputs are driven by genuine patterns vs. noise/frequency artifacts in the training data.

### 1.3 Direct Fairness and Bias Work

#### "Fairness Indicators for Systematic Assessments of Visual Feature Extractors"
- **Authors:** Priya Goyal, Adriana Romero Soriano, Caner Hazirbas, Levent Sagun, Nicolas Usunier
- **Year:** 2022 (FAccT 2022)
- **Key findings:**
  - Proposed three fairness indicators for visual systems, quantifying:
    1. **Harmful label associations** (e.g., associating certain demographics with negative labels)
    2. **Disparity in learned representations** of social and demographic traits
    3. **Biased performance on geographically diverse images**
  - Uses existing publicly available datasets collected for fairness evaluations.
  - Provides a systematic framework for assessing bias in feature extractors, which are upstream of many downstream tasks.

#### "Networked Inequality: Preferential Attachment Bias in Graph Neural Network Link Prediction"
- **Authors:** Arjun Subramonian, Levent Sagun, Yizhou Sun
- **Year:** 2023 (arXiv:2309.17417; published ICML 2024)
- **Key findings:**
  - GNNs used for link prediction in citation, collaboration, and social networks exhibit **within-group preferential attachment bias** -- a "rich get richer" dynamic.
  - Theoretically proved that GCNs with a symmetric normalized graph filter have this bias.
  - Proposed a new within-group fairness metric.
  - Validated findings on real-world citation, collaboration, and social networks.

**Relevance to our project:** This is directly applicable. If our agent builds problem graphs and ranks nodes/edges, preferential attachment bias means popular/well-connected problems will be further amplified. Sagun's fairness metric could be adapted for our problem graph.

### 1.4 Other Relevant Work by Sagun

- **"ConViT: Improving Vision Transformers with Soft Convolutional Inductive Biases"** (ICML 2021) -- Explores how architectural inductive biases interact with learned representations.
- **"On the Interplay Between Data Structure and Loss Function in Classification Problems"** (NeurIPS 2021, with d'Ascoli, Gabrie, Biroli) -- Studies how data structure shapes what the model learns.
- **"Vision Models Are More Robust And Fair When Pretrained On Uncurated Images Without Supervision"** (2022) -- Evidence that curated datasets introduce bias, while uncurated pretraining can improve fairness.

---

## 2. Training Data Bias Measurement

### 2.1 Frequency-Based Approaches

**Token and concept frequency analysis** is the most straightforward method for detecting overrepresentation:

- **Demographic frequency counting:** Statistical measurement of the distribution of demographic attributes (or any category of interest) within a dataset. Key metrics include relative frequency of each group, variance in representation, and frequency ratios. Histograms and distribution tables reveal which concepts are overrepresented or underrepresented.
- **Label frequency analysis:** Examining how often particular labels co-occur with particular features or demographics. Unequal co-occurrence rates indicate representation bias.
- **N-gram and token frequency:** In text corpora, measuring how often terms associated with particular groups, concepts, or solutions appear. Overrepresented tokens lead to higher parametric confidence in those concepts during generation.

**Key finding (2025):** "LLMs are Frequency Pattern Learners in Natural Language Inference" (arXiv:2505.21011) demonstrated that fine-tuned LLMs exhibit significantly increased reliance on frequency bias in NLI datasets, where predicates in hypotheses occur more frequently than those in premises for positive instances. This confirms that frequency patterns in training data directly shape model behavior.

### 2.2 Embedding Space Analysis

#### Word Embedding Association Test (WEAT)
- **Authors:** Aylin Caliskan, Joanna J. Bryson, Arvind Narayanan
- **Year:** 2017 (arXiv:1608.07187)
- **Methodology:**
  - Inspired by the Implicit Association Test (IAT) for humans.
  - Measures cosine similarity between two sets of target words (e.g., European vs. African names) and two sets of attribute words (e.g., pleasant vs. unpleasant).
  - For each target word x, computes the difference in mean cosine similarity to attribute group A vs. attribute group B.
  - Reports an effect size (number of standard deviations separating the two target groups) and a p-value from a permutation test.
  - Demonstrated that word embeddings trained on large public corpora (Wikipedia, Google News) consistently replicate known human biases measured by the IAT.

#### Sentence Embedding Association Test (SEAT)
- **Authors:** Chandler May, Alex Wang, et al.
- **Year:** 2019 (arXiv:1903.10561)
- **Extension of WEAT to contextualized embeddings:** Target and attribute words are inserted into semantically bleached templates (e.g., "This is [WORD]"). Sentence embeddings replace word embeddings; otherwise scoring is identical to WEAT.

#### Embedding Clustering and Representation Density
- Clustering analysis of embedding spaces can reveal whether certain demographic groups or concepts are more tightly clustered (well-represented) vs. diffuse (underrepresented).
- Representation density analysis measures the volume of embedding space occupied by different categories, revealing structural biases in learned representations.
- Voxel51 (2025) demonstrated that comparing embeddings of real vs. synthetic data reveals distribution biases, with embeddings providing a direct window into what the model "sees."

#### Concept Projection
- A maximum-margin support vector classifier can learn a semantic property subspace (e.g., valence/pleasantness) from contextualized embeddings, onto which other embeddings can be projected to measure bias along that dimension.

### 2.3 Probing Classifiers and Behavioral Testing

#### Probing Classifiers
- **Survey:** "Probing Classifiers: Promises, Shortcomings, and Advances" (Belinkov, 2022, Computational Linguistics, MIT Press)
- **Method:** Train a separate classifier on top of a pre-trained model's internal representations to predict specific properties (e.g., gender, sentiment, syntactic features). If the probe achieves high accuracy, the model has encoded that information.
- **For bias detection:** Probes can reveal whether protected attributes (gender, race, etc.) are encoded in representations even when not task-relevant, indicating learned bias.
- **Limitation:** Probing classifiers can be unreliable for concept removal and detection (Ravfogel et al., NeurIPS 2022). High probe accuracy might reflect the probe's own capacity rather than the model's representations.
- **Byproduct benefit:** Probing methods can produce a representation that is unaffected by the tested concept, useful for debiasing.

#### Behavioral Testing
- **Social Group Substitutions (SGS):** Generate text about a topic, then substitute group-identifying terms with alternatives for other social groups. Compare outputs to detect differential treatment.
- **HONEST benchmark:** Measures the proportion of sentences containing potentially offensive words among LLM-generated sentences, after substituting demographic terms.
- **Sentiment analysis:** Assess whether model outputs express systematically different sentiment when discussing different demographic groups or topics.

### 2.4 Benchmark Suites

#### BBQ (Bias Benchmark for Question Answering)
- **Authors:** Alicia Parrish, Angelica Chen, et al.
- **Year:** 2022 (ACL Findings, arXiv:2110.08193)
- **Scope:** 58,000 unique trinary-choice questions spanning nine social dimensions (age, race, gender, etc.) relevant for U.S. English-speaking contexts.
- **Design:** Each question set includes an ambiguous context (where the correct answer is "unknown") and a disambiguated context. Bias is measured by whether models default to stereotypical answers under ambiguity.
- **Recent extensions (2024-2025):**
  - MBBQ (Dutch, Spanish, Turkish), BharatBBQ (eight Indian languages), KoBBQ (Korean), JBBQ (Japanese), GG-BBQ (German), BasqBBQ (Basque), EsBBQ/CaBBQ (Spanish/Catalan), PBBQ (Persian), PakBBQ (English/Urdu)
  - **Open-BBQ** (Liu et al., 2024; Jin et al., 2025): BBQ-style multiple-choice metrics do not reliably transfer to open-ended (generative) QA. Models produce more biased outputs in generative settings than in constrained MCQ settings.
  - **Implicit BBQ** (2025, arXiv:2512.06732): Extends BBQ to detect implicit rather than explicit biases.

#### WinoBias / Winogender
- Minimal pair corpora based on coreference resolution tasks.
- WinoBias (Zhao et al., 2018) tests gender bias using gender pronouns (he/she/they) in occupational contexts.
- Limited to binary gender and English-language pronoun structures.

#### Other Benchmark Suites
- **CrowS-Pairs:** Measures stereotypical bias across nine categories using minimal pairs.
- **StereoSet:** Measures stereotypical bias at both sentence and discourse levels.
- **RealToxicityPrompts:** Measures toxicity generation across different demographic prompts.

### 2.5 Bias Measurement in LLM Outputs Specifically

#### Generative Output Analysis
- **"Generalization Bias in Large Language Model Summarization of Scientific Research"** (Royal Society Open Science, 2025): LLMs exhibit systematic generalization bias when summarizing scientific papers, over-emphasizing common/well-documented findings and under-representing nuanced or minority findings.

#### Source Framing Bias
- **"Source Framing Triggers Systematic Bias in Large Language Models"** (Germani & Spitale, Science Advances, 2025):
  - Tested four LLMs (OpenAI o3-mini, Deepseek Reasoner, xAI Grok 2, Mistral) on 4,800 narrative statements across 24 topics (192,000 total assessments).
  - In blind conditions: over 90% inter-model agreement.
  - When source framing is introduced (e.g., attributing text to "a person from China"), agreement scores dropped dramatically (from 95% to 15% in extreme cases).
  - Demonstrates that LLMs are systematically biased by source attribution, with implications for any agent that processes attributed information.

#### Citation Bias in LLM Outputs
- **"Large Language Models Reflect Human Citation Patterns with a Heightened Citation Bias"** (Algaba et al., 2024, arXiv:2405.15739):
  - Tested GPT-4, GPT-4o, and Claude 3.5 on citation recommendation tasks.
  - LLMs preferentially retrieve highly cited works, amplifying the Matthew effect ("rich get richer").
  - Median cited-by counts for LLM-recommended references are significantly higher than field-level medians.
  - LLMs do not sample uniformly from their training distributions.
- **"Who Gets Cited? Gender- and Majority-Bias in LLM-Driven Reference Selection"** (arXiv:2508.02740, 2025):
  - Found persistent preference for male-authored references.
  - Majority-group bias favors whichever gender is more prevalent in the candidate pool.

---

## 3. Bias in Agent Decision-Making

### 3.1 How Training Data Bias Propagates Through Agent Reasoning Loops

Agent systems that use LLMs for reasoning operate in a **think-act-observe loop**: the agent reasons about a task, takes an action, observes the result, and iterates. Bias propagates through this loop at every stage:

1. **Reasoning phase:** The LLM's parametric knowledge overrepresents popular, well-documented, Western, and high-frequency concepts. When generating candidate solutions or plans, the model disproportionately surfaces overrepresented options.
2. **Action selection:** If the agent ranks or scores options using the LLM, frequency bias in parametric knowledge directly influences which actions are chosen.
3. **Observation interpretation:** When the agent processes feedback, it interprets results through the same biased lens, potentially discounting evidence that contradicts its parametric priors.
4. **Feedback loops:** AI systems that use biased results as input data for future decision-making create a feedback loop that reinforces bias over time (ACM FAccT 2023 classification of feedback loops in automated decision-making).

### 3.2 Agents Defaulting to Overrepresented Solutions

- **Frequency bias as a mechanism:** "LLMs are Frequency Pattern Learners" (2025) shows that models learn frequency patterns from datasets and exploit them for inference. Fine-tuning amplifies this reliance. An agent fine-tuned on task-specific data will increasingly default to solutions that were frequent in that data.
- **Parametric knowledge dominance:** Closed-book accuracy is strongly influenced by answer frequency in the pre-training data. Even when external evidence is provided, models are more accurate on answers seen during pretraining, demonstrating that parametric and external knowledge are complementary but parametric knowledge exerts a strong pull.
- **Overrepresentation of popular knowledge:** LLMs overrepresent common, well-documented, Western/online topics and present those as the primary answer; niche or local details may be thin or fabricated (hallucinated). For an autonomous research agent, this means the agent will systematically favor well-known problems, methods, and frameworks over novel or underrepresented alternatives.

### 3.3 Citation Bias and Literature Bias in AI-Assisted Research

This is one of the most directly relevant areas for our project:

- LLMs amplify existing citation biases, preferentially recommending highly cited papers (Algaba et al., 2024). The Matthew effect is heightened: already-prominent research becomes even more visible.
- Gender bias compounds citation bias: male-authored papers are systematically preferred (arXiv:2508.02740, 2025).
- **Implication for research agents:** An agent that builds problem graphs from literature will inherit and amplify citation network biases. Problems associated with highly cited papers will appear more central and important than they may actually be. This is structurally identical to the preferential attachment bias Sagun identified in GNN link prediction.

### 3.4 Detecting When Agent Recommendations Are Frequency-Driven vs. Quality-Driven

This is an area with relatively little direct research, but several approaches can be synthesized:

- **Confidence calibration analysis:** If an agent's confidence on a recommendation is disproportionately high relative to the evidence provided, this may indicate parametric frequency bias rather than evidence-based reasoning. LLMs are overconfident in 84.3% of scenarios (2025 study on confidence gaps).
- **Counterfactual testing:** Present the agent with the same problem framed in terms of an overrepresented concept vs. an underrepresented one. If recommendations change based on framing rather than substance, frequency bias is driving the output.
- **Source ablation:** Remove or replace source attributions and measure whether rankings change (inspired by Germani & Spitale, 2025).
- **Retrieval grounding comparison:** Compare agent recommendations with and without retrieval augmentation. Divergence between parametric-only and retrieval-grounded answers indicates where the model's parametric biases are strongest.

---

## 4. Debiasing Approaches Relevant to Our Use Case

Our target: an agent that can identify when its own problem-ranking is biased by training data, and correct for it.

### 4.1 Calibration Methods

#### Temperature Scaling
- A single temperature parameter adjusts the softmax distribution to reduce overconfidence.
- Simple and fast, but less effective under data/domain shift.
- **Adaptive Temperature Scaling (ATS)** (2024, EMNLP): Yields significant improvements over static temperature scaling for multiple model families.
- **Selective Logit Smoothing (SLS)** (ICLR 2025): Scalar temperature scaling paired with appropriate loss functions can improve semantic calibration.

#### Platt Scaling / Isotonic Regression
- Classical post-hoc calibration methods that fit a logistic regression or isotonic regression on a held-out calibration set.
- Not originally designed for LLMs in distractor-rich or open-ended settings; applicability to large-scale LLMs under real-world conditions remains unclear.

#### Confidence Estimation
- **"A Survey of Confidence Estimation and Calibration in LLMs"** (NAACL 2024): Comprehensive survey of methods.
- **"Your Pre-trained LLM is Secretly an Unsupervised Confidence Calibrator"** (arXiv:2505.16690, 2025): Shows that pre-trained LLMs can be used for confidence calibration without supervised calibration data.
- **Key problem:** RLHF-trained LLMs tend to exhibit overconfidence (84.3% of scenarios), potentially due to sharpened output distributions during RLHF. This means calibration is particularly important for agent systems that use RLHF-trained models.

#### Relevance to Our Use Case
Calibration can help the agent express appropriate uncertainty when its recommendations may be frequency-driven. If the agent's confidence is systematically higher for overrepresented topics, calibration can normalize this. However, calibration alone does not tell the agent *why* it is confident -- it just adjusts the numbers.

### 4.2 Adversarial Debiasing

#### Adversarial Probing and Removal
- Train an adversarial classifier that tries to predict protected attributes from the model's internal representations. The model is then trained to make the adversary's task impossible, removing the biased information from representations.
- Limitation: Ravfogel et al. (NeurIPS 2022) showed probing classifiers can be unreliable for concept removal, meaning adversarial removal may be incomplete.

#### Adversarial Robustness Benchmarking
- **"Benchmarking Adversarial Robustness to Bias Elicitation in Large Language Models"** (Machine Learning, Springer, 2025): Proposed systematic benchmarking framework that assesses LLM robustness through probing and jailbreak techniques designed to elicit biased outputs.
- **Adaptive Bias-Eliciting Questions** (ETH Zurich, 2025): Framework for automatically generating questions that expose model biases.

#### Relevance to Our Use Case
Adversarial approaches could be used to test whether the agent's problem rankings change under adversarial perturbations. If small changes to problem descriptions cause large ranking shifts, the ranking may be fragile and frequency-dependent rather than substantively grounded.

### 4.3 Multi-Agent Cross-Checking

This is the most promising approach area for our use case.

#### Multi-LLM Debiasing Framework
- **Authors:** Deonna M. Owens, Ryan A. Rossi, Sungchul Kim, Tong Yu, Franck Dernoncourt, et al.
- **Year:** 2024 (arXiv:2409.13884)
- **Two approaches:**
  1. **Centralized:** One primary LLM orchestrates conversation among all participating models.
  2. **Decentralized:** All models communicate directly without a controlling entity.
- **Key finding:** Multi-LLM framework significantly reduces bias compared to single-model baselines across multiple demographic groups.

#### MADERA: Multi-Agent Debiasing with Evidence Retrieval
- **Presented at:** AAAI 2024 Symposium, "Towards Fairer AI: Multi-Agent Debiasing of LLMs With Online Evidence Retrieval"
- **Architecture:**
  1. **Solver Agent:** Generates initial answer and reasoning chain.
  2. **Judge Agent:** Scores each reasoning step for bias and contextual relevance, explains rationale for flagged bias.
  3. **Rephrase Agent:** Rephrases biased reasoning (using internal knowledge in baseline mode).
  4. **Search Agent:** (Enhanced mode) Retrieves web evidence when bias is detected; Rephrase Agent incorporates this evidence.
- **Two modes:**
  - Baseline: Solver -> Judge -> Rephrase (internal knowledge only)
  - Enhanced: Solver -> Judge -> Search -> Rephrase (with external evidence grounding)

#### Multi-Agent Debate Frameworks
- **"Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate"** (EMNLP 2024): Multiple LLMs debate to encourage diverse perspectives.
- **MAD-Fact** (arXiv:2510.22967, 2025): Multi-agent debate for long-form factuality evaluation.
- **Multi-Agent-as-Judge** (arXiv:2507.21028, 2025): Multiple agents serve as evaluators, aligning with multi-dimensional human evaluation.

#### Relevance to Our Use Case
The MADERA architecture is highly relevant. We could adapt it: a Solver agent proposes a problem ranking, a Judge agent evaluates each ranking decision for frequency bias, a Search agent grounds judgments in external evidence, and a Rephrase agent produces a corrected ranking. The multi-agent debate approach adds a further layer where multiple models with different training data distributions can cross-check each other's biases.

### 4.4 Retrieval-Augmented Approaches

#### Core Mechanism
RAG combines parametric memory (learned during pre-training) with non-parametric evidence (retrieved on demand). By grounding outputs in retrieved documents, RAG reduces reliance on potentially biased parametric knowledge.

#### Effectiveness and Limitations
- RAG reduces hallucinations caused by insufficient parametric knowledge.
- However, even with accurate retrieved content, models can still produce hallucinations by generating outputs that conflict with the retrieved information.
- **Mechanistic insight (ReDeEP, 2025):** Hallucinations occur when Knowledge FFNs in LLMs overemphasize parametric knowledge in the residual stream, while Copying Heads fail to effectively retain external knowledge. This suggests a structural tension between parametric and retrieved knowledge.
- **MEGA-RAG (2025):** Multi-evidence guided answer refinement framework specifically designed to mitigate hallucinations through multiple evidence sources.
- **RAGTruth (Niu et al., 2024):** Benchmark and evaluation protocol for hallucination detection in RAG systems.

#### RAG-Specific Bias Concerns
- RAG introduces new bias effects: the retrieved documents themselves may be biased, and the retrieval mechanism may have its own frequency biases (preferring documents with certain keywords, from certain sources, etc.).
- Quality control of retrieved data is critical -- sources may contain counterfactual or false information.

#### Relevance to Our Use Case
RAG is essential for our agent. When the agent ranks problems, it should retrieve evidence (papers, datasets, benchmarks) rather than relying solely on parametric knowledge. However, the retrieval mechanism itself needs bias correction -- we need to ensure the retriever does not simply amplify the same citation biases that exist in the parametric knowledge.

---

## 5. Open Problems and Gaps

### 5.1 Fundamental Unsolved Problems

1. **No reliable method to distinguish frequency-driven vs. quality-driven recommendations in LLM agents.** Current approaches (calibration, counterfactual testing) are indirect proxies. There is no established methodology for decomposing an agent's ranking into "what it learned from data frequency" vs. "what it learned from actual quality signals."

2. **Calibration methods were not designed for agentic settings.** Temperature scaling, Platt scaling, and isotonic regression were developed for classification tasks. Their applicability to multi-step reasoning chains in autonomous agents is unclear and largely untested.

3. **Feedback loop dynamics in agent systems are poorly understood.** While feedback loops in recommendation systems are well-studied, feedback loops in LLM agents that iteratively refine their own reasoning are a newer phenomenon with limited formal analysis.

4. **Bias benchmarks are predominantly English-centric and classification-oriented.** Despite multilingual extensions of BBQ, most bias measurement tools assume English text and multiple-choice formats. Open-ended generative settings (which are how agents actually operate) produce systematically different (often more biased) outputs.

5. **Adversarial debiasing may be incomplete.** Probing classifiers are unreliable for concept removal (Ravfogel et al., 2022), meaning adversarial approaches may leave residual bias that is harder to detect.

### 5.2 Gaps Specific to Our Use Case

6. **No existing framework for bias-corrected problem graphs.** The intersection of graph-based problem representation and LLM bias correction is unexplored. Sagun's work on preferential attachment bias in GNNs is the closest, but it addresses link prediction, not problem ranking.

7. **Self-awareness of bias in agents is nascent.** While MADERA and multi-agent debate show promise, these are external correction mechanisms. An agent that can introspect on whether its own rankings are frequency-biased -- and explain *why* -- does not yet exist.

8. **Tension between parametric and retrieved knowledge is unresolved.** ReDeEP (2025) identified the mechanistic basis (Knowledge FFNs vs. Copying Heads), but practical methods for controlling this tension in agentic settings are lacking.

9. **Evaluation methodology gap.** There is no established benchmark for measuring whether an agent's problem-ranking is biased by training data. We would need to construct evaluation tasks where we know the "true" importance ranking of problems and can compare it against the agent's ranking.

10. **Cross-domain bias transfer.** When an agent trained on one domain (e.g., ML research) is applied to another (e.g., materials science), how do frequency biases transfer? This is unstudied.

### 5.3 Opportunities for Our Hackathon Project

- **Combine Sagun's Hessian spectrum analysis with agent introspection:** Use eigenvalue analysis of the loss landscape as a signal for which features/concepts the model is most sensitive to, and flag these as potential bias hotspots.
- **Adapt MADERA for problem graph construction:** Replace the QA pipeline with a problem-ranking pipeline, using Judge and Search agents to evaluate and correct the Solver's rankings.
- **Build on preferential attachment bias detection:** Apply Sagun's within-group fairness metric to our problem graph to detect and correct for "rich get richer" dynamics.
- **Hybrid RAG + calibration:** Use retrieval to ground problem importance in evidence, and calibration to normalize confidence scores across well-represented and underrepresented problems.
- **Develop a "bias decomposition" metric:** Attempt to separate frequency-driven importance from evidence-driven importance, even if imperfect, as a research contribution.

---

## 6. Research Notes

### Papers Successfully Accessed and Summarized
- Sagun et al., "Eigenvalues of the Hessian in Deep Learning" (2016) -- arXiv
- Sagun et al., "Empirical Analysis of the Hessian of Over-Parametrized Neural Networks" (2017) -- arXiv
- d'Ascoli, Sagun, Biroli, "Triple Descent" (NeurIPS 2020) -- proceedings
- Goyal, Romero Soriano, Hazirbas, Sagun, Usunier, "Fairness Indicators" (FAccT 2022) -- ACM/arXiv
- Subramonian, Sagun, Sun, "Networked Inequality" (ICML 2024) -- arXiv/PMLR
- Owens et al., "A Multi-LLM Debiasing Framework" (2024) -- arXiv
- MADERA framework (AAAI 2024 Symposium) -- AAAI proceedings
- Algaba et al., "LLMs Reflect Human Citation Patterns" (2024) -- arXiv
- Germani & Spitale, "Source Framing" (Science Advances, 2025)
- Caliskan et al., WEAT (2017) -- arXiv
- May et al., SEAT (2019) -- arXiv
- Parrish et al., BBQ (ACL 2022) -- arXiv
- Belinkov, "Probing Classifiers" (Computational Linguistics, 2022) -- MIT Press

### Limitations and Caveats
- **Full-text access:** Most papers were accessed via arXiv or open-access venues. Some Springer and ACM papers could only be accessed via abstracts and summaries, not full text.
- **Recency bias in this review:** The search naturally surfaces recent (2024-2025) work more readily. Older foundational work (e.g., Bolukbasi et al., 2016 on debiasing word embeddings; Bender et al., 2021 "Stochastic Parrots") is not covered in depth here but is relevant background.
- **Rapidly evolving field:** LLM agent bias is a fast-moving area. Papers from late 2025 and early 2026 may contain significant advances not captured here.
- **Conflicting findings on calibration:** There is disagreement about whether classical calibration methods (temperature/Platt scaling) are effective for modern LLMs in real-world settings. Some papers report significant improvements; others find them inadequate for distractor-rich or open-ended scenarios.
- **MADERA details:** The MADERA paper was accessed via AAAI proceedings but the full experimental results were only partially extractable from the available PDF. The framework architecture is well-documented but quantitative results may need verification from the full paper.
- **Sagun's most recent work (2024-2026):** The search did not surface publications by Sagun from 2024 onward. He may have more recent work that was not indexed or was behind paywalls.

### Key Sources for Further Reading
- Sagun's Google Scholar profile: https://scholar.google.com/citations?user=-iPZaBcAAAAJ
- Sagun's GitHub (Hessian computation tools): https://github.com/leventsagun/hessian-for-basicDL
- "Bias and Fairness in Large Language Models: A Survey" (Gallegos et al., Computational Linguistics, MIT Press, 2024) -- comprehensive survey covering the full landscape
- "Bias in Large Language Models: Origin, Evaluation, and Mitigation" (arXiv:2411.10915, 2024) -- categorizes mitigation into pre-model, intra-model, and post-model techniques
- "Towards Trustworthy LLMs: A Review on Debiasing and Dehallucinating" (Artificial Intelligence Review, Springer, 2024) -- covers debiasing and hallucination mitigation together
