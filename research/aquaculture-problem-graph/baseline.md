# Aquaculture Problem Graph — Baseline (Claude 4.6, no tools)

Generated: 2026-03-18
Model: Claude Opus 4.6 (1M context), zero-shot from training knowledge only.
Purpose: Establish a baseline of what the model knows before augmenting with tools, databases, and domain experts.

---

## 1. Domain Overview

Global aquaculture produces roughly 130 million tonnes of aquatic animals and plants annually (FAO 2022 data, likely higher by 2026), surpassing wild-capture fisheries as the primary source of seafood for human consumption. The sector employs tens of millions of people directly and hundreds of millions along value chains, disproportionately in low- and middle-income countries.

**Major species groups (by volume):**
- Freshwater finfish: carps (grass carp, silver carp, bighead carp, common carp) dominate global volume. Tilapia (Oreochromis spp.) is the second-largest freshwater group.
- Marine/brackish shrimp: whiteleg shrimp (Litopenaeus vannamei) and black tiger shrimp (Penaeus monodon).
- Salmonids: Atlantic salmon (Salmo salar), rainbow trout (Oncorhynchus mykiss) — smaller by volume but massive by value.
- Seaweeds: ~35 million tonnes, mostly in East and Southeast Asia.
- Bivalves: oysters, mussels, clams, scallops.
- Other marine finfish: sea bass, sea bream, cobia, grouper, yellowtail.
- Emerging species: pangasius (Pangasianodon hypophthalmus), barramundi, various freshwater species in Africa.

**Key producing regions (by volume):**
1. China (~57-60% of global production)
2. India, Indonesia, Vietnam, Bangladesh, Egypt (collectively ~25%)
3. Norway, Chile (dominant in salmonids by value)
4. Thailand, Ecuador (shrimp)
5. South Korea, Japan, Philippines (seaweed, shellfish)

