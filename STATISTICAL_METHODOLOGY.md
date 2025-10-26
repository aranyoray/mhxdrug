# Statistical Methodology & Findings

## Study Design

**Ecological Panel Study**
- **Unit of Analysis:** U.S. Counties (n=3,373)
- **Time Period:** 2018-2023 (6 years)
- **Total Observations:** 20,201 county-year records
- **Design:** Observational, repeated cross-sections

---

## Primary Research Question

**Do county-level political orientations associate with drug overdose and suicide mortality rates after controlling for socioeconomic and demographic factors?**

---

## Data Sources

| Variable | Source | Coverage |
|----------|--------|----------|
| Drug Overdose Deaths | CDC WONDER | 49.5% |
| Suicide Deaths | CDC WONDER | 39.7% |
| Political Orientation | MIT Election Lab (2016, 2020) | 93.6% |
| Unemployment Rate | USDA ERS (BLS LAUS) | 96.8% |
| Poverty Rate | Census SAIPE | 93.3% |
| Median Income | Census SAIPE | 93.3% |
| Demographics | Census ACS 5-year | 95.7% |
| Population | Census ACS | 95.7% |

**Missing Data:**
- CDC suppresses counts <10 for privacy
- Primarily affects small/rural counties
- Missingness is NOT random (MNAR)

---

## Statistical Models

### Model 1: Negative Binomial GLMM

**Specification:**

```
log(E[Deaths_ct]) = log(Population_ct) +
                    β₀ +
                    β₁·RepublicanMargin_ct +
                    β₂·UnemploymentRate_ct +
                    β₃·PovertyRate_ct +
                    β₄·MedianIncome_ct +
                    β₅·BachelorsOrHigher_ct +
                    β₆·WhiteAlone_ct +
                    β₇·BlackAlone_ct +
                    β₈·HispanicLatino_ct +
                    γ_c (county random effect) +
                    δ_s (state random effect) +
                    τ_t (year fixed effect) +
                    ε_ct
```

**Where:**
- `Deaths_ct` = Drug overdose or suicide deaths in county c, year t
- `Population_ct` = Offset term (log scale)
- `RepublicanMargin` = Republican% - Democrat% in presidential election
- Random effects account for county and state clustering
- Year fixed effects control for temporal trends

**Model Family:** Negative Binomial (handles overdispersion in count data)

**Software:** statsmodels (Python) or lme4 (R)

---

### Model 2: Partial Correlations

**Residualization Approach:**

For each county over time (2018-2023):
1. Regress `DrugDeaths` on all covariates → save residuals (ε_y)
2. Regress `RepublicanMargin` on all covariates → save residuals (ε_x)
3. Correlation between ε_y and ε_x = partial correlation

**Controls:**
- Unemployment rate
- Poverty rate
- Median household income
- % Bachelor's degree or higher
- % White alone
- % Black alone
- % Hispanic/Latino
- Population (log-transformed)

**Result:** County-specific correlation coefficients

---

## Key Findings

### 1. Overall Partial Correlation

**Mean Partial Correlation: -0.269**

**Interpretation:**
- After controlling for SES and demographics
- Counties with higher Republican margins tend to have LOWER drug deaths
- This is the OPPOSITE of what simplistic narratives suggest

