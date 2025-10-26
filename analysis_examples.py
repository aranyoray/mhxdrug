"""
Analysis Examples for County-Year Merged Dataset
================================================

Quick start examples for analyzing the integrated county-level data.
"""

import pandas as pd
import numpy as np

# Load the data
df = pd.read_csv('county_year_merged.csv')

print("="*70)
print("DATASET LOADED")
print("="*70)
print(f"Rows: {len(df):,} | Columns: {len(df.columns)}")
print(f"Years: {sorted(df['Year'].unique())}")
print(f"Counties: {df['fips'].nunique():,}")

# ============================================================================
# EXAMPLE 1: Complete Case Analysis
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 1: Complete Case Analysis (High-Quality Variables Only)")
print("="*70)

# Keep only observations with complete socioeconomic and political data
complete_df = df.dropna(subset=[
    'UnemploymentRate',
    'PovertyRate',
    'MedianIncome',
    'PerCapitaIncome',
    'RepublicanMargin',
    'BachelorsOrHigher',
    'Population'
])

print(f"Observations with complete SES data: {len(complete_df):,} ({len(complete_df)/len(df)*100:.1f}%)")
print(f"\nSummary statistics:")
print(complete_df[['UnemploymentRate', 'PovertyRate', 'RepublicanMargin']].describe())

# ============================================================================
# EXAMPLE 2: Drug Deaths Analysis
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 2: Drug Deaths by Political Orientation")
print("="*70)

# Filter to observations with drug death data
drug_df = df.dropna(subset=['DrugDeaths', 'RepublicanMargin'])

# Create political lean categories
drug_df['PoliticalLean'] = pd.cut(
    drug_df['RepublicanMargin'],
    bins=[-np.inf, -10, 10, np.inf],
    labels=['Strong Democrat', 'Swing', 'Strong Republican']
)

# Compare drug deaths by political lean
drug_by_politics = drug_df.groupby('PoliticalLean')['DrugDeaths'].agg(['mean', 'median', 'count'])
print(f"\nDrug deaths by political lean:")
print(drug_by_politics)

# ============================================================================
# EXAMPLE 3: Time Trends
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 3: Temporal Trends (2018-2023)")
print("="*70)

# Aggregate by year
yearly_trends = df.groupby('Year').agg({
    'DrugDeaths': 'mean',
    'SuicideDeaths': 'mean',
    'UnemploymentRate': 'mean',
    'PovertyRate': 'mean'
}).round(2)

print("\nYearly averages:")
print(yearly_trends)

# COVID impact (2020 onwards vs. before)
pre_covid = df[df['Year'] < 2020][['DrugDeaths', 'SuicideDeaths', 'UnemploymentRate']].mean()
post_covid = df[df['Year'] >= 2020][['DrugDeaths', 'SuicideDeaths', 'UnemploymentRate']].mean()

print("\n📊 Pre-COVID (2018-2019) vs. COVID era (2020-2023):")
print(f"{'Variable':<25} Pre-COVID  COVID Era  Change")
print("-" * 60)
for var in ['DrugDeaths', 'SuicideDeaths', 'UnemploymentRate']:
    change = ((post_covid[var] - pre_covid[var]) / pre_covid[var]) * 100
    print(f"{var:<25} {pre_covid[var]:>8.1f}  {post_covid[var]:>8.1f}  {change:>+6.1f}%")

# ============================================================================
# EXAMPLE 4: Correlation Analysis
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 4: Correlations with Drug Deaths")
print("="*70)

# Select numeric columns for correlation
numeric_cols = [
    'DrugDeaths', 'UnemploymentRate', 'PovertyRate',
    'MedianIncome', 'RepublicanMargin', 'BachelorsOrHigher'
]
correlations = df[numeric_cols].corr()['DrugDeaths'].drop('DrugDeaths').sort_values(ascending=False)

print("\nCorrelations with DrugDeaths:")
for var, corr in correlations.items():
    print(f"  {var:<25}: {corr:>6.3f}")

# ============================================================================
# EXAMPLE 5: Geographic Patterns
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 5: Top Counties by Drug Deaths (2023)")
print("="*70)

# Get 2023 data with complete information
df_2023 = df[(df['Year'] == 2023) & (df['DrugDeaths'].notna())].copy()

# Top 10 counties by absolute drug deaths
top_counties = df_2023.nlargest(10, 'DrugDeaths')[
    ['fips', 'DrugDeaths', 'DrugDeathRate', 'Population', 'RepublicanMargin']
]

print("\nTop 10 counties by drug deaths (2023):")
print(top_counties.to_string(index=False))

# ============================================================================
# EXAMPLE 6: Missing Data Patterns
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 6: Missing Data Analysis")
print("="*70)

missing_pct = (df.isnull().sum() / len(df) * 100).sort_values(ascending=False)
missing_pct = missing_pct[missing_pct > 0]

print("\nVariables with missing data:")
for var, pct in missing_pct.items():
    if pct > 50:
        status = "🔴"
    elif pct > 10:
        status = "🟡"
    else:
        status = "🟢"
    print(f"  {status} {var:<25}: {pct:>5.1f}% missing")

# ============================================================================
# EXAMPLE 7: Panel Data Setup
# ============================================================================
print("\n" + "="*70)
print("EXAMPLE 7: Panel Data Setup")
print("="*70)

# Create balanced panel (only counties with data for all years)
county_year_counts = df.groupby('fips')['Year'].nunique()
balanced_counties = county_year_counts[county_year_counts == 6].index
balanced_panel = df[df['fips'].isin(balanced_counties)].copy()

print(f"\nBalanced panel:")
print(f"  Counties: {len(balanced_counties):,}")
print(f"  Observations: {len(balanced_panel):,} ({len(balanced_panel) / len(df) * 100:.1f}%)")
print(f"  Years per county: {balanced_panel.groupby('fips')['Year'].nunique().unique()[0]}")

# ============================================================================
# SAVE SUBSETS
# ============================================================================
print("\n" + "="*70)
print("SAVING ANALYSIS-READY SUBSETS")
print("="*70)

# Save complete case dataset
complete_df.to_csv('complete_case_data.csv', index=False)
print(f"✅ Saved complete_case_data.csv ({len(complete_df):,} rows)")

# Save drug deaths analysis dataset
drug_df.to_csv('drug_deaths_analysis.csv', index=False)
print(f"✅ Saved drug_deaths_analysis.csv ({len(drug_df):,} rows)")

# Save balanced panel
balanced_panel.to_csv('balanced_panel.csv', index=False)
print(f"✅ Saved balanced_panel.csv ({len(balanced_panel):,} rows)")

print("\n" + "="*70)
print("ANALYSIS EXAMPLES COMPLETE!")
print("="*70)
print("\nNext steps:")
print("  1. Explore visualizations (scatter plots, time series, maps)")
print("  2. Run regressions (OLS, fixed effects, spatial models)")
print("  3. Handle missing data (imputation, sensitivity analysis)")
print("  4. Generate publication-ready tables and figures")
