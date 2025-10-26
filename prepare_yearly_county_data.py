import pandas as pd
import json

# Read the merged CSV
df = pd.read_csv('county_year_merged.csv')

# Filter out invalid fips
df = df[df['fips'].notna()]
df = df[df['fips'] != '00000']
df['fips'] = df['fips'].astype(str).str.zfill(5)

# Group by year
years = sorted(df['Year'].unique())
print(f"Years available: {years}")

# Create year-wise data
yearly_data = {}

for year in years:
    year_df = df[df['Year'] == year].copy()

    # Convert to list of dicts
    counties = []
    for _, row in year_df.iterrows():
        county = {
            'fips': row['fips'],
            'DrugDeathRate': float(row['DrugDeathRate']) if pd.notna(row['DrugDeathRate']) else None,
            'SuicideRate': float(row['SuicideRate']) if pd.notna(row['SuicideRate']) else None,
            'RepublicanMargin': float(row['RepublicanMargin']) if pd.notna(row['RepublicanMargin']) else None,
            'UnemploymentRate': float(row['UnemploymentRate']) if pd.notna(row['UnemploymentRate']) else None,
            'PovertyRate': float(row['PovertyRate']) if pd.notna(row['PovertyRate']) else None,
        }
        counties.append(county)

    yearly_data[str(int(year))] = counties
    print(f"Year {int(year)}: {len(counties)} counties")

# Save to JSON
with open('public/data/yearly_county_data.json', 'w') as f:
    json.dump(yearly_data, f)

print(f"\nSaved yearly_county_data.json")
print(f"Total years: {len(yearly_data)}")
