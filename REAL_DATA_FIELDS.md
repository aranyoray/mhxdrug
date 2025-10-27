# Real Data Fields Available - NationVitals Project

## ✅ REAL Data Fields (Use These!)

### County-Level Data (Available in `/public/data/years/{year}.json`)

| Field | Description | Source | Years | Notes |
|-------|-------------|--------|-------|-------|
| `fips` | 5-digit FIPS code | Census | 2018-2023 | Unique county identifier |
| `DrugDeaths` | Drug overdose deaths (count) | CDC WONDER | 2018-2023 | May be null for suppressed counties |
| `DrugDeathRate` | Drug deaths per 100k population | CDC WONDER | 2018-2023 | Calculated rate |
| `SuicideRate` | Suicide deaths per 100k | CDC WONDER | 2018-2023 | May be null for suppressed counties |
| `RepublicanMargin` | Republican vote share margin (%) | MIT Election Lab | 2018-2023 | Presidential election data |
| `UnemploymentRate` | Unemployment rate (%) | BLS LAUS | 2018-2023 | County-level annual average |
| `PovertyRate` | Poverty rate (%) | Census ACS 5-year | 2018-2023 | From ACS estimates |

### State-Level Summary Data (`/public/data/state_summary.json`)

| Field | Description | Notes |
|-------|-------------|-------|
| `state_name` | Full state name | e.g., "California" |
| `state_fips` | 2-digit state FIPS | e.g., "06" |
| `DrugDeaths` | Average drug deaths | State-level aggregate |
| `SuicideDeaths` | Average suicide deaths | State-level aggregate |
| `RepublicanMargin` | Average Republican margin | From county aggregation |
| `n_counties` | Number of counties | Count of counties in state |

### GeoJSON Properties (`/public/data/us_counties.geojson`)

| Field | Description |
|-------|-------------|
| `GEOID` | 5-digit FIPS code (matches `fips` in year files) |
| `NAME` | County name (e.g., "Los Angeles") |
| `STATEFP` | 2-digit state FIPS |

### Additional Census Data (Available in `/data/acs_county_5y.csv`)

| Field | Description | Source |
|-------|-------------|--------|
| `MedianHouseholdIncome` | Median household income ($) | Census ACS |
| `BachelorsDegreeOrHigherPercent` | % with Bachelor's degree+ | Census ACS |
| `WhiteAlonePercent` | % White alone | Census ACS |
| `BlackOrAfricanAmericanAlonePercent` | % Black/African American | Census ACS |
| `HispanicOrLatinoPercent` | % Hispanic/Latino | Census ACS |

## ❌ DO NOT Generate Fake Data For:

### Fields That Should NOT Be Fabricated:
- ❌ **Urban/Rural Classification** - Need to add from USDA RUCC or NCHS codes
- ❌ **Population** - Must come from Census
- ❌ **Interstate Distance** - Would need GIS calculation with real highway data
- ❌ **Mental Health Days** - Not available at county level for all years
- ❌ **Specific Regional Classifications** (Appalachia, Rust Belt, etc.) - Need authoritative source
- ❌ **County Coordinates (lat/lon)** - Should be calculated from GeoJSON centroids
- ❌ **Trends/Time Series** - Should aggregate from real yearly data, not interpolated

## 📊 Data Integration Strategy

### To Add Urban/Rural Classification:

```python
# Option 1: Use USDA Rural-Urban Continuum Codes (RUCC) 2023
# Download from: https://www.ers.usda.gov/data-products/rural-urban-continuum-codes/
# Codes 1-3 = Metro/Urban
# Codes 4-9 = Non-metro/Rural

# Option 2: Use NCHS Urban-Rural Classification Scheme
# More granular: 6 categories from Large Central Metro to Noncore Rural
# Preferred for health data analysis

# Option 3: Census Metropolitan Statistical Area (MSA) Delineation
# Binary: Metro vs Non-metro based on OMB delineations
```

### To Calculate County Centroids:

```javascript
// From GeoJSON geometry
function calculateCentroid(geometry) {
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      coords.forEach(processCoords);
    }
  }

  processCoords(geometry.coordinates);
  return {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2
  };
}
```

## 🎯 Recommendations for Visualization

### Safe to Display:
- Drug death rates mapped to county colors
- Political lean (Republican margin) as color gradient
- Suicide rates as overlay
- Unemployment and poverty as contextual data
- Year-over-year trends from real 2018-2023 data

### Needs Real Data Integration:
- Urban vs Rural comparison (add RUCC codes first)
- Interstate proximity analysis (requires GIS processing)
- Regional classifications (define authoritative source)
- Population-weighted averages (add Census population data)

### Cannot Display Without External Data:
- Mental health provider access
- Insurance coverage rates
- Prescription opioid rates (would need ARCOS/DEA data)
- Specific demographic subgroup analyses

## 📝 Data Quality Notes

1. **Suppressed Values**: CDC WONDER suppresses counts <10 for privacy
   - These appear as `null` in `DrugDeaths` and `SuicideRate`
   - Affects ~30-40% of counties (mostly rural)

2. **Missing Political Data**: Some counties lack election data
   - Independent cities, Alaska boroughs may have gaps

3. **ACS Estimates**: Have margins of error, especially for small counties

4. **Time Lag**: Most recent complete data is 2023, some datasets may lag

## 🔗 Data Sources & Citations

- **Drug Deaths**: CDC WONDER Multiple Cause of Death database
- **Suicide**: CDC WONDER Underlying Cause of Death
- **Political Data**: MIT Election Data + Science Lab County Presidential Returns
- **Economic Data**: Bureau of Labor Statistics LAUS, Census Bureau ACS
- **Geography**: U.S. Census Bureau TIGER/Line Shapefiles

---

**Last Updated**: October 28, 2025
**Project**: NationVitals - Congressional App Challenge 2025
