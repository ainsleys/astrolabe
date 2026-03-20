---
domain: aquaculture
task_class: feed-conversion-methodology
region: norway, chile
species: atlantic-salmon (Salmo salar)
format: experience-narrative-b
source: synthesized from published literature, Nofima, INCAR, and FAO technical papers (public domain)
---

# Feed Conversion Ratio Measurement: Norway vs Chile Cross-Study Comparison

## When This Applies

When comparing feed efficiency data between Norwegian and Chilean salmon aquaculture research, or when conducting meta-analyses that pool FCR data across these two dominant production systems.

## What I Learned

### The core problem: FCR is not a single metric

"Feed Conversion Ratio" as reported in Norwegian vs Chilean research is measured, bounded, and contextualized differently enough that naive cross-study comparison produces misleading results.

### Norwegian FCR methodology

**Standard reporting:** Economic FCR (eFCR) = total feed delivered / total biomass harvested. Norway reports this at the site level, typically over the full production cycle (smolt-to-harvest, 14-24 months in sea).

**Key conventions:**
- Feed is measured as total feed distributed from the barge (feed delivery system logs). Norwegian farms use centralized feeding systems with pellet counters and waste-feed cameras, making feed input measurement relatively precise.
- Biomass gain includes mortalities. Dead fish that are removed and weighed are subtracted from harvest biomass but the feed they consumed is NOT subtracted from feed input. This inflates eFCR.
- Norwegian Directorate of Fisheries publishes industry-average eFCR annually. Recent figures: 1.15-1.30 for the industry, with top performers at 1.05-1.10.
- Nofima and the Institute of Marine Research (IMR) use biological FCR (bFCR) in research contexts: feed consumed / live weight gain. This requires estimating actual feed intake (subtracting waste feed detected by underwater cameras), which is lower than feed delivered.
- Temperature correction: Norwegian researchers increasingly report thermal-unit growth coefficient (TGC) alongside FCR, because FCR varies dramatically with water temperature (5-15°C range across Norwegian sites and seasons).

**Critical detail:** Norwegian sites experience substantial seasonal temperature variation (2-3°C winter, 12-16°C summer). Feed intake drops to near zero in coldest months. Annual eFCR includes these low-intake periods, which dilutes the ratio compared to Chilean sites with more stable temperatures.

### Chilean FCR methodology

**Standard reporting:** Also eFCR, but measurement practices differ in practice.

**Key differences:**
- Feed measurement infrastructure is less uniform. Chile has a mix of feeding systems — some modern centralized barges, many older manual or semi-automatic systems. Feed waste measurement is less standardized than in Norway.
- Chilean production sites in Regions X, XI, and XII (Los Lagos, Aysén, Magallanes) span a wider environmental range. Aysén sites (fjord systems) can approach Norwegian conditions; Los Lagos sites are warmer and more variable.
- Mortality rates in Chile have historically been higher (due to SRS - Piscirickettsiosis, sea lice Caligus rogercresseyi, and ISA outbreaks). Higher mortality directly inflates eFCR because dead fish consumed feed but produced no harvest biomass. Chile's 2016 HAB event (Pseudochattonella) caused massive mortality spikes that distorted multi-year FCR comparisons.
- INCAR (Interdisciplinary Center for Aquaculture Research) has pushed for standardized FCR reporting protocols but adoption is uneven across the ~600 active Chilean concessions.
- Sernapesca (Chilean fisheries authority) collects production data but FCR reporting granularity is lower than Norway's Directorate of Fisheries data.

**Critical detail:** Chilean salmon production often uses higher-lipid "finishing" feeds in the final months before harvest to boost omega-3 content and fillet color for export markets (especially Japan/US). These feeds have different energy density than standard grower feeds used for most of the Norwegian production cycle. FCR comparisons must account for feed energy content, not just mass.

### Normalization required for cross-study comparison

1. **Mortality correction.** Convert eFCR to bFCR by estimating feed consumed by fish that died before harvest. The simplest approximation: redistribute dead fish feed proportionally across the time they were alive. Norway's lower mortality (typically 5-15%) vs Chile's higher mortality (15-25% in bad years, 8-12% in good years) creates a systematic bias in eFCR comparisons. Without correction, Chilean FCR looks worse than the underlying feed efficiency warrants.

2. **Temperature normalization.** Report TGC alongside FCR, or normalize to a standard temperature regime. The formula: TGC = (W_final^(1/3) - W_initial^(1/3)) / (sum of daily temperatures) × 1000. This separates growth potential from thermal opportunity.

3. **Feed energy standardization.** Convert feed mass to digestible energy (DE, MJ/kg). Norwegian standard grower feeds: ~20-22 MJ DE/kg. Chilean finishing feeds: ~23-25 MJ DE/kg. Reporting FCR on an energy basis eliminates the feed composition confound.

4. **Production cycle alignment.** Norwegian studies often report FCR for a complete smolt-to-harvest cycle. Chilean studies sometimes report for specific growth phases (especially when mortality events truncate production). Ensure comparison windows are aligned.

5. **Sea lice treatment effects.** Both countries use sea lice treatments (bath treatments, cleaner fish, mechanical delousing) that reduce feed intake during and after treatment. Norwegian farms may lose 2-4 weeks of feeding per treatment cycle; Chile's Caligus treatments have different protocols. Treatment frequency should be reported alongside FCR.

## Traps and False Positives

- **Don't compare Norwegian bFCR to Chilean eFCR.** This is the most common error in conference presentations. The difference can be 0.10-0.20 FCR units, which is enormous.
- **Beware of "research station" vs "commercial farm" FCR.** Research stations achieve FCR of 0.90-1.00 under controlled conditions. Commercial operations are 1.10-1.30. Mixing these in meta-analysis is invalid.
- **Year effects are massive.** A single ISA outbreak or HAB event in Chile can shift the national average FCR by 0.05-0.10. Multi-year data is essential.
- **Genetic background matters.** Norwegian breeding programs (AquaGen, SalmoBreed/Benchmark) have selected for FCR for decades. Chilean production uses a mix of Norwegian-origin genetics and local strains. Genetic FCR potential may differ systematically.

## Confidence Notes

- Norwegian methodology: HIGH confidence. Well-documented by Nofima, Norwegian Directorate of Fisheries, and numerous published studies.
- Chilean methodology: MODERATE confidence. Less standardized, and INCAR publications are the best source but don't cover all industry practices.
- Normalization approaches: HIGH confidence for the principles (energy correction, mortality correction, TGC). MODERATE confidence for the specific correction factors — these depend on assumptions that may not hold across all sites.
- Cross-study bias magnitude: MODERATE confidence. The 0.10-0.20 FCR unit systematic difference between naive Norwegian vs Chilean comparisons is a reasonable estimate based on the literature, but precise quantification requires site-level data that is commercially sensitive.
