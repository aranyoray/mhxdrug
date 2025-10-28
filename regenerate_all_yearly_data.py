import pandas as pd
import json

# Read the complete CSV
df = pd.read_csv('county_year_merged_complete.csv')

# Filter out invalid fips
df = df[df['fips'].notna()]
df['fips'] = df['fips'].astype(str).str.zfill(5)

# Group by year
years = sorted(df['Year'].unique())
print(f"Years available: {years}")

# Create year-wise data
for year in years:
    year_df = df[df['Year'] == year].copy()
    
    # Convert to list of dicts
    counties = []
    for _, row in year_df.iterrows():
        county = {
            'fips': row['fips'],
            'Year': int(year),
            'DrugDeaths': float(row['DrugDeaths']) if pd.notna(row['DrugDeaths']) else None,
            'DrugDeathRate': float(row['DrugDeathRate']) if pd.notna(row['DrugDeathRate']) else None,
            'SuicideRate': float(row['SuicideRate']) if pd.notna(row['SuicideRate']) else None,
            'RepublicanMargin': float(row['RepublicanMargin']) if pd.notna(row['RepublicanMargin']) else None,
            'UnemploymentRate': float(row['UnemploymentRate']) if pd.notna(row['UnemploymentRate']) else None,
            'PovertyRate': float(row['PovertyRate']) if pd.notna(row['PovertyRate']) else None,
            'Population': float(row['Population']) if pd.notna(row['Population']) else None,
        }
        counties.append(county)
    
    # Save to individual year file
    year_str = str(int(year))
    with open(f'public/data/years/{year_str}.json', 'w') as f:
        json.dump(counties, f)
    print(f"✅ Saved public/data/years/{year_str}.json ({len(counties)} counties)")

print(f"\n✅ Regenerated all yearly data files with complete data")

