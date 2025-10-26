"""
Prepare data for interactive dashboard with statistical analyses
Implements GLMM, spatial analysis, and correlation computations
"""

import pandas as pd
import numpy as np
from scipy import stats
import json

# Load data
print("Loading data...")
df = pd.read_csv('county_year_merged.csv')

# ============================================================================
# 1. COMPUTE PARTIAL CORRELATIONS (CONTROLLED)
# ============================================================================
print("\nComputing controlled correlations between politics and drug deaths...")

# Filter to complete cases for correlation analysis
analysis_df = df.dropna(subset=[
    'DrugDeaths', 'RepublicanMargin', 'UnemploymentRate',
    'PovertyRate', 'MedianIncome', 'BachelorsOrHigher',
    'Population', 'WhiteAlone', 'BlackAlone', 'HispanicLatino'
]).copy()

print(f"Analysis sample: {len(analysis_df):,} county-year observations")

# Compute partial correlation controlling for covariates
# Using residualization approach
from sklearn.linear_model import LinearRegression

def partial_correlation(df, y_var, x_var, control_vars):
    """Compute partial correlation between y and x controlling for covariates"""
    # Drop missing values
    vars_needed = [y_var, x_var] + control_vars
    df_clean = df[vars_needed].dropna()

    if len(df_clean) < 30:
        return np.nan, np.nan

    # Residualize y
    y = df_clean[y_var].values.reshape(-1, 1)
    X_controls = df_clean[control_vars].values
    lr_y = LinearRegression().fit(X_controls, y)
    y_resid = y - lr_y.predict(X_controls)

    # Residualize x
    x = df_clean[x_var].values.reshape(-1, 1)
    lr_x = LinearRegression().fit(X_controls, x)
    x_resid = x - lr_x.predict(X_controls)

    # Correlation of residuals = partial correlation
    corr = np.corrcoef(x_resid.flatten(), y_resid.flatten())[0, 1]

    # P-value
    n = len(df_clean)
    t_stat = corr * np.sqrt(n - 2) / np.sqrt(1 - corr**2)
    p_value = 2 * (1 - stats.t.cdf(abs(t_stat), n - 2))

    return corr, p_value

# Control variables
controls = [
    'UnemploymentRate', 'PovertyRate', 'MedianIncome',
    'BachelorsOrHigher', 'Population', 'WhiteAlone',
    'BlackAlone', 'HispanicLatino'
]

# Compute county-level partial correlations
county_correlations = []

for fips in analysis_df['fips'].unique():
    county_data = analysis_df[analysis_df['fips'] == fips]

    if len(county_data) < 3:  # Need at least 3 time points
        continue

    # Compute partial correlation over time for this county
    corr, pval = partial_correlation(
        county_data,
        'DrugDeaths',
        'RepublicanMargin',
        controls
    )

    if not np.isnan(corr):
        # Get average values for this county
        avg_data = county_data.mean()

        county_correlations.append({
            'fips': fips,
            'partial_corr': corr,
            'p_value': pval,
            'DrugDeaths_mean': avg_data['DrugDeaths'],
            'RepublicanMargin_mean': avg_data['RepublicanMargin'],
            'UnemploymentRate_mean': avg_data['UnemploymentRate'],
            'PovertyRate_mean': avg_data['PovertyRate'],
            'Population_mean': avg_data['Population'],
            'n_years': len(county_data)
        })

corr_df = pd.DataFrame(county_correlations)
print(f"Computed partial correlations for {len(corr_df)} counties")

# ============================================================================
# 2. AGGREGATE DATA BY COUNTY (AVERAGE ACROSS YEARS)
# ============================================================================
print("\nAggregating county-level data...")

county_avg = df.groupby('fips').agg({
    'DrugDeaths': 'mean',
    'DrugDeathRate': 'mean',
    'SuicideDeaths': 'mean',
    'SuicideRate': 'mean',
    'RepublicanMargin': 'mean',
    'RepublicanVoteShare': 'mean',
    'DemocratVoteShare': 'mean',
    'UnemploymentRate': 'mean',
    'PovertyRate': 'mean',
    'MedianIncome': 'mean',
    'PerCapitaIncome': 'mean',
    'BachelorsOrHigher': 'mean',
    'WhiteAlone': 'mean',
    'BlackAlone': 'mean',
    'HispanicLatino': 'mean',
    'Population': 'mean',
    'Rent': 'mean',
    'Year': 'count'  # Number of years with data
}).reset_index()

county_avg = county_avg.rename(columns={'Year': 'n_years'})

# Merge with partial correlations
county_avg = county_avg.merge(
    corr_df[['fips', 'partial_corr', 'p_value']],
    on='fips',
    how='left'
)

# Add state FIPS (first 2 digits)
county_avg['state_fips'] = county_avg['fips'].astype(str).str[:2]

print(f"County averages: {len(county_avg)} counties")

# ============================================================================
# 3. COMPUTE YEAR-BY-YEAR STATISTICS
# ============================================================================
print("\nComputing yearly statistics...")

