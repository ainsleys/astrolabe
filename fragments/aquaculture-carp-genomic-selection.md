---
domain: aquaculture
task_class: genomic-selection
region: india, south-asia
species: rohu (Labeo rohita), catla (Catla catla), mrigal (Cirrhinus mrigala)
format: experience-narrative-b
source: synthesized from ICAR-CIFA, WorldFish GIFT program analogy, and published literature (public domain)
---

# Genomic Selection Targets for Disease Resistance in Indian Major Carps

## When This Applies

When evaluating breeding priorities for rohu, catla, and mrigal — India's three major carp species that collectively constitute ~80% of Indian freshwater aquaculture production (~8 million tonnes annually). These species are also farmed across Bangladesh, Myanmar, Nepal, and parts of Southeast Asia.

## What I Learned

### Current state of breeding programs

Indian major carp breeding is decades behind salmonid breeding programs. The most advanced program is ICAR-CIFA's (Central Institute of Freshwater Aquaculture, Bhubaneswar) selective breeding program for rohu, called "Jayanti Rohu" — initiated in 1992, now in its 15th+ generation. Jayanti Rohu has achieved ~17% genetic gain per generation in growth rate through mass selection, which is impressive but uses no genomic tools. It is the ONLY sustained, multi-generational selective breeding program for any Indian major carp.

Catla and mrigal have NO organized multi-generational breeding programs. Broodstock management in Indian hatcheries is generally poor — limited records, small effective population sizes, and frequent inbreeding. The National Freshwater Fish Broodstock Centre at Kausalyaganga (under CIFA) maintains some pedigreed stocks but the scale is limited relative to India's 20,000+ carp hatcheries.

### Why disease resistance is the highest-impact genomic selection target

**The case over growth rate:**
- Growth rate has already been improved substantially through mass selection in Jayanti Rohu. Genomic selection for growth would provide additional gain but the low-hanging fruit has been picked.
- Disease losses in Indian carp aquaculture are estimated at 10-20% of production annually (ICAR estimates), primarily from Epizootic Ulcerative Syndrome (EUS, caused by Aphanomyces invadans), Argulus (fish lice) infestations, and bacterial infections (Aeromonas hydrophila, Edwardsiella tarda). These losses are catastrophic for smallholder farmers who lack diagnostic capacity or access to treatments.
- Disease resistance is difficult to select for using conventional mass selection because you cannot challenge the breeding candidates directly (challenge testing kills or compromises them). Genomic selection solves this by testing relatives/sibs and predicting breeding values from markers.

### Most impactful genomic selection targets, ranked

**Target 1: EUS resistance in rohu (highest impact)**

Epizootic Ulcerative Syndrome is the single most devastating disease of Indian carps. It's seasonal (winter, coinciding with low temperatures and poor water quality in earthen ponds), affects all three species but rohu most severely, and has no vaccine. Malachite green was the traditional treatment — now banned as a carcinogen.

Genomic basis: CIFA published preliminary work showing moderate heritability (h² = 0.15-0.25) for EUS resistance in rohu, based on sib challenge tests. This is within the range where genomic selection adds substantial value over pedigree-based BLUP. QTL mapping studies (limited, mostly from CIFA and NBFGR Lucknow) have identified candidate regions on linkage groups associated with innate immune response genes (toll-like receptors, complement components, lysozyme). A reference genome for rohu was published in 2019 (Das et al., GigaScience), enabling SNP chip development.

**What's needed:** A medium-density SNP array (50K-100K markers) for rohu, validated against a challenge-tested reference population of 1000+ families. This is a $500K-1M investment but would transform the breeding program. The GIFT tilapia program (WorldFish) provides the operational model — genomic selection was layered onto an existing mass-selection program with dramatic acceleration of genetic gain.

**Target 2: Aeromonas hydrophila resistance in rohu and catla**

A. hydrophila causes hemorrhagic septicemia — the most common bacterial disease across all three species. Ubiquitous in Indian pond environments, outbreaks triggered by stress, overcrowding, and poor water quality. Antibiotic treatment (oxytetracycline) is common but driving AMR.

Genomic basis: Higher heritability for A. hydrophila resistance than EUS (h² = 0.20-0.35 estimated from sib tests in rohu). NBFGR has identified candidate genes in the MHC class II region and several innate immunity pathways (cathelicidin, hepcidin, beta-defensin). Cross-species studies from common carp (Cyprinus carpio), which has a much better-characterized genome, suggest that disease resistance QTLs may be partially conserved across cyprinid species — meaning common carp genomic resources could accelerate discovery in rohu and catla.

