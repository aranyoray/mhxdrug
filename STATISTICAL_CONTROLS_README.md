# Statistical Controls - Technical Documentation

## ✅ What's Working

### Poverty Rate Control (ACTIVE)

**Coverage**: 91.7% of counties (3,153 / 3,437)
**Status**: ✅ **Fully functional and tested**

#### How It Works:

1. **Regression Model**: Runs least squares regression across all counties with complete data
   ```
   Outcome ~ PovertyRate
   ```

2. **Adjustment Formula** (Residualization):
   ```python
   adjusted_value = observed - (predicted - mean_predicted)
   ```

3. **What This Does**:
   - Removes the linear association between the outcome and poverty rate
   - Allows comparison "as if" counties had the same poverty level
   - Preserves the original scale of the outcome variable

4. **Example**:
   - **County A**: Poverty = 10.0%, Drug Deaths = 28.4 per 100k
     - **Adjusted**: 30.25 per 100k (UP because low poverty)
   - **County B**: Poverty = 25.5%, Drug Deaths = 0.04 per 100k
     - **Adjusted**: -4.93 per 100k (DOWN because high poverty)
   - **Interpretation**: After removing poverty's effect, County A actually has higher drug deaths

5. **Sample Size**: n=1,641 counties with complete DrugDeathRate and PovertyRate data

6. **Correlation**: r = 0.089 (positive - poverty weakly associated with higher drug deaths)

---

## ❌ What's Not Available

### Median Income Control (DATA TOO SPARSE)

**Coverage**: 0.6% of counties (20 / 3,437)
**Status**: ❌ **Disabled - insufficient data**

**Why?**
- Only 32 rows of MedianIncome data in ACS CSV file
- Only covers ~20 unique counties across all years
- Need minimum 50% coverage for valid regression adjustment
- **Cannot enable without comprehensive data source**

**Potential Solution**:
- Download Census ACS 5-year estimates for MedianIncome for all counties
- Or use Census API to fetch missing data
- Would require additional data processing pipeline

---

### Urban/Rural Control (NOT YET IMPLEMENTED)

**Coverage**: 0% of counties (0 / 3,437)
**Status**: ❌ **Disabled - needs integration**

**Why?**
- Have USDA Rural-Urban Continuum Codes (RUCC) classification available
- But not yet integrated into year JSON files
- Need to add `urban_rural` field to all county records

**How to Enable**:
1. Download USDA RUCC 2023 codes: https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/
2. Parse XLSX file to extract FIPS → RUCC mapping
3. Add `urban_rural` field to all counties in year JSON files
   - Codes 1-3 → "urban" (metro)
   - Codes 4-9 → "rural" (non-metro)
4. Update statistical_controls.py to handle categorical variable
   - Convert to binary dummy variable for regression
5. Enable checkbox in frontend

**Data Source**: USDA Economic Research Service
**File**: `ruralurbancodes2023.xlsx` (already attempted download)
**Classification**: 6-category RUCC scheme

---

## 🔬 Statistical Validity

### When to Use Controls:

✅ **GOOD**:
- Large sample size (n > 500 counties with data)
- High data completeness (>80% coverage)
- Confounding variable has known linear relationship with outcome
- Want to compare counties "holding constant" a factor

❌ **BAD**:
- Small sample size (n < 100)
- Sparse data (<50% coverage)
- Nonlinear relationships (may need polynomial terms)
- Multiple collinear confounders (multicollinearity)

### Current Status:

| Control | Sample Size | Coverage | Linear Correlation | Validity |
|---------|-------------|----------|-------------------|----------|
| **Poverty** | 1,641 | 91.7% | r = 0.089 | ✅ Valid |
| **Income** | 20 | 0.6% | Unknown | ❌ Invalid |
| **Urban/Rural** | 0 | 0% | Unknown | ❌ Not implemented |

---

## 📊 API Usage

### Endpoint: `/api/compare`

**Parameters**:
- `countyA` (required): FIPS code for first county
- `countyB` (required): FIPS code for second county
- `year` (optional, default=2023): Year to compare
- `controlPoverty` (boolean): Enable poverty adjustment
- `controlIncome` (boolean): Enable income adjustment (currently no-op)
- `controlUrbanRural` (boolean): Enable urban/rural adjustment (currently no-op)

**Example Request**:
```
GET /api/compare?countyA=1003&countyB=1005&year=2023&controlPoverty=true
```

**Example Response**:
```json
{
  "DrugDeathRate": {
    "raw_a": 28.4,
    "raw_b": 0.04,
    "adjusted_a": 30.25,
    "adjusted_b": -4.93,
    "adjustment_pct_a": 6.5,
    "adjustment_pct_b": 12430.9,
    "n_counties": 1641,
    "confounders": ["PovertyRate"],
    "adjustment_note": "Adjusted for: PovertyRate"
  }
}
```

---

## 🛠️ Backend Implementation

### File: `statistical_controls.py`

**Key Functions**:

1. `load_year_data(year)`: Loads county data from JSON
2. `adjust_for_confounders(...)`: Main function
   - Builds regression dataset
   - Runs OLS regression using NumPy
   - Computes adjusted values via residualization
   - Returns both raw and adjusted values

**Dependencies**:
- `numpy`: Linear algebra for regression
- `scipy.stats`: Statistical functions (currently imported but not used)

**Performance**:
- Typical runtime: <1 second
- Sample size: 1,641 counties
- Regression: Simple linear (1 predictor)
- Algorithm: Least squares via `np.linalg.lstsq`

---

## 🎯 User-Facing Behavior

### In the Comparison Sidebar:

1. **No Controls Selected**: Shows raw values only
   ```
   Drug Death Rate: 28.4 per 100k
   ```

2. **Poverty Control Enabled**: Shows adjusted values with raw underneath
   ```
   Drug Death Rate: 30.25 per 100k
   Raw: 28.4 per 100k (6% adj)
   Note: Adjusted for PovertyRate (n=1641 counties)
   ```

3. **Visual Indicators**:
   - Blue "Adjusted" badge appears when controls active
   - Loading spinner while computing
   - Adjustment percentage shown
   - Sample size displayed for transparency

---

## 📚 References

- **Residualization**: Standard econometric technique for removing confounding effects
- **Source**: Poverty data from U.S. Census Bureau SAIPE (Small Area Income and Poverty Estimates)
- **Methodology**: Based on standard linear regression adjustment used in epidemiology and social science
- **Transparency**: All sample sizes, adjustment percentages, and methodology notes shown to user

---

**Last Updated**: October 28, 2025
**Project**: NationVitals - Congressional App Challenge 2025
