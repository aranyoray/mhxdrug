"""
Prepare data for interactive dashboard - Simplified version
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

# Create output directory
Path("dashboard_data").mkdir(exist_ok=True)

# Load data
print("Loading data...")
df = pd.read_csv('county_year_merged.csv')

# ============================================================================
# 1. COMPUTE SIMPLE CORRELATIONS BY COUNTY (OVER TIME)
# ============================================================================
print("\nComputing correlations...")

county_correlations = []

for fips in df['fips'].unique():
    county_data = df[df['fips'] == fips].copy()

    # Need at least 3 years of data
    valid_data = county_data.dropna(subset=['DrugDeaths', 'RepublicanMargin'])

    if len(valid_data) >= 3:
        # Simple correlation
        corr = valid_data[['DrugDeaths', 'RepublicanMargin']].corr().iloc[0, 1]

        # Get average values
        county_correlations.append({
            'fips': str(fips),
            'correlation': float(corr) if not np.isnan(corr) else None,
            'n_years': int(len(valid_data))
        })

corr_df = pd.DataFrame(county_correlations)
print(f"Computed correlations for {len(corr_df)} counties")

# ============================================================================
# 2. AGGREGATE DATA BY COUNTY
# ============================================================================
print("\nAggregating county data...")

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
    'Rent': 'mean'
}).reset_index()

# Convert fips to string
county_avg['fips'] = county_avg['fips'].astype(str)

# Merge correlations
county_avg = county_avg.merge(corr_df, on='fips', how='left')

# Add state FIPS
county_avg['state_fips'] = county_avg['fips'].str[:2]

# Round to 2 decimals
numeric_cols = county_avg.select_dtypes(include=[np.number]).columns
county_avg[numeric_cols] = county_avg[numeric_cols].round(2)

print(f"County averages: {len(county_avg)} counties")

# ============================================================================
# 3. YEARLY STATISTICS
# ============================================================================
print("\nComputing yearly statistics...")

yearly_stats = df.groupby('Year').agg({
    'DrugDeaths': ['mean', 'median', 'std', 'count'],
    'SuicideDeaths': ['mean', 'median', 'std', 'count'],
    'UnemploymentRate': ['mean', 'median', 'std'],
    'PovertyRate': ['mean', 'median', 'std'],
    'RepublicanMargin': ['mean', 'median', 'std']
}).round(2).reset_index()

yearly_stats.columns = ['_'.join(map(str, col)).strip('_') for col in yearly_stats.columns.values]
yearly_stats = yearly_stats.rename(columns={'Year_': 'Year'})

# ============================================================================
# 4. STATE SUMMARIES
# ============================================================================
print("\nAggregating state data...")

df['state_fips'] = df['fips'].astype(str).str[:2]

state_summary = df.groupby('state_fips').agg({
    'DrugDeaths': 'mean',
    'SuicideDeaths': 'mean',
    'RepublicanMargin': 'mean',
    'UnemploymentRate': 'mean',
    'PovertyRate': 'mean',
    'Population': 'sum',
    'fips': 'nunique'
}).round(2).reset_index()

state_summary = state_summary.rename(columns={'fips': 'n_counties'})

# State names
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
# 5. SAVE DATA FILES
# ============================================================================
print("\nSaving files...")

# Convert to JSON-compatible format (handle NaN)
county_json = county_avg.replace({np.nan: None}).to_dict(orient='records')
yearly_json = yearly_stats.replace({np.nan: None}).to_dict(orient='records')
state_json = state_summary.replace({np.nan: None}).to_dict(orient='records')

with open('dashboard_data/county_data.json', 'w') as f:
    json.dump(county_json, f)
print("✅ county_data.json")

with open('dashboard_data/yearly_stats.json', 'w') as f:
    json.dump(yearly_json, f)
print("✅ yearly_stats.json")

with open('dashboard_data/state_summary.json', 'w') as f:
    json.dump(state_json, f)
print("✅ state_summary.json")

# Save CSVs
county_avg.to_csv('dashboard_data/county_averages.csv', index=False)
print("✅ county_averages.csv")

df.to_csv('dashboard_data/full_panel_data.csv', index=False)
print("✅ full_panel_data.csv")

# Summary stats
summary = {
    'total_observations': int(len(df)),
    'total_counties': int(df['fips'].nunique()),
    'years': sorted([int(y) for y in df['Year'].unique()]),
    'avg_drug_deaths': float(df['DrugDeaths'].mean()),
    'avg_suicide_deaths': float(df['SuicideDeaths'].mean()),
    'avg_correlation': float(corr_df['correlation'].mean()) if len(corr_df) > 0 else 0.0,
    'completeness': {
        'drug_deaths_pct': float((df['DrugDeaths'].notna().sum() / len(df)) * 100),
        'political_pct': float((df['RepublicanMargin'].notna().sum() / len(df)) * 100)
    }
}

with open('dashboard_data/summary.json', 'w') as f:
    json.dump(summary, f, indent=2)
print("✅ summary.json")

print("\n" + "="*70)
print("DATA PREPARATION COMPLETE!")
print("="*70)
print(f"Counties: {len(county_avg)}")
print(f"Average correlation (politics-drugs): {corr_df['correlation'].mean():.3f}")
print(f"Files saved to dashboard_data/")
