#!/usr/bin/env python3
"""
Fix year JSON files by:
1. Replacing NaN with null (proper JSON)
2. Removing unnecessary fields to reduce file size
3. Creating compressed versions
"""

import json
import gzip
import os
from pathlib import Path

def fix_json_file(input_path, output_path):
    """Read JSON file, fix NaN values, and write proper JSON"""
    # Read the file as text first
    with open(input_path, 'r') as f:
        content = f.read()

    # Replace NaN with null (valid JSON)
    content = content.replace(': NaN,', ': null,')
    content = content.replace(': NaN}', ': null}')

    # Parse to validate and reformat
    data = json.loads(content)

    # Keep only essential fields for the map visualization
    essential_fields = [
        'fips', 'Year', 'DrugDeaths', 'DrugDeathRate', 'Is_Suppressed',
        'SuicideRate', 'RepublicanMargin', 'UnemploymentRate', 'PovertyRate',
        'Urban_Rural_Category'  # Keep this if it exists
    ]

    cleaned_data = []
    for county in data:
        cleaned_county = {}
        for field in essential_fields:
            if field in county:
                cleaned_county[field] = county[field]
        cleaned_data.append(cleaned_county)

    # Write cleaned JSON
    with open(output_path, 'w') as f:
        json.dump(cleaned_data, f, separators=(',', ':'))

    # Create gzipped version
    gz_path = str(output_path) + '.gz'
    with gzip.open(gz_path, 'wt', encoding='utf-8') as f:
        json.dump(cleaned_data, f, separators=(',', ':'))

    # Print size comparison
    original_size = os.path.getsize(input_path)
    new_size = os.path.getsize(output_path)
    gz_size = os.path.getsize(gz_path)

    print(f"{output_path.name}:")
    print(f"  Original: {original_size / 1024:.1f} KB")
    print(f"  Cleaned:  {new_size / 1024:.1f} KB ({(1 - new_size/original_size)*100:.1f}% smaller)")
    print(f"  Gzipped:  {gz_size / 1024:.1f} KB ({(1 - gz_size/original_size)*100:.1f}% smaller)")

    return cleaned_data

def main():
    years_dir = Path('public/data/years')

    if not years_dir.exists():
        print(f"Error: {years_dir} does not exist")
        return

    print("Fixing year JSON files...")
    print("=" * 60)

    for year_file in sorted(years_dir.glob('*.json')):
        # Skip already gzipped files
        if year_file.suffix == '.gz':
            continue

        # Skip backup files
        if '.backup' in year_file.name:
            continue

        print(f"\nProcessing {year_file.name}...")

        # Create backup
        backup_path = year_file.with_suffix('.json.backup')
        if not backup_path.exists():
            import shutil
            shutil.copy2(year_file, backup_path)
            print(f"  Created backup: {backup_path.name}")

        # Fix the file
        fix_json_file(year_file, year_file)

    print("\n" + "=" * 60)
    print("All files processed successfully!")
    print("\nBackup files created with .backup extension")
    print("You can delete them after verifying the new files work correctly.")

if __name__ == '__main__':
    main()
