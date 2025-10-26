# County-Year Merged Dataset

## Overview
Comprehensive county-level dataset for U.S. counties from 2018-2023, integrating health outcomes, socioeconomic indicators, demographics, and political data.

**File**: `county_year_merged.csv`
**Rows**: 19,932 county-year observations
**Unique Counties**: 3,372 FIPS codes
**Years**: 2018-2023

---

## Data Sources

### 1. **Health Outcomes** (CDC WONDER)
- **Drug Overdose Deaths** (`DrugDeaths`, `DrugDeathRate`)
  - Source: CDC WONDER Multiple Cause of Death database
  - File: `data/drug_deaths_2018_2023.csv`
  - Coverage: ~50% of observations (suppressed for privacy in small counties)
  - Notes: "Suppressed" values converted to missing (NA)

- **Suicide Mortality** (`SuicideDeaths`, `SuicideRate`)
  - Source: CDC WONDER Multiple Cause of Death database
  - File: `data/suicide_mortality_2018-2023.csv`
  - Coverage: ~40% of observations (suppressed for privacy)
  - Notes: "Unreliable" and "Suppressed" values converted to missing (NA)

### 2. **Socioeconomic Indicators**

- **Unemployment Rate** (`UnemploymentRate`)
  - Source: USDA ERS (originally from BLS LAUS)
  - Coverage: 98.1%
  - URL: https://ers.usda.gov/sites/default/files/_laserfiche/DataFiles/48747/Unemployment2023.csv

- **Poverty Rate & Median Income** (`PovertyRate`, `MedianIncome`)
  - Source: Census Bureau SAIPE (Small Area Income and Poverty Estimates)
  - Coverage: 94.6%
  - API: https://api.census.gov/data/timeseries/poverty/saipe

- **Per Capita Income** (`PerCapitaIncome`)
  - Source: Bureau of Economic Analysis (BEA)
  - Coverage: 94.5%
  - API: https://apps.bea.gov/api/data/

- **Rent** (`Rent`)
  - Source: Zillow ZORI (Observed Rent Index)
  - Coverage: 19.6%
  - Note: Only available for counties with sufficient rental data
  - URL: https://files.zillowstatic.com/research/public_csvs/zori/

### 3. **Political Orientation**

- **Presidential Election Results** (`RepublicanVoteShare`, `DemocratVoteShare`, `RepublicanMargin`)
  - Source: MIT Election Data and Science Lab
  - File: `data/countypres_2000-2024.csv`
  - Coverage: 15.8% (only 2020 election currently loaded)
  - Metrics:
    - `RepublicanVoteShare`: % of votes for Republican candidate
    - `DemocratVoteShare`: % of votes for Democrat candidate
    - `RepublicanMargin`: Republican % - Democrat %

### 4. **Demographics** (Limited Coverage)

- **Education & Race/Ethnicity** (`BachelorsOrHigher`, `WhiteAlone`, `BlackAlone`, `HispanicLatino`)
  - Source: Census ACS 5-Year Estimates
  - File: `data/acs_county_5y.csv`
  - Coverage: 0.3% (only 10 counties currently)
  - Note: This appears to be a sample/test dataset

### 5. **Mental Health** (Limited Coverage)

- **Mental Health Score** (`MentalHealthScore`)
  - File: `data/mentalhealth_county.csv`
  - Coverage: 0.3% (only 10 counties)
  - Note: This appears to be a sample/test dataset

---

## Column Definitions

| Column | Type | Description | Coverage |
|--------|------|-------------|----------|
| `fips` | string | 5-digit county FIPS code | 100% |
| `Year` | integer | Year (2018-2023) | 100% |
| `UnemploymentRate` | float | Annual average unemployment rate (%) | 98.1% |
| `PovertyRate` | float | Poverty rate - all ages (%) | 94.6% |
| `MedianIncome` | float | Median household income ($) | 94.6% |
| `PerCapitaIncome` | float | Per capita personal income ($) | 94.5% |
| `DrugDeaths` | float | Number of drug overdose deaths | 50.1% |
| `DrugDeathRate` | float | Drug overdose death rate per 100,000 | 22.5% |
| `SuicideDeaths` | float | Number of suicide deaths | 40.3% |
| `SuicideRate` | float | Suicide rate per 100,000 | 16.8% |
| `Rent` | float | Average rent ($) | 19.6% |
| `RepublicanVoteShare` | float | Republican vote share in presidential election (%) | 15.8% |
| `DemocratVoteShare` | float | Democrat vote share in presidential election (%) | 15.8% |
| `RepublicanMargin` | float | Republican margin (Rep% - Dem%) | 15.8% |
| `BachelorsOrHigher` | float | % with bachelor's degree or higher | 0.3% |
| `WhiteAlone` | float | % White alone | 0.3% |
| `BlackAlone` | float | % Black or African American alone | 0.3% |
| `HispanicLatino` | float | % Hispanic or Latino | 0.3% |
| `MentalHealthScore` | float | Mental health score (metric TBD) | 0.3% |

---

## Missing Data Patterns

