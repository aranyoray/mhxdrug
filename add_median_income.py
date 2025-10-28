#!/usr/bin/env python3
"""
Add MedianIncome data from ACS to year JSON files
"""

import json
import csv
from collections import defaultdict

print("Loading ACS data...")
acs_data = defaultdict(dict)

with open('data/acs_county_5y.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        fips = row['FIPS']
        year = row['Year']
        income = row.get('MedianHouseholdIncome', '').strip()

        if income and income != '':
            try:
                acs_data[year][fips] = float(income)
            except ValueError:
                pass

print(f"Loaded ACS data for {len(acs_data)} years")

# Update each year file
years = [2018, 2019, 2020, 2021, 2022, 2023]
total_added = 0

for year in years:
    year_str = str(year)
    file_path = f'public/data/years/{year}.json'

    print(f"\nProcessing {year}...")

    with open(file_path) as f:
        data = json.load(f)

    added_count = 0
    for county in data:
        fips_int = county['fips']
        fips_str = str(fips_int)  # Don't zero-pad, ACS uses "1001" not "01001"

        # Try to get income for this specific year, or nearby years
        income = None
        for y_offset in [0, -1, 1, -2, 2, -3, 3]:  # Try exact year, then ±1, ±2, ±3 years
            check_year = str(year + y_offset)
            if check_year in acs_data and fips_str in acs_data[check_year]:
                income = acs_data[check_year][fips_str]
                break

        if income is not None:
            county['MedianIncome'] = income
            added_count += 1

    # Save updated file
    with open(file_path, 'w') as f:
        json.dump(data, f)

    print(f"  Added MedianIncome to {added_count} counties")
    total_added += added_count

print(f"\n✅ Done! Added MedianIncome to {total_added} total county-year records")
print("Note: Used ±2 year tolerance for missing years")
