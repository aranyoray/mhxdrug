# mhxdrug

**Mental Health, Drug Deaths & Political Orientation Dashboard**

Interactive county-level analysis of the relationships between political lean, drug overdose mortality, suicide deaths, and socioeconomic factors across U.S. counties (2018-2023).

## 🎯 Project Overview

This project integrates health outcomes, political data, and socioeconomic indicators to explore county-level patterns in drug overdose and suicide mortality. All analyses control for confounding factors using rigorous statistical methods.

### Key Finding

**Controlled Correlation: -0.269 (p < 0.001)**

Counties with higher Republican vote margins have LOWER drug overdose deaths after controlling for unemployment, poverty, income, education, and demographics.

**Critical Caveat:** This is an ecological (county-level) association. Individual-level inferences cannot be made from this data.

---

## 📊 Dataset

- **20,201 observations** (3,373 counties × 6 years)
- **20 variables** (health, SES, politics, demographics)
- **Coverage:** 2018-2023
- **Completeness:** 90%+ for SES data, 50% for health outcomes (CDC privacy suppression)

### Variables

**Health Outcomes:**
- Drug overdose deaths & rates (CDC WONDER)
- Suicide deaths & rates (CDC WONDER)

**Political:**
- Republican/Democrat vote shares (MIT Election Lab)
- Republican margin (interpolated 2016-2024)

**Socioeconomic:**
- Unemployment rate (USDA ERS)
- Poverty rate (Census SAIPE)
- Median household income (Census SAIPE)
- Per capita income (BEA)
- Rent (Zillow ZORI)

**Demographics:**
- Education (% Bachelor's+)
- Race/ethnicity (% White, Black, Hispanic/Latino)
- Population (Census ACS)

---

## 📈 Statistical Models

### Negative Binomial GLMM

```
log(E[Deaths]) = offset(log(Pop)) +
                 β₁·RepublicanMargin +
                 β₂₋₉·(SES + Demographics) +
                 γ_county + δ_state + τ_year + ε
```

**Results:**
- RepublicanMargin coefficient: -0.0071 (p < 0.0001)
- Interpretation: 10-point increase in Republican margin associated with ~7% decrease in expected drug deaths (holding all else constant)

### Two-Way ANOVA

Time Period (Pre-COVID vs. COVID) × Political Lean (Democrat/Swing/Republican)
- Significant main effects for both factors
- No significant interaction

---

## 🗂️ Repository Structure

```
mhxdrug/
├── data/                            # Source data files
│   ├── countypres_2000-2024.csv    # Political data
│   ├── drug_deaths_2018_2023.csv   # CDC WONDER overdoses
│   └── suicide_mortality_2018-2023.csv  # CDC WONDER suicides
├── dashboard_data/                  # Processed data for dashboard
│   ├── county_data.json            # County averages + correlations
│   ├── yearly_stats.json           # Temporal trends
│   ├── state_summary.json          # State aggregations
│   ├── glmm_drug_deaths.json       # Model results
│   └── model_summary.json          # Summary statistics
├── dashboard_nextjs/                # Next.js dashboard (deploy to Vercel)
│   ├── app/                        # Pages
│   ├── components/                 # React components
│   ├── public/data/                # Static data files
│   └── package.json                # Dependencies
├── merge_ses.py                     # Data integration pipeline
├── run_statistical_models.py        # Statistical analyses
├── analysis_examples.py             # Python analysis examples
├── county_year_merged.csv           # Main integrated dataset
└── *.md                            # Documentation files
```

---

## 🚀 Quick Start

### 1. Data Analysis (Python)

```bash
# Run data integration
python3 merge_ses.py

# Run statistical models
python3 run_statistical_models.py

# Explore analyses
python3 analysis_examples.py
```

### 2. Deploy Dashboard (Vercel)

```bash
cd dashboard_nextjs
npm install
vercel
```

See `VERCEL_QUICK_DEPLOY.md` for detailed guide.

---

## 📚 Documentation

- **DATA_README.md** - Complete data dictionary & sources
- **STATISTICAL_METHODOLOGY.md** - Full methods, models & limitations
- **FINAL_SUMMARY.md** - Analysis guide with Python examples
- **DASHBOARD_README.md** - Dashboard implementation guide
- **VERCEL_QUICK_DEPLOY.md** - 10-minute deployment guide
- **PROJECT_COMPLETE.md** - Project overview & checklist

---

## ⚠️ Important Limitations

1. **Ecological Fallacy:** County-level patterns ≠ individual-level relationships
2. **Observational Data:** No causal inference possible
3. **Missing Data:** CDC suppresses counts <10 for privacy (affects small/rural counties)
4. **Confounding:** Unmeasured variables (healthcare access, drug supply, etc.)
5. **Time Period:** Includes COVID-19 pandemic (may not generalize)

---

## 📊 Key Statistics

- **Total Observations:** 20,201 county-years
- **Complete SES Data:** 18,362 observations (90.9%)
- **Drug Death Data:** 9,995 observations (49.5%)
- **Average Correlation (politics-drugs):** -0.269
- **Drug Deaths Increase (COVID):** +42.5% from 2018-19 to 2020-23

---

## 🎓 Citation

When using this data or analysis:

**Data Sources:**
- CDC WONDER Multiple Cause of Death Database
- U.S. Census Bureau (SAIPE, ACS)
- USDA Economic Research Service
- Bureau of Economic Analysis
- MIT Election Data and Science Lab
- Zillow Research (ZORI)

**Analysis:**
```
County-Level Analysis of Political Orientation, Drug Overdose Deaths,
and Socioeconomic Factors, 2018-2023. Dataset and Statistical Models.
```

---

## 🔬 Reproducibility

All code and data are included. Full pipeline:

```bash
python3 merge_ses.py                    # Integrate all data sources
python3 prepare_dashboard_data_simple.py # Prepare for dashboard
python3 run_statistical_models.py       # Run GLMM, ANOVA
python3 analysis_examples.py            # Generate analyses
```

---

## 📞 Contact

For questions about methodology, data, or dashboard deployment, see the documentation files listed above.

---

## 📝 License

Data sources have their own licenses (public domain/open data). Analysis code provided as-is for research and educational purposes.

---

**Project Status:** ✅ Complete & Ready for Deployment

**Last Updated:** October 26, 2025

**Dashboard:** Ready to deploy to Vercel

**Statistical Models:** Completed (GLMM, ANOVA, correlations)

---

🎉 **Start exploring: See `PROJECT_COMPLETE.md` for next steps!** 🎉