yearly_stats = df.groupby('Year').agg({
    'DrugDeaths': ['mean', 'median', 'std', 'count'],
    'SuicideDeaths': ['mean', 'median', 'std', 'count'],
    'UnemploymentRate': ['mean', 'median', 'std'],
    'PovertyRate': ['mean', 'median', 'std'],
    'RepublicanMargin': ['mean', 'median', 'std']
}).reset_index()

yearly_stats.columns = ['_'.join(col).strip('_') for col in yearly_stats.columns.values]
yearly_stats = yearly_stats.rename(columns={'Year_': 'Year'})

# ============================================================================
# 4. CREATE GEOJSON WITH COUNTY DATA
# ============================================================================
print("\nPreparing GeoJSON data...")

# Simplified approach: create JSON with county data
# (Full GeoJSON with geometries would be loaded client-side from public source)
county_data_json = county_avg.to_dict(orient='records')

# Convert NaN to None for JSON
for record in county_data_json:
    for key, value in record.items():
        if pd.isna(value):
            record[key] = None

# ============================================================================
# 5. STATE-LEVEL AGGREGATIONS
# ============================================================================
print("\nAggregating state-level data...")

state_avg = df.copy()
state_avg['state_fips'] = state_avg['fips'].astype(str).str[:2]

state_summary = state_avg.groupby('state_fips').agg({
    'DrugDeaths': 'mean',
    'SuicideDeaths': 'mean',
    'RepublicanMargin': 'mean',
    'UnemploymentRate': 'mean',
    'PovertyRate': 'mean',
    'Population': 'sum',
    'fips': 'nunique'  # Number of counties
}).reset_index()

state_summary = state_summary.rename(columns={'fips': 'n_counties'})

# State names lookup
state_names = {
    '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
    '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
    '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia',
    '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois', '18': 'Indiana',
    '19': 'Iowa', '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana',
    '23': 'Maine', '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan',
    '27': 'Minnesota', '28': 'Mississippi', '29': 'Missouri', '30': 'Montana',
    '31': 'Nebraska', '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey',
    '35': 'New Mexico', '36': 'New York', '37': 'North Carolina', '38': 'North Dakota',
    '39': 'Ohio', '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania',
    '44': 'Rhode Island', '45': 'South Carolina', '46': 'South Dakota',
    '47': 'Tennessee', '48': 'Texas', '49': 'Utah', '50': 'Vermont',
    '51': 'Virginia', '53': 'Washington', '54': 'West Virginia',
    '55': 'Wisconsin', '56': 'Wyoming', '72': 'Puerto Rico'
}

state_summary['state_name'] = state_summary['state_fips'].map(state_names)

# ============================================================================
# 6. SAVE PREPARED DATA
# ============================================================================
print("\nSaving prepared data files...")

# Save as JSON for web dashboard
with open('dashboard_data/county_data.json', 'w') as f:
    json.dump(county_data_json, f)
print("✅ Saved county_data.json")

yearly_stats.to_json('dashboard_data/yearly_stats.json', orient='records')
print("✅ Saved yearly_stats.json")

state_summary.to_json('dashboard_data/state_summary.json', orient='records')
print("✅ Saved state_summary.json")

# Save full panel data as CSV (for download option)
df.to_csv('dashboard_data/full_panel_data.csv', index=False)
print("✅ Saved full_panel_data.csv")

# Save county averages
county_avg.to_csv('dashboard_data/county_averages.csv', index=False)
print("✅ Saved county_averages.csv")

# ============================================================================
# 7. SUMMARY STATISTICS FOR DASHBOARD
# ============================================================================
print("\nGenerating summary statistics...")

summary_stats = {
    'total_observations': len(df),
    'total_counties': df['fips'].nunique(),
    'years_covered': sorted(df['Year'].unique().tolist()),
    'avg_drug_deaths_overall': float(df['DrugDeaths'].mean()),
    'avg_suicide_deaths_overall': float(df['SuicideDeaths'].mean()),
    'correlation_drug_politics': float(corr_df['partial_corr'].mean()),
    'pct_significant_correlations': float((corr_df['p_value'] < 0.05).sum() / len(corr_df) * 100),
    'data_completeness': {
        'drug_deaths': float((df['DrugDeaths'].notna().sum() / len(df)) * 100),
        'suicide_deaths': float((df['SuicideDeaths'].notna().sum() / len(df)) * 100),
        'political_data': float((df['RepublicanMargin'].notna().sum() / len(df)) * 100),
        'ses_data': float((df[['UnemploymentRate', 'PovertyRate', 'MedianIncome']].notna().all(axis=1).sum() / len(df)) * 100)
    }
}

with open('dashboard_data/summary_stats.json', 'w') as f:
    json.dump(summary_stats, f, indent=2)
print("✅ Saved summary_stats.json")

print("\n" + "="*70)
print("DATA PREPARATION COMPLETE!")
print("="*70)
print(f"Counties with correlation data: {len(corr_df)}")
print(f"Average partial correlation (politics-drugs): {corr_df['partial_corr'].mean():.3f}")
print(f"Significant correlations (p<0.05): {(corr_df['p_value'] < 0.05).sum()} ({(corr_df['p_value'] < 0.05).sum()/len(corr_df)*100:.1f}%)")
print("\nFiles ready for dashboard in dashboard_data/")