**Why it matters:**
- Food security for ~3 billion people who depend on aquatic foods for protein.
- Fastest-growing food production sector for four decades.
- Lower feed conversion ratios than terrestrial livestock for most species (fish are poikilotherms, don't fight gravity).
- But: environmental externalities (effluent, habitat conversion, escapees, disease transfer to wild populations, antibiotic use, carbon footprint of feeds) are significant and growing.

---

## 2. Problem Graph

### Node 1: Early Disease Detection and Prediction

- **Description:** Infectious diseases (viral, bacterial, parasitic, fungal) cause estimated losses of $6-10 billion/year globally. Current detection is often reactive — farmers notice mortality spikes, then diagnose. The goal is to shift toward predictive models that flag disease risk before clinical signs appear, using environmental, behavioral, and molecular signals.
- **Impact score: 9/10** — Disease is the single largest cause of economic loss in aquaculture.
- **Agent do-ability: 7/10** — Amenable to ML/time-series modeling. Environmental and production data exist in structured form for industrial operations (Norway, Chile, Scotland). Genomic pathogen data increasingly available (NCBI, EBI). Bottleneck: data from small-scale tropical aquaculture is sparse.
- **Verifiability: 6/10** — Retrospective validation possible on historical outbreak datasets. Prospective validation requires farm partnerships. Published outbreak datasets exist but are fragmented.
- **Dependencies:** Water Quality Monitoring (Node 5), Genomic Surveillance of Pathogens (Node 3), Environmental Monitoring (Node 6).
- **Known bias flags:**
  - Literature heavily skewed toward salmon (ISA, sea lice, AGD) and shrimp (WSSV, EMS/AHPND, EHP).
  - Diseases of carps, tilapia, and catfish in Asia/Africa are vastly understudied relative to their economic importance.
  - Diagnostic tools validated primarily in temperate species; tropical pathogen diversity is poorly characterized.
  - Pharmaceutical company funding biases research toward treatable diseases rather than prevention.

### Node 2: Antimicrobial Resistance (AMR) in Aquaculture

- **Description:** Aquaculture is a significant contributor to global AMR through prophylactic and therapeutic antibiotic use, particularly in shrimp and freshwater fish farming in Southeast Asia, China, and South America. Resistant genes transfer to human pathogens via environment and food chain.
- **Impact score: 8/10** — AMR is a civilizational-scale threat; aquaculture is an underappreciated reservoir.
- **Agent do-ability: 6/10** — Metagenomics data from aquaculture environments is growing. Resistance gene databases exist (CARD, ResFinder). An agent could model resistance spread, identify hotspots, and flag supply chains with high AMR risk. Limited by data access from countries with highest use.
- **Verifiability: 5/10** — Can validate resistance gene predictions against sequencing databases. Epidemiological impact harder to verify computationally.
- **Dependencies:** Disease Detection (Node 1), Regulatory/Policy Gaps (Node 17), Supply Chain Traceability (Node 13).
- **Known bias flags:**
  - Research concentrated on a few well-studied antibiotics (oxytetracycline, florfenicol). Broader chemical use poorly documented.
  - Data from China and Vietnam — the largest users — is hard to access and may underreport.
  - "One Health" framing sometimes overstates aquaculture's relative contribution vs. terrestrial livestock and human medicine.

### Node 3: Genomic Surveillance of Aquaculture Pathogens

- **Description:** Tracking pathogen evolution, emergence, and spread using whole-genome sequencing and metagenomics. Analogous to what GISAID did for influenza/SARS-CoV-2, but for aquatic pathogens. Currently no equivalent coordinated global effort.
- **Impact score: 7/10** — Foundational for disease prediction, vaccine design, and biosecurity.
- **Agent do-ability: 8/10** — Primarily computational (phylogenomics, variant calling, epidemiological modeling). Open data exists on NCBI/EBI but is scattered. An agent could build curated databases, phylogenetic trees, and alert systems.
- **Verifiability: 7/10** — Phylogenetic and molecular clock analyses are computationally verifiable. Epidemiological predictions can be checked against known outbreak timelines.
- **Dependencies:** Disease Detection (Node 1), Vaccine Development (Node 4).
- **Known bias flags:**
  - Massive sequencing bias toward salmon viruses (ISAv, PRV, SAV) and shrimp viruses (WSSV, YHV).
  - Bacterial pathogens of warm-water fish (Streptococcus, Aeromonas, Edwardsiella) have far less genomic coverage.
  - Parasites (myxozoans, microsporidians) are genomically neglected despite huge impact.

### Node 4: Vaccine Development and Delivery

- **Description:** Vaccines exist for some bacterial diseases in salmon (vibriosis, furunculosis) but are lacking for most viral diseases across species. Delivery is a bottleneck — injection vaccination is labor-intensive; oral and immersion vaccines have low efficacy. No commercially viable vaccines for shrimp (invertebrates lack adaptive immunity, so "vaccination" means immune priming, not classical immunization).
- **Impact score: 8/10** — Effective vaccines would drastically reduce antibiotic use and mortality.
- **Agent do-ability: 5/10** — Antigen prediction, reverse vaccinology, and epitope mapping are computational. But vaccine validation requires wet lab and field trials. Agent can accelerate discovery phase but not replace it.
- **Verifiability: 4/10** — In-silico antigen predictions can be scored against known immunogenic proteins, but real efficacy requires animal trials.
- **Dependencies:** Genomic Surveillance (Node 3), AMR (Node 2), Immune System Biology (not a separate node but relevant).
- **Known bias flags:**
  - Research overwhelmingly focused on salmonids. Tilapia, carp, and catfish vaccine pipelines are thin.
  - Shrimp "vaccine" literature is confused by the adaptive-vs-innate immunity debate; some overpromise.
  - Commercial vaccine development driven by species with highest per-unit value, not highest total losses.

### Node 5: Water Quality Monitoring and Prediction

- **Description:** Dissolved oxygen, ammonia, nitrite, pH, temperature, salinity, turbidity, and harmful algal bloom (HAB) toxins are critical parameters. Suboptimal water quality is a primary stressor and disease co-factor. Real-time monitoring exists in industrial operations but is rare in small-scale systems.
- **Impact score: 7/10** — Water quality failures cause mass mortality events and chronic sublethal stress.
- **Agent do-ability: 8/10** — Time-series forecasting, anomaly detection, and sensor fusion are well-suited to ML. IoT sensor data is increasingly available. Remote sensing (Sentinel, Landsat) provides large-scale context.
- **Verifiability: 8/10** — Models can be validated against sensor time-series. HAB prediction models can be backtested against satellite imagery and reported bloom events.
- **Dependencies:** Disease Detection (Node 1), Environmental Impact (Node 6), Climate Adaptation (Node 14).
- **Known bias flags:**
  - Sensor and IoT literature dominated by well-funded operations (Norwegian salmon, Israeli RAS). Transferability to earthen pond systems in Bangladesh or Egypt is uncertain.
  - HAB prediction biased toward temperate coastal species (Pseudo-nitzschia, Alexandrium); tropical freshwater blooms understudied.

### Node 6: Environmental Impact Assessment and Mitigation

- **Description:** Aquaculture's externalities include nutrient loading (eutrophication), chemical pollution (antibiotics, antifoulants, pesticides), habitat destruction (mangrove conversion for shrimp ponds), genetic pollution from escapees, benthic impacts under net pens, and carbon footprint of feed supply chains.
- **Impact score: 8/10** — Determines social license to operate and long-term sustainability.
- **Agent do-ability: 7/10** — Life cycle assessment (LCA), nutrient dispersal modeling, genetic introgression modeling are all computational. Data from regulatory reporting (Norway's BarentsWatch, Scotland's SEPA) is partly open.
- **Verifiability: 6/10** — LCA results can be compared against published benchmarks. Dispersal models can be validated against field measurements. But many environmental impacts are context-specific and hard to generalize.
- **Dependencies:** Feed Optimization (Node 7), Siting and Spatial Planning (Node 12), Polyculture/IMTA (Node 11).
- **Known bias flags:**
  - LCA literature dominated by Norwegian salmon. Feed-stage assumptions drive most results but vary enormously by species and region.
  - Mangrove destruction narrative sometimes unfairly concentrated on shrimp when urban development and agriculture are larger drivers.
  - Carbon footprint analyses often omit seaweed and bivalve aquaculture, which can be carbon-negative.

### Node 7: Feed Formulation and Alternative Protein Sources

- **Description:** Feed is 50-70% of operating costs for most fed aquaculture. Traditional reliance on fishmeal and fish oil (FMFO) from wild-capture is ecologically unsustainable and supply-constrained. Alternatives include soy, insect meal (black soldier fly), single-cell proteins (bacteria, yeast, microalgae), fermentation-derived proteins, and various plant-based ingredients. The challenge is matching essential amino acid profiles, palatability, digestibility, and anti-nutritional factors at competitive cost.
- **Impact score: 9/10** — Feed determines both economic viability and environmental footprint.
- **Agent do-ability: 7/10** — Multi-objective optimization of feed formulations is a classic OR/ML problem. Nutrient requirement databases exist (NRC). Growth trial data published in hundreds of papers. An agent could build a meta-analytic engine for optimal inclusion rates.
- **Verifiability: 7/10** — Predicted growth performance, FCR, and nutrient profiles can be validated against published feeding trials. Cost optimization can be verified against commodity price data.
- **Dependencies:** Environmental Impact (Node 6), Fish Health/Disease (Node 1), Gut Microbiome (Node 8).
- **Known bias flags:**
  - Overwhelming focus on salmon and shrimp feed. Carp, tilapia, and catfish feeds are simpler and cheaper but less studied in high-impact journals.
  - "Novel ingredient" papers often funded by ingredient companies; positive publication bias is significant.
  - Insect meal hype cycle may overstate current scalability and cost competitiveness.
  - Soy-based feeds raise deforestation concerns that are sometimes downplayed.

### Node 8: Gut Microbiome and Functional Feeds

- **Description:** The fish/shrimp gut microbiome influences digestion, immune function, and disease resistance. Probiotics, prebiotics, synbiotics, and postbiotics are being explored as feed additives to replace antibiotics and enhance performance. Understanding microbiome assembly and function is still early.
- **Impact score: 6/10** — Potentially transformative but science is immature.
- **Agent do-ability: 7/10** — Metagenomics and 16S analysis are computational. Public datasets on SRA/EBI are growing. Agent could do meta-analysis of microbiome-performance associations.
- **Verifiability: 5/10** — Microbiome composition can be validated; causal links to performance outcomes are harder to verify without controlled trials.
- **Dependencies:** Feed Optimization (Node 7), Disease Detection (Node 1), AMR (Node 2).
- **Known bias flags:**
  - Heavily biased toward salmon and shrimp. Microbiome of carps (the world's most farmed fish) is poorly characterized.
  - Probiotic claims often not replicated across studies; meta-analyses show high heterogeneity.
  - "Gut-brain axis" and similar frameworks borrowed from mammalian medicine may not apply well to fish.

### Node 9: Selective Breeding and Genomic Selection

- **Description:** Genetic improvement through selective breeding programs has dramatically improved growth rates, disease resistance, and feed conversion in a few species (Atlantic salmon, Nile tilapia via GIFT/GenoMar programs, L. vannamei). But most aquaculture species have no organized breeding programs. Genomic selection (using SNP markers) can accelerate genetic gain, particularly for traits that are hard to measure on live candidates (disease resistance, fillet quality, stress tolerance).
- **Impact score: 8/10** — Genetic improvement delivers compounding gains over generations. Under-exploited in most species.
- **Agent do-ability: 7/10** — GBLUP, GWAS, and genomic prediction models are computational. Genotype data increasingly available for major species. Agent could build cross-species genomic prediction frameworks or optimize breeding program designs.
- **Verifiability: 7/10** — Genomic prediction accuracy can be validated via cross-validation on existing datasets. Breeding program simulations can be benchmarked.
- **Dependencies:** Pathogen Genomics (Node 3), Climate Adaptation (Node 14), Welfare (Node 15).
- **Known bias flags:**
  - Literature dominated by Atlantic salmon (by far the most genomically characterized farmed fish). Tilapia genomics growing but still far behind.
  - Breeding programs in carps are mostly in China and not well-published in English.
  - Genomic selection methods assume large reference populations that don't exist for most species.
  - Inbreeding management in closed populations is an underappreciated risk.

### Node 10: Gene Editing and Transgenic Approaches

- **Description:** CRISPR-Cas9 and related tools enable precise gene edits for disease resistance, sterility (to prevent escapee introgression), growth enhancement, and environmental tolerance. Regulatory landscape is fragmented — some jurisdictions treat gene-edited organisms differently from GMOs, others do not.
- **Impact score: 6/10** — High potential but deployment is bottlenecked by regulation and public acceptance.
- **Agent do-ability: 5/10** — Guide RNA design and off-target prediction are computational. Regulatory landscape analysis is text-based. But actual gene editing and phenotyping require wet labs.
- **Verifiability: 5/10** — Guide RNA efficiency can be predicted computationally; phenotypic outcomes cannot.
- **Dependencies:** Selective Breeding (Node 9), Regulatory Gaps (Node 17), Welfare (Node 15).
- **Known bias flags:**
  - AquAdvantage salmon controversy distorts public and regulatory discourse.
  - Most gene editing work in aquaculture species is in model-adjacent species (zebrafish, medaka) with uncertain transferability.
  - Chinese research in this area is extensive but unevenly translated into English-language literature.

### Node 11: Polyculture, IMTA, and Circular Systems

- **Description:** Integrated Multi-Trophic Aquaculture (IMTA) co-cultures fed species (fish) with extractive species (seaweed, bivalves) that absorb waste nutrients. Polyculture of complementary fish species in ponds is traditional in Asia. Aquaponics integrates fish with hydroponic plant production. These systems reduce environmental impact and diversify revenue, but are operationally complex.
- **Impact score: 7/10** — Addresses environmental and economic sustainability simultaneously.
- **Agent do-ability: 6/10** — Nutrient mass-balance modeling, species compatibility analysis, and economic optimization are computational. But system design is highly site-specific.
- **Verifiability: 5/10** — Models can be validated against published IMTA performance data, but data is sparse and systems are heterogeneous.
- **Dependencies:** Environmental Impact (Node 6), Water Quality (Node 5), Feed Optimization (Node 7), Siting (Node 12).
- **Known bias flags:**
  - IMTA literature heavily biased toward Atlantic Canadian and European pilot projects that have struggled to scale commercially.
  - Traditional Asian polyculture (which works at enormous scale) is underrepresented in English-language literature.
  - Aquaponics research disproportionately covered relative to its actual production volume.

### Node 12: Siting, Spatial Planning, and Offshore Expansion

- **Description:** Where to put farms matters enormously for environmental impact, disease transmission, conflict with other ocean users, and farm performance. GIS-based siting models integrate oceanographic, ecological, regulatory, and socioeconomic data. Offshore aquaculture (open ocean, exposed sites) is expanding as nearshore space becomes constrained.
- **Impact score: 7/10** — Poor siting amplifies many other problems; good siting prevents them.
- **Agent do-ability: 8/10** — GIS analysis, hydrodynamic modeling, multi-criteria decision analysis are all computational. Satellite and oceanographic data (Copernicus, NOAA) are open. Regulatory data is text-based and parseable.
- **Verifiability: 7/10** — Siting models can be validated against existing farm locations and performance data. Environmental predictions can be checked against monitoring data.
- **Dependencies:** Environmental Impact (Node 6), Climate Adaptation (Node 14), Disease (Node 1), Regulatory Gaps (Node 17).
- **Known bias flags:**
  - Offshore aquaculture literature driven by technology companies (SalMar, Ocean Farm) and may overstate readiness.
  - Most siting work done in data-rich countries (Norway, Canada, UK). Applicability to data-poor tropical coastlines is limited.
  - Conflict with small-scale fisheries rarely centered in siting analyses.

### Node 13: Supply Chain Traceability and Fraud Detection

- **Description:** Seafood fraud (species substitution, mislabeling of origin, unreported antibiotic use) is estimated at 20-30% of global seafood trade. Traceability from farm to fork is poor. Blockchain, DNA barcoding, isotope analysis, and digital traceability systems are emerging but adoption is low.
- **Impact score: 6/10** — Affects consumer trust, food safety, and market access for legitimate producers.
- **Agent do-ability: 7/10** — Data integration, anomaly detection in trade flows, DNA barcode matching, and document analysis are computational. Trade databases (UN Comtrade, EU RASFF) are open.
- **Verifiability: 6/10** — Fraud detection models can be validated against known fraud cases and forensic datasets. Trade flow anomalies can be cross-referenced.
- **Dependencies:** AMR (Node 2), Regulatory Gaps (Node 17), Certification/Standards (Node 18).
- **Known bias flags:**
  - Fraud estimates vary wildly depending on methodology; some advocacy-driven studies may overestimate.
  - Blockchain hype in seafood traceability often ignores the "garbage in, garbage out" problem at the point of first capture/harvest.
  - Testing and detection research skewed toward high-value species (salmon, tuna, shrimp) where fraud incentives are highest.

### Node 14: Climate Change Adaptation

- **Description:** Warming waters, ocean acidification, changing precipitation patterns, increased extreme weather events, and sea-level rise all affect aquaculture. Impacts include: thermal stress and range shifts for cultured species, increased disease pressure, freshwater scarcity, infrastructure damage, and altered productivity of feed ingredient fisheries. Adaptation strategies include selective breeding for thermal tolerance, species diversification, site relocation, and engineering resilience.
- **Impact score: 8/10** — Existential for the sector in many regions within 20-50 year horizons.
- **Agent do-ability: 7/10** — Climate projection downscaling, species distribution modeling, vulnerability assessment, and adaptation planning are computational. CMIP6 data, SSP scenarios, and species thermal tolerance databases are open.
- **Verifiability: 5/10** — Climate models have known skill levels. Species response predictions can be validated against observed range shifts. But long-term adaptation outcomes are inherently uncertain.
- **Dependencies:** Water Quality (Node 5), Selective Breeding (Node 9), Siting (Node 12), Small-scale Aquaculture (Node 16).
- **Known bias flags:**
  - Climate-aquaculture literature biased toward salmonids (cold-water species near thermal limits) and coral reef-associated fisheries.
  - Freshwater aquaculture in the tropics — where most production and most vulnerable people are — is underrepresented.
  - Adaptation research often techno-optimistic; socioeconomic barriers to adaptation in developing countries are underexplored.

### Node 15: Fish Welfare and Sentience

- **Description:** Growing scientific consensus that fish are sentient and experience pain. Welfare concerns span the entire production cycle: stocking density, handling, transport, stunning/slaughter methods, disease management. Welfare standards exist for some species in some jurisdictions (EU, Norway) but are absent for most global production.
- **Impact score: 6/10** — Increasingly important for social license and market access; ethical imperative independent of market.
- **Agent do-ability: 5/10** — Behavioral analysis from video (computer vision for stress indicators, swimming patterns, feeding behavior) is computational. Welfare indicator databases are emerging. But welfare assessment is inherently multidimensional and context-dependent.
- **Verifiability: 4/10** — Behavioral indicators can be validated against physiological stress measures (cortisol, lactate). But welfare is partly a normative concept — what counts as "good welfare" is not purely empirical.
- **Dependencies:** Disease Detection (Node 1), Selective Breeding (Node 9), Regulatory Gaps (Node 17).
- **Known bias flags:**
  - Research overwhelmingly focused on salmonids. Welfare of shrimp, bivalves, and carps — produced in far greater numbers — is barely studied.
  - The sentience debate is influenced by animal advocacy organizations; some studies may overinterpret behavioral data.
  - Welfare frameworks borrowed from terrestrial livestock may not translate well to aquatic species with very different physiology and ecology.
  - Invertebrate welfare (shrimp, crab, lobster) is a scientific frontier with high uncertainty.

### Node 16: Small-Scale and Developing-World Aquaculture

- **Description:** The majority of global aquaculture by number of operations and employment is small-scale, often in low- and middle-income countries (sub-Saharan Africa, South/Southeast Asia, Egypt). These producers face distinct challenges: limited access to quality seed and feed, poor extension services, lack of cold chains, market access barriers, land/water tenure insecurity, and vulnerability to climate change. Technology transfer from industrial aquaculture is often inappropriate.
- **Impact score: 9/10** — This is where the food security and poverty reduction potential is greatest.
- **Agent do-ability: 4/10** — Data scarcity is the fundamental problem. Satellite imagery and mobile phone data could help. But most interventions require institutional, financial, and physical infrastructure rather than computation.
- **Verifiability: 3/10** — Very limited baseline data to validate against. Household survey data exists (WorldFish, FAO) but is sparse and often outdated.
- **Dependencies:** Feed Optimization (Node 7), Disease Detection (Node 1), Climate Adaptation (Node 14), Regulatory Gaps (Node 17).
- **Known bias flags:**
  - **This is the single largest bias in the entire field.** Most research, most funding, most publications, and most innovation are directed at industrial aquaculture in wealthy countries. Small-scale producers in Africa and Asia receive a fraction of research attention despite being the majority.
  - The "blue revolution" narrative often implicitly means industrialization, which may not serve small-scale producers.
  - WorldFish and similar CGIAR centers produce relevant work but it's less visible in high-impact journals.
  - Gender dimensions (women are heavily involved in small-scale aquaculture processing and trade) are underresearched.

### Node 17: Regulatory Frameworks and Policy Gaps

- **Description:** Aquaculture governance is fragmented across fisheries, environmental, food safety, trade, and animal health agencies. Many countries lack dedicated aquaculture legislation. Regulatory gaps include: unclear licensing processes, inadequate environmental impact assessment requirements, weak enforcement of antibiotic restrictions, missing frameworks for offshore aquaculture and gene editing, and trade barriers that disadvantage developing-country producers.
- **Impact score: 7/10** — Regulation shapes the operating environment for everything else.
- **Agent do-ability: 6/10** — Regulatory text analysis, cross-jurisdictional comparison, gap identification, and policy simulation are computational. Legal/regulatory texts are increasingly digitized.
- **Verifiability: 5/10** — Regulatory gap analyses can be validated against expert assessments. Policy impact predictions are harder to verify.
- **Dependencies:** AMR (Node 2), Environmental Impact (Node 6), Siting (Node 12), Gene Editing (Node 10), Certification (Node 18).
- **Known bias flags:**
  - Literature dominated by EU, Norwegian, and North American regulatory analysis. Regulatory reality in major producing countries (China, India, Vietnam, Indonesia) is poorly described in English.
  - "Good governance" framing sometimes imposes Western regulatory models on contexts where they don't fit.

### Node 18: Certification, Standards, and Market Access

- **Description:** Third-party certification schemes (ASC, BAP/GSA, GlobalG.A.P., organic labels) aim to assure sustainability and food safety but face criticism for cost barriers (excluding small-scale producers), inconsistent standards, audit reliability, and limited environmental additionality. Market access for developing-country producers is constrained by sanitary/phytosanitary (SPS) requirements that may function as non-tariff barriers.
- **Impact score: 5/10** — Important for market structure but not directly solving biological/environmental problems.
- **Agent do-ability: 6/10** — Standard text analysis, audit data mining, and impact assessment are computational. Some audit data is public.
- **Verifiability: 5/10** — Can compare certified vs. uncertified farm performance where data exists. But additionality is hard to establish.
- **Dependencies:** Supply Chain (Node 13), Regulatory Gaps (Node 17), Small-scale Aquaculture (Node 16), Environmental Impact (Node 6).
- **Known bias flags:**
  - ASC/BAP-certified operations are disproportionately large-scale and salmon/shrimp-focused. Certification's relevance to carps and tilapia in domestic markets is questionable.
  - Certification body funding comes from industry fees, creating structural conflicts of interest.

### Node 19: Recirculating Aquaculture Systems (RAS) Engineering

- **Description:** Land-based, closed-containment RAS recirculate and treat water, enabling aquaculture anywhere with lower environmental footprint. But RAS are capital-intensive, energy-intensive, and have experienced high-profile failures (biological crashes, economic nonviability). Key challenges: biofilter management, energy efficiency, waste valorization, off-flavor control, and scaling beyond Atlantic salmon.
- **Impact score: 6/10** — Could decouple aquaculture from coastal environments but currently a small fraction of production.
- **Agent do-ability: 7/10** — Process modeling, biofilter kinetics, energy optimization, and failure prediction are computational. Some operational data available from published case studies and increasingly from sensor systems.
- **Verifiability: 6/10** — Engineering models can be validated against published system performance data. Economic models can be checked against known capital and operating costs.
- **Dependencies:** Water Quality (Node 5), Feed Optimization (Node 7), Environmental Impact (Node 6).
- **Known bias flags:**
  - Enormous investment hype cycle (2020-2025) may have inflated expectations. Several high-profile bankruptcies/failures.
  - Almost exclusively focused on Atlantic salmon and a few high-value species. Economic viability for lower-value species is rarely demonstrated.
  - Energy requirements potentially undermine environmental benefits depending on electricity source.

### Node 20: Harmful Algal Blooms (HABs) and Emerging Environmental Threats

- **Description:** HABs cause mass mortality in marine cage aquaculture (e.g., 2016 Chilean salmon die-off, recurring events in Norway, Scotland, British Columbia). Other emerging threats include jellyfish blooms, hypoxia events, and microplastic accumulation. Climate change is expected to increase HAB frequency and intensity.
- **Impact score: 7/10** — Catastrophic when they occur; increasing in frequency.
- **Agent do-ability: 8/10** — HAB prediction using satellite ocean color data, hydrodynamic models, and environmental covariates is well-suited to ML. Copernicus, NASA OceanColor, and national monitoring data are open.
- **Verifiability: 7/10** — Historical bloom events are documented. Prediction models can be backtested against satellite imagery and monitoring station records.
- **Dependencies:** Water Quality (Node 5), Climate Adaptation (Node 14), Siting (Node 12).
- **Known bias flags:**
  - Research concentrated on salmonid-producing regions. Tropical HABs affecting cage aquaculture in Southeast Asia are understudied.
  - Freshwater HABs (cyanobacteria in pond aquaculture) receive less attention than marine HABs despite affecting more production.

---

## 3. Bias Self-Assessment

### Species bias in my knowledge

I know most about **Atlantic salmon** — disproportionately so. This is because:
- Salmon aquaculture generates the most English-language research per tonne produced.
- Norway, Scotland, Canada, and Chile have strong research institutions that publish in English.
- Salmon is the highest-value farmed species and attracts the most R&D investment.
- Environmental controversy (sea lice, escapees, benthic impacts) drives public discourse and thus more research.

I know second-most about **whiteleg shrimp** (L. vannamei), **Nile tilapia**, and **rainbow trout**. I know significantly less about:
- Chinese carps (which collectively outweigh all salmon production ~10:1 by volume)
- Pangasius
- Indian major carps (rohu, catla, mrigal)
- African catfish (Clarias gariepinus)
- Seaweed species beyond a general overview
- Most bivalve species beyond oysters and mussels

### Geographic bias

Overrepresented in my training data:
- **Norway** (salmon regulation, research, industry data)
- **United Kingdom/Scotland** (research institutions, SEPA data)
- **Chile** (salmon industry issues)
- **United States** (regulatory frameworks, research)
- **Canada** (east coast IMTA, west coast salmon issues)

Underrepresented:
- **China** — I know China is dominant but have limited access to the detail of Chinese-language research, policy documents, and production data. This is arguably the single largest gap.
- **India, Bangladesh, Myanmar** — massive producers with limited English-language research output.
- **Sub-Saharan Africa** — fastest-growing aquaculture region but least studied.
- **Egypt** — surprisingly large tilapia producer but underrepresented in my knowledge.
- **Southeast Asia** — I know the broad strokes (shrimp, pangasius) but lack depth on the diversity of small-scale systems.

### Problem areas I am likely underweighting

1. **Labor rights and working conditions** in aquaculture (documented abuses in Thai shrimp processing, but broader labor issues are poorly covered).
2. **Seed quality and hatchery management** — foundational but unsexy. Bad seed is a primary constraint for small-scale producers.
3. **Post-harvest loss and cold chain** — enormous in developing countries but rarely framed as an aquaculture research problem.
4. **Freshwater allocation conflicts** — aquaculture competes with agriculture, industry, and households for freshwater. This is a growing crisis in South/Southeast Asia.
5. **Indigenous and traditional aquaculture knowledge** — systems like Hawaiian fishponds, Bangladeshi floodplain aquaculture, and Pacific Island mariculture have deep knowledge bases that are undervalued.
6. **Gender equity** — women constitute a large share of the aquaculture workforce, especially in processing and small-scale production, but gender-disaggregated research is scarce.

### Frameworks I default to

- I default to **quantitative, data-driven, technology-oriented** framings. This reflects the dominant paradigm in the English-language literature I was trained on.
- I tend to frame problems as **optimization tasks** (feed formulation, siting, breeding). Many real-world aquaculture problems are fundamentally about institutions, incentives, and power relations.
- I lean on **Western scientific frameworks** and may undervalue participatory research, farmer field schools, and indigenous knowledge systems.
- My impact scoring implicitly weights global aggregate impact, which biases toward large-scale industrial problems. If I weighted by number of livelihoods affected, small-scale aquaculture problems would score even higher.

---

## 4. Key Bottlenecks

These are the problems that, if solved, would unblock the largest number of downstream problems:

### Bottleneck 1: Comprehensive, Open Data Infrastructure for Aquaculture (Meta-problem)

Not listed as a separate node above, but this cuts across everything. The lack of standardized, open, interoperable datasets for aquaculture production, disease, environment, genetics, and trade is the single biggest constraint on computational approaches. Norway's data infrastructure is a model; extending something similar to tropical aquaculture would be transformative.

**Unblocks:** Nodes 1, 2, 3, 5, 6, 7, 9, 12, 13, 14, 16, 20 — essentially everything.

### Bottleneck 2: Disease Detection and Prediction (Node 1)

Disease is the proximate cause of loss and the driver of antibiotic use, which drives AMR. Better disease prediction would reduce losses, reduce chemical use, reduce environmental impact, and improve welfare — cascading benefits.

**Unblocks:** Nodes 2, 4, 8, 15.

### Bottleneck 3: Feed Formulation and Alternative Proteins (Node 7)

Feed determines economics, environmental footprint, fish health, and the sustainability narrative. Cracking the alternative protein challenge at scale and at cost parity would transform the sector.

**Unblocks:** Nodes 6, 8, 14 (indirectly), 19.

### Bottleneck 4: Selective Breeding Programs for Underserved Species (Node 9)

Genetic improvement is the highest-ROI intervention in agriculture and has barely been applied to most aquaculture species. Extending genomic selection to carps, catfish, and emerging African species would compound gains across disease resistance, growth, feed conversion, and climate tolerance.

**Unblocks:** Nodes 1, 7, 14, 15, 16.

### Bottleneck 5: Small-Scale Aquaculture Systems Research (Node 16)

This is where the most people are and where the least research investment goes. Solving data, seed, feed, and market access problems for small-scale producers in low-income countries would have the greatest humanitarian impact per dollar invested.

**Unblocks:** Nodes 1, 7, 14, 17, 18 (in a developing-country context).

---

## 5. Best Candidates for Agent Work

Ranking by combined score: Impact * Agent Do-ability * Verifiability (all on 1-10 scale, so max = 1000).

| Rank | Problem | Impact | Do-ability | Verifiability | Combined | Why |
|------|---------|--------|------------|---------------|----------|-----|
| 1 | HAB Prediction (Node 20) | 7 | 8 | 7 | 392 | Pure signal processing + ML. Open satellite data (Copernicus, MODIS). Documented historical events for validation. Low barrier to entry. |
| 2 | Water Quality Monitoring/Prediction (Node 5) | 7 | 8 | 8 | 448 | Time-series forecasting on sensor data. IoT datasets increasingly available. Strong engineering baselines to beat. |
| 3 | Siting and Spatial Planning (Node 12) | 7 | 8 | 7 | 392 | GIS + multi-criteria optimization. Open geospatial data. Existing farm locations provide ground truth. |
| 4 | Genomic Surveillance of Pathogens (Node 3) | 7 | 8 | 7 | 392 | Bioinformatics pipelines on public sequence data. Phylogenetics is computationally mature. Could build a "GISAID for aquaculture." |
| 5 | Feed Formulation Optimization (Node 7) | 9 | 7 | 7 | 441 | Meta-analysis + multi-objective optimization on published trial data. High impact, and the agent can synthesize a very fragmented literature. |

**Commentary on the ranking:**

Water Quality Monitoring (Node 5) has the highest raw combined score (448) and is ranked second only because I believe Feed Formulation (Node 7) has a slight edge in practical impact — but the scores are close. The top five are tightly clustered.

Note that the highest-impact problems (Disease Detection at impact=9, Small-Scale Aquaculture at impact=9, Feed at impact=9) don't all make the top 5 for agent work because agent do-ability or verifiability pull them down. Small-Scale Aquaculture (Node 16) scores only 108 (9 * 4 * 3) because data scarcity makes it hard for a purely computational agent to make progress without partnerships for data collection.

**Recommended first project:** HAB Prediction or Feed Formulation Meta-Analysis. HABs are the cleanest ML problem (satellite + environmental data, documented events, clear evaluation metrics). Feed formulation has higher impact but requires assembling a structured database from hundreds of papers, which is a larger upfront investment.

**Important caveat:** These rankings are biased toward problems that are amenable to a computational agent working with English-language data from well-studied species in data-rich countries. The most important problems for humanity — improving small-scale aquaculture in developing countries — score low on agent do-ability precisely because the data infrastructure doesn't exist. An agent's first contribution there might be to help build that infrastructure rather than to solve problems directly.

---

*End of baseline assessment. This document should be revisited after augmenting with: (1) systematic literature search tools, (2) domain-specific databases (FAO FishStatJ, NCBI pathogen genomes, Copernicus marine data), and (3) expert review from aquaculture researchers in underrepresented regions.*