**What's needed:** Challenge testing protocols standardized across CIFA, NBFGR, and state fisheries research stations. A multi-site, multi-strain challenge design (A. hydrophila has significant strain variation in virulence). Genotype-by-environment interaction studies — resistance in controlled tanks may not predict resistance in earthen ponds.

**Target 3: Argulus resistance in all three species**

Argulus siamensis (fish louse) is the most economically significant ectoparasite in Indian carp ponds. Infestations cause direct mortality, secondary bacterial infections (the puncture wounds are entry points for Aeromonas), and severe growth depression. Chemical treatment (organophosphates) is toxic to the environment and to farmers.

Genomic basis: Very limited genetic studies. Heritability for Argulus resistance has not been formally estimated in Indian major carps. However, field observations consistently report family-level variation in Argulus load — some families in mixed-stock ponds carry 2-3x higher parasite loads than others, suggesting genetic variation exists. Common carp studies in Europe show moderate heritability for ectoparasite resistance (h² = 0.10-0.20).

**What's needed:** This is the earliest-stage target. Basic quantitative genetic parameters (heritability, genetic correlations with growth traits) need to be estimated before genomic selection can be designed. The opportunity is that Argulus resistance could be selected simultaneously with growth and bacterial disease resistance if genetic correlations are favorable (they are in salmonids, unknown in carps).

### Breeding program limitations constraining all targets

1. **No SNP array exists for any Indian major carp.** The rohu genome is published but no commercial genotyping platform has been developed. Genotyping-by-sequencing (GBS) or low-coverage whole-genome sequencing could substitute but requires bioinformatics capacity that CIFA has only recently begun building.

2. **Small effective population sizes.** The Jayanti Rohu program maintains ~100 families per generation. Genomic selection requires reference populations of 500+ families for adequate prediction accuracy. Scaling up the breeding nucleus is a prerequisite.

3. **Polyculture complicates trait recording.** Indian carp is traditionally farmed in three-species polyculture (rohu + catla + mrigal in the same pond). This makes individual growth recording nearly impossible without tagging. Disease resistance phenotyping must happen in single-species challenge tests, separate from the production environment.

4. **Institutional fragmentation.** CIFA, NBFGR, Central Marine Fisheries Research Institute (CMFRI), and multiple State Fisheries Departments all have overlapping mandates but limited coordination. The Jayanti Rohu program's success depended on a single institutional champion (CIFA) — scaling to catla and mrigal requires a national coordination mechanism that doesn't currently exist.

5. **Dissemination bottleneck.** Even Jayanti Rohu, after 30+ years, reaches only an estimated 15-20% of Indian carp farmers. Most hatcheries still use unimproved local broodstock. A genomically improved line is worthless if it doesn't reach farmers.

## Traps and False Positives

- **Don't assume salmon genomic selection models transfer directly.** Salmon breeding programs have 10,000+ pedigreed families, high-density SNP arrays (200K+), and decades of phenotypic data. Indian carp programs have ~100 families, no SNP arrays, and limited phenotypic records. The genomic selection methods need to be adapted for low-resource settings (low-density markers, small reference populations, imputation-heavy approaches).
- **Don't ignore catla and mrigal because rohu has the best data.** Catla is the highest-value Indian carp (sold at premium prices) and mrigal occupies a distinct ecological niche in polyculture (bottom feeder). A rohu-only breeding program leaves the majority of the polyculture system unimproved.
- **Don't conflate Indian major carps with Chinese carps.** Despite both being cyprinids, rohu/catla/mrigal are in different genera from grass carp/silver carp/bighead carp. Genomic resources from Chinese carps have limited transferability. Common carp (Cyprinus carpio) is the closest well-characterized relative.
- **Growth × disease resistance genetic correlations are UNKNOWN in Indian carps.** In Atlantic salmon, these correlations are weakly positive to zero (meaning you can select for both without trade-off). In carps, no one has measured them. If they're negative, simultaneous selection becomes harder.

## Confidence Notes

- Jayanti Rohu program status: HIGH confidence. Well-documented by CIFA in publications and ICAR reports.
- Disease resistance heritability estimates: MODERATE confidence. Based on limited studies with small sample sizes. True values may differ substantially.
- Genomic resources needed: HIGH confidence on the general requirements. MODERATE confidence on cost estimates (depends heavily on genotyping platform choice and sample sizes).
- Argulus resistance genetics: LOW confidence. Based primarily on field observations and analogy to other cyprinids. Formal genetic parameters not yet estimated.
- Institutional analysis: MODERATE confidence. Based on published ICAR reports and policy documents, but institutional dynamics are complex and evolving.