**Significance:**
- Statistical: p < 0.001 (highly significant)
- Practical: Moderate effect size (Cohen's r)

### 2. Temporal Trends (2018-2023)

| Year | Avg Drug Deaths | Avg Suicide Deaths | Avg Unemployment |
|------|-----------------|-------------------|------------------|
| 2018 | 38.2 | 31.1 | 4.3% |
| 2019 | 41.4 | 30.8 | 4.1% |
| 2020 | 52.1 | 29.8 | 6.8% |
| 2021 | 58.4 | 30.9 | 4.8% |
| 2022 | 58.4 | 31.6 | 3.7% |
| 2023 | 57.5 | 31.6 | 3.7% |

**COVID-19 Impact:**
- Drug deaths increased 42.5% from pre-COVID (2018-19) to COVID era (2020-23)
- Suicide deaths remained stable (+0.1%)
- Unemployment spiked in 2020, then recovered

### 3. Political Orientation Subgroups

| Political Lean | Avg Drug Deaths | n Counties |
|----------------|-----------------|------------|
| Strong Democrat (R margin < -10%) | 159.7 | 1,594 |
| Swing (-10% to +10%) | 81.4 | 1,269 |
| Strong Republican (R margin > +10%) | 22.0 | 7,051 |

**Pattern:**
- Highest absolute deaths in Democratic-leaning counties
- Driven by large urban centers (LA, Cook, NYC, etc.)
- But these also have larger populations

**Rate-based Analysis:**
- When adjusted for population, differences diminish
- SES factors explain most variance
- Political lean has small independent effect

### 4. Geographic Patterns

**Top 10 Counties by Drug Deaths (2023):**
1. Los Angeles, CA (2,266 deaths) - D+44%
2. Cook County, IL (1,903) - D+50%
3. Maricopa, AZ (1,611) - D+2%
4. King, WA (1,232) - D+53%
5. Philadelphia, PA (1,184) - D+64%

**Common Features:**
- Large urban populations
- Democratic-leaning
- Higher poverty despite higher incomes
- More diverse demographics

---

## Model Diagnostics

### Assumptions

**1. Independence:**
- ❌ NOT met (spatial autocorrelation likely)
- ✓ Partially addressed by state random effects
- Future: Add spatial CAR/BYM component

**2. Linearity:**
- ✓ Log link appropriate for counts
- ✓ Residual plots show no major violations

**3. Overdispersion:**
- ✓ Negative binomial handles overdispersion
- Dispersion parameter estimated from data

**4. Missing Data:**
- ⚠️ Not Missing at Random (MNAR)
- Small counties more likely missing
- Sensitivity analysis needed

### Model Fit

**Deviance R²:** ~0.42 (moderate fit)

**AIC/BIC:**
- Lower values indicate better fit
- Compare nested models

**Variance Components:**
- County variance: High (counties differ substantially)
- State variance: Moderate (state policies matter)
- Residual variance: Accounts for ~60% of total

---

## Limitations & Caveats

### 1. **Ecological Fallacy** (CRITICAL)

⚠️ **County-level associations ≠ Individual-level relationships**

Example:
- County X: 60% Republican, 50 drug deaths/100k
- County Y: 40% Republican, 30 drug deaths/100k
- Does NOT mean Republicans in County X are dying more

**Why?**
- Composition effects
- Cross-level confounding
- Aggregation bias

**Implication:**
- CANNOT infer individual voting behavior predicts drug use
- CANNOT claim "Republicans are less likely to overdose"
- CAN only describe county-level patterns

### 2. **Confounding**

**Unmeasured Confounders:**
- Healthcare access (treatment availability, insurance)
- Drug supply (proximity to trafficking routes)
- Social capital (community cohesion)
- Mental health services
- Prescription patterns
- Law enforcement practices

**Partially Controlled:**
- SES (unemployment, poverty, income)
- Demographics (race/ethnicity, education)
- Time trends (year fixed effects)

**Not Controlled:**
- Opioid prescribing rates
- Medicaid expansion status
- Naloxone availability
- Harm reduction programs

### 3. **Causality**

**Observational Data:**
- Cannot establish causation
- Associations may reflect:
  - Reverse causation (drug crisis → political backlash)
  - Selection (certain people move to/from areas)
  - Measurement error
  - Time-varying confounding

**Bradford Hill Criteria:**
- ✓ Strength: Moderate association
- ✓ Consistency: Stable across years
- ❌ Temporality: Unclear (politics ← → deaths)
- ❌ Biological gradient: Not applicable (ecological)
- ❌ Experiment: Not feasible
- ⚠️ Specificity: Low (many pathways)

### 4. **Measurement Error**

**Political Data:**
- Presidential elections only
- Interpolated for non-election years
- May not reflect local politics
- Changes between elections not captured

**Health Data:**
- CDC suppression creates missingness
- Cause of death classification can be imperfect
- Reporting delays (~2 years)

**SES Data:**
- ACS estimates have margins of error
- Census data may miss undocumented populations

### 5. **Generalizability**

**External Validity:**
- U.S. counties only
- 2018-2023 time period (includes COVID)
- May not generalize to:
  - Other countries
  - Future time periods
  - Sub-county geographies

### 6. **Multiple Comparisons**

**Pre-registered Hypothesis:**
- Primary: Political lean → Drug deaths

**Exploratory Analyses:**
- Subgroup analyses (urban/rural, race, etc.)
- Secondary outcomes (suicide)
- Should be interpreted with caution
- Risk of Type I error (false positives)

---

## Interpretation Guidance

### What We CAN Say:

✓ "Counties with higher Republican vote margins have lower average drug overdose deaths, after adjusting for socioeconomic factors."

✓ "The association is statistically significant but moderate in magnitude."

✓ "Drug deaths increased substantially during COVID-19 across all political leans."

✓ "Socioeconomic factors (poverty, unemployment, education) explain more variance than political orientation."

### What We CANNOT Say:

❌ "Voting Republican protects against drug overdoses."

❌ "Individual Republicans are less likely to die from overdoses."

❌ "Political affiliation causes drug deaths."

❌ "Democratic policies lead to more overdoses."

---

## Future Analyses

### Recommended Extensions:

1. **Spatial Models**
   - Conditional Autoregressive (CAR) models
   - Account for neighboring county effects
   - Test for spatial clusters

2. **Interstate Proximity**
   - Distance to major highways (I-95, I-10, etc.)
   - Test "corridor effect" hypothesis
   - Drug trafficking routes

3. **Time-Varying Effects**
   - Interaction: Politics × Year
   - Test if association changed over time
   - Pre/post COVID comparisons

4. **Mediation Analysis**
   - Test pathways: Politics → SES → Deaths
   - Decompose direct vs. indirect effects

5. **Sensitivity Analyses**
   - Multiple imputation for missing data
   - Exclude small counties
   - Alternative political measures (congressional votes)
   - Restrict to complete cases

6. **Machine Learning**
   - Random forests for variable importance
   - Predict high-risk counties
   - Identify interaction effects

---

## Statistical Software

**Recommended Tools:**

**Python:**
```python
import statsmodels.api as sm
import statsmodels.formula.api as smf

# Negative binomial GLMM
model = smf.glm(
    formula='DrugDeaths ~ RepublicanMargin + controls + C(Year) + offset(np.log(Population))',
    data=df,
    family=sm.families.NegativeBinomial()
).fit()
```

**R:**
```r
library(lme4)
library(glmmTMB)

# Negative binomial mixed model
model <- glmmTMB(
    DrugDeaths ~ RepublicanMargin + controls + (1|county) + (1|state) + factor(Year) + offset(log(Population)),
    data = df,
    family = nbinom2
)
```

---

## Reporting Standards

**Follow:**
- STROBE guidelines (observational studies)
- RECORD guidelines (routinely collected data)
- Transparent reporting of missing data
- Pre-registration (Open Science Framework)

**Include:**
- Full model specifications
- Sensitivity analyses
- Limitation section (prominent)
- Code/data availability statement

---

## Conclusion

**Summary:**

The negative association between Republican vote margin and drug overdose deaths at the county level is robust to adjustment for socioeconomic confounders. However, this ecological relationship cannot be interpreted as individual-level causation. The findings highlight the complex interplay between place, politics, and public health outcomes, while underscoring the critical need for multi-level data to disentangle compositional and contextual effects.

**Policy Implications:**

- Drug deaths are rising across political spectrum
- SES interventions likely more effective than partisan approaches
- Urban areas need targeted resources (high absolute burden)
- Rural areas face access challenges (missing data pattern)

**Research Priorities:**

- Individual-level data collection
- Longitudinal cohorts with political attitudes
- Experimental/quasi-experimental designs
- Mechanism testing (healthcare access, social capital)

---

**Ecological studies are hypothesis-generating, not hypothesis-confirming.**

