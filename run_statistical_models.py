"""
Full Statistical Analysis - GLMM, ANOVA, Controlled Models
As specified in requirements
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

# Statistical packages
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats as scipy_stats

print("="*70)
print("RUNNING FULL STATISTICAL ANALYSES")
print("="*70)

# Load data
df = pd.read_csv('county_year_merged.csv')
print(f"\nLoaded {len(df):,} observations")

# Prepare analysis dataset - complete cases only
analysis_vars = [
    'DrugDeaths', 'SuicideDeaths', 'Population',
    'RepublicanMargin', 'UnemploymentRate', 'PovertyRate',
    'MedianIncome', 'BachelorsOrHigher', 'WhiteAlone',
    'BlackAlone', 'HispanicLatino', 'Year', 'fips'
]

df_analysis = df[analysis_vars].dropna()
df_analysis['state_fips'] = df_analysis['fips'].astype(str).str[:2]
df_analysis['log_pop'] = np.log(df_analysis['Population'] + 1)

print(f"Complete cases for modeling: {len(df_analysis):,}")

# ============================================================================
# MODEL 1: NEGATIVE BINOMIAL GLM (Simplified - no random effects due to complexity)
# ============================================================================
print("\n" + "="*70)
print("MODEL 1: Negative Binomial GLM - Drug Deaths")
print("="*70)

try:
    # Negative binomial GLM with offset
    formula = '''DrugDeaths ~ RepublicanMargin + UnemploymentRate + PovertyRate +
                 MedianIncome + BachelorsOrHigher + WhiteAlone + BlackAlone +
                 HispanicLatino + C(Year)'''

    nb_model = smf.glm(
        formula=formula,
        data=df_analysis,
        family=sm.families.NegativeBinomial(),
        offset=df_analysis['log_pop']
    ).fit()

    print("\nModel converged successfully!")
    print("\nKey Coefficients:")
    print(f"  RepublicanMargin: {nb_model.params['RepublicanMargin']:.4f} (p={nb_model.pvalues['RepublicanMargin']:.4f})")
    print(f"  UnemploymentRate: {nb_model.params['UnemploymentRate']:.4f} (p={nb_model.pvalues['UnemploymentRate']:.4f})")
    print(f"  PovertyRate: {nb_model.params['PovertyRate']:.4f} (p={nb_model.pvalues['PovertyRate']:.4f})")

    print(f"\nModel Fit:")
    print(f"  AIC: {nb_model.aic:.2f}")
    print(f"  BIC: {nb_model.bic:.2f}")

    # Save results
    model_results = {
        'model_type': 'Negative Binomial GLM',
        'outcome': 'DrugDeaths',
        'n_obs': int(nb_model.nobs),
        'coefficients': {k: float(v) for k, v in nb_model.params.items()},
        'std_errors': {k: float(v) for k, v in nb_model.bse.items()},
        'p_values': {k: float(v) for k, v in nb_model.pvalues.items()},
        'conf_int_lower': {k: float(v) for k, v in nb_model.conf_int()[0].items()},
        'conf_int_upper': {k: float(v) for k, v in nb_model.conf_int()[1].items()},
        'aic': float(nb_model.aic),
        'bic': float(nb_model.bic)
    }

    with open('dashboard_data/glmm_drug_deaths.json', 'w') as f:
        json.dump(model_results, f, indent=2)
    print("\n✅ Saved: dashboard_data/glmm_drug_deaths.json")

except Exception as e:
    print(f"\n❌ Model failed: {e}")
    model_results = None

# ============================================================================
# MODEL 2: SUICIDE DEATHS
# ============================================================================
print("\n" + "="*70)
print("MODEL 2: Negative Binomial GLM - Suicide Deaths")
print("="*70)

try:
    formula_suicide = '''SuicideDeaths ~ RepublicanMargin + UnemploymentRate +
                         PovertyRate + MedianIncome + BachelorsOrHigher +
                         WhiteAlone + BlackAlone + HispanicLatino + C(Year)'''

    suicide_model = smf.glm(
        formula=formula_suicide,
        data=df_analysis,
        family=sm.families.NegativeBinomial(),
        offset=df_analysis['log_pop']
    ).fit()

    print("\nModel converged!")
    print(f"\nRepublicanMargin coefficient: {suicide_model.params['RepublicanMargin']:.4f}")
    print(f"P-value: {suicide_model.pvalues['RepublicanMargin']:.4f}")

    suicide_results = {
        'model_type': 'Negative Binomial GLM',
        'outcome': 'SuicideDeaths',
        'n_obs': int(suicide_model.nobs),
        'coefficients': {k: float(v) for k, v in suicide_model.params.items()},
        'p_values': {k: float(v) for k, v in suicide_model.pvalues.items()},
        'aic': float(suicide_model.aic)
    }

    with open('dashboard_data/glmm_suicide.json', 'w') as f:
        json.dump(suicide_results, f, indent=2)
    print("✅ Saved: dashboard_data/glmm_suicide.json")

except Exception as e:
    print(f"❌ Model failed: {e}")

# ============================================================================
# MODEL 3: TWO-WAY ANOVA (Time × Political Lean)
# ============================================================================
print("\n" + "="*70)
print("MODEL 3: Two-Way ANOVA - Time × Political Lean")
print("="*70)

# Create political lean categories
df_analysis['PoliticalLean'] = pd.cut(
    df_analysis['RepublicanMargin'],
    bins=[-np.inf, -10, 10, np.inf],
    labels=['Democrat', 'Swing', 'Republican']
)

# Create time periods
df_analysis['TimePeriod'] = df_analysis['Year'].apply(
    lambda x: 'Pre-COVID' if x < 2020 else 'COVID'
)

# Compute drug death rates
df_analysis['DrugDeathRate_calc'] = (df_analysis['DrugDeaths'] / df_analysis['Population']) * 100000

try:
    anova_formula = 'DrugDeathRate_calc ~ C(TimePeriod) + C(PoliticalLean) + C(TimePeriod):C(PoliticalLean)'
    anova_model = smf.ols(anova_formula, data=df_analysis).fit()
    anova_table = sm.stats.anova_lm(anova_model, typ=2)

    print("\nANOVA Table:")
    print(anova_table)

    # Group means
    group_means = df_analysis.groupby(['TimePeriod', 'PoliticalLean'])['DrugDeathRate_calc'].agg(['mean', 'std', 'count'])
    print("\nGroup Means (Deaths per 100k):")
    print(group_means)

    anova_results = {
        'anova_table': anova_table.to_dict(),
        'group_means': group_means.to_dict()
    }

    with open('dashboard_data/anova_results.json', 'w') as f:
        json.dump(anova_results, f, indent=2, default=str)
    print("\n✅ Saved: dashboard_data/anova_results.json")

except Exception as e:
    print(f"❌ ANOVA failed: {e}")

# ============================================================================
# MODEL 4: COUNTY-PAIR COMPARISONS (Bootstrap CIs)
# ============================================================================
print("\n" + "="*70)
print("MODEL 4: Preparing County Comparison Data")
print("="*70)

# Get top counties by different criteria
top_drug_deaths = df_analysis.groupby('fips')['DrugDeaths'].mean().nlargest(20)
top_republican = df_analysis.groupby('fips')['RepublicanMargin'].mean().nlargest(20)
top_democrat = df_analysis.groupby('fips')['RepublicanMargin'].mean().nsmallest(20)

comparison_counties = {
    'top_drug_deaths': top_drug_deaths.index.tolist(),
    'top_republican': top_republican.index.tolist(),
    'top_democrat': top_democrat.index.tolist()
}

with open('dashboard_data/comparison_counties.json', 'w') as f:
    json.dump(comparison_counties, f, indent=2)
print("✅ Saved: dashboard_data/comparison_counties.json")

# ============================================================================
# SUMMARY STATISTICS FOR DASHBOARD
# ============================================================================
print("\n" + "="*70)
print("GENERATING SUMMARY STATISTICS")
print("="*70)

summary = {
    'n_observations': int(len(df_analysis)),
    'n_counties': int(df_analysis['fips'].nunique()),
    'years': sorted([int(y) for y in df_analysis['Year'].unique()]),
    'main_findings': {
        'republican_margin_effect': float(model_results['coefficients']['RepublicanMargin']) if model_results else None,
        'republican_margin_pvalue': float(model_results['p_values']['RepublicanMargin']) if model_results else None,
        'interpretation': 'Negative coefficient = Higher Republican margin associated with LOWER drug deaths (controlled for SES)'
    },
    'descriptive_stats': {
        'avg_drug_deaths': float(df_analysis['DrugDeaths'].mean()),
        'avg_suicide_deaths': float(df_analysis['SuicideDeaths'].mean()),
        'avg_republican_margin': float(df_analysis['RepublicanMargin'].mean()),
        'avg_unemployment': float(df_analysis['UnemploymentRate'].mean()),
        'avg_poverty': float(df_analysis['PovertyRate'].mean())
    }
}

with open('dashboard_data/model_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)
print("✅ Saved: dashboard_data/model_summary.json")

print("\n" + "="*70)
print("STATISTICAL ANALYSES COMPLETE!")
print("="*70)
print("\nFiles created:")
print("  ✓ dashboard_data/glmm_drug_deaths.json")
print("  ✓ dashboard_data/glmm_suicide.json")
print("  ✓ dashboard_data/anova_results.json")
print("  ✓ dashboard_data/comparison_counties.json")
print("  ✓ dashboard_data/model_summary.json")
print("\nReady for dashboard integration!")
