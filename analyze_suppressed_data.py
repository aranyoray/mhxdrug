import pandas as pd
import numpy as np

df = pd.read_csv('data/drug_deaths_2018_2023.csv')

# Extract state FIPS
df['fips'] = df['County Code'].astype(str).str.zfill(5)
df['state_fips'] = df['fips'].str[:2]

# Identify suppressed entries
df['deaths_num'] = pd.to_numeric(df['Deaths'], errors='coerce')
df['rate_num'] = pd.to_numeric(df['Crude Rate'], errors='coerce')

print("=== STATE-LEVEL SUPPRESSION ANALYSIS ===\n")
print(f"Total rows: {len(df)}")
print(f"Suppressed rates: {(df['Crude Rate'] == 'Unreliable').sum()}")

# Check states
state_stats = []
for state in sorted(df['state_fips'].unique()):
    state_df = df[df['state_fips'] == state]
    
    suppressed = (state_df['Crude Rate'] == 'Unreliable').sum()
    has_any_data = state_df['deaths_num'].notna().any()
    avg_rate = state_df['rate_num'].mean()
    
    state_stats.append({
        'state': state,
        'total': len(state_df),
        'suppressed': suppressed,
        'pct': (suppressed / len(state_df) * 100) if len(state_df) > 0 else 0,
        'has_data': has_any_data,
        'avg_rate': avg_rate
    })

state_df = pd.DataFrame(state_stats).sort_values('suppressed', ascending=False)
print("\nTop 20 states with most suppression:")
print(state_df.head(20)[['state', 'total', 'suppressed', 'pct', 'has_data', 'avg_rate']])

# Find states with no data
no_data = state_df[~state_df['has_data']]
print(f"\n=== STATES WITH NO DATA (SKIP THESE) ===")
print(f"Count: {len(no_data)}")
print(f"Codes: {no_data['state'].tolist()}")

# Find states suitable for extrapolation
can_extrapolate = state_df[state_df['has_data'] & (state_df['suppressed'] > 0)]
print(f"\n=== STATES SUITABLE FOR EXTRAPOLATION ===")
print(f"Count: {len(can_extrapolate)}")
print(f"Total suppressed entries: {can_extrapolate['suppressed'].sum()}")