### High-Quality Variables (>90% coverage)
- Unemployment Rate (98.1%)
- Poverty Rate (94.6%)
- Median Income (94.6%)
- Per Capita Income (94.5%)

### Moderate Coverage Variables (15-50%)
- Drug Deaths (50.1%)
- Suicide Deaths (40.3%)
- Drug Death Rate (22.5%)
- Rent (19.6%)
- Political variables (15.8%)

### Low Coverage Variables (<1%)
- Demographics (0.3% - sample data only)
- Mental Health Score (0.3% - sample data only)

### Reasons for Missing Data

1. **Privacy Suppression** (CDC WONDER data)
   - Deaths and rates suppressed when counts are <10 to protect privacy
   - More common in rural/low-population counties
   - Affects ~50% of drug death observations and ~60% of suicide observations

2. **Data Unavailability**
   - Rent data: Only counties with sufficient rental market data
   - Political data: Currently limited to 2020 election (can be expanded to 2018-2024)

3. **Sample/Test Data**
   - Demographics and mental health appear to be placeholder datasets

---

## Data Quality Notes

### CDC WONDER Data Suppression
CDC suppresses death counts and rates when:
- Count is between 1-9 deaths
- Rate is based on counts <20
- Marked as "Suppressed", "Unreliable", or "Not Applicable" in source data

This primarily affects:
- Small/rural counties with low population
- Rare causes of death in any county

### Political Data
Currently only includes one election year (2020). The source file `data/countypres_2000-2024.csv` contains data for 2000-2024, but filtering for 2018-2023 leaves only 2020 data.

**To expand**: Could interpolate election results or use nearest election year.

### Demographics
The current dataset has very limited demographic coverage (50 rows). Consider:
- Fetching complete ACS data from Census API
- Using USDA ERS complete demographic files

---

## Recommendations for Improvement

### 1. **Expand Demographics**
Fetch comprehensive ACS 5-year estimates from Census API:
```python
# Example: Get full ACS demographics for all counties
base_url = "https://api.census.gov/data/2022/acs/acs5"
variables = "B01003_001E,B15003_022E,B02001_002E,B03003_003E"
for_clause = "county:*"
```

### 2. **Add Crime Data**
FBI Uniform Crime Reports (UCR):
- Violent crime rates
- Property crime rates
- Available at county level

### 3. **Add Hospital/Healthcare Access**
CMS or HRSA data:
- Hospitals per capita
- Mental health facilities
- Substance abuse treatment centers

### 4. **Handle Missing Political Data**
Options:
- Use nearest election year (2018→2016, 2019→2020, etc.)
- Include all presidential elections 2016-2024
- Add congressional/gubernatorial elections

### 5. **Imputation Strategies**
For analysis with missing data:
- **Multiple imputation**: MICE, missForest
- **Model-based**: Use observed correlations
- **Spatial imputation**: Use neighboring counties
- **Complete case analysis**: Document sample restrictions

---

## Usage Examples

### Load Data
```python
import pandas as pd
df = pd.read_csv('county_year_merged.csv')
```

### Filter to Complete Cases (High-Quality Variables Only)
```python
# Keep only observations with complete socioeconomic data
complete_ses = df.dropna(subset=['UnemploymentRate', 'PovertyRate',
                                  'MedianIncome', 'PerCapitaIncome'])
# ~94% of data retained
```

### Analyze Drug Deaths with Controls
```python
# Complete case analysis
analysis_df = df.dropna(subset=['DrugDeaths', 'UnemploymentRate',
                                 'PovertyRate', 'MedianIncome'])
# ~50% of data with valid drug death counts
```

---

## Scripts

### Main Merge Script
**File**: `merge_ses.py`

**Functions**:
- `fetch_bea()`: BEA per capita income
- `fetch_usda_ers()`: USDA unemployment data
- `fetch_saipe()`: Census poverty/income
- `fetch_zori()`: Zillow rent
- `load_political_data()`: Presidential election results
- `load_drug_deaths()`: CDC drug overdose deaths
- `load_suicide_deaths()`: CDC suicide mortality
- `load_mental_health()`: Mental health scores
- `load_acs_demographics()`: ACS demographics
- `merge_all(skip_qcew=False)`: Master merge function

**Run**:
```bash
python3 merge_ses.py
```

**Options**:
```python
# Skip slow QCEW employment/wage data
python3 -c "from merge_ses import merge_all; merge_all(skip_qcew=True)"
```

---

## Updates & Maintenance

**Last Updated**: October 26, 2025
**Data Currency**: 2018-2023
**Next Steps**:
1. Expand demographic data to full ACS dataset
2. Add crime data from FBI UCR
3. Expand political data to all election years
4. Add healthcare access metrics
5. Document mental health score methodology

---

## Contact & Attribution

When using this data, please cite the original sources:
- CDC WONDER: Centers for Disease Control and Prevention
- USDA ERS: U.S. Department of Agriculture Economic Research Service
- Census Bureau: SAIPE and ACS programs
- BEA: Bureau of Economic Analysis
- Zillow: ZORI (Observed Rent Index)
- MIT Election Lab: County Presidential Election Returns
