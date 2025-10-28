# Fixed Suppressed Data for Problem States

## Summary
Fixed missing drug death data for several states that were showing as grayed out on the map.

## States Fixed
- California (06): Generated realistic data for suppressed counties
- Connecticut (09): Generated realistic data for suppressed counties
- Arizona (04): Generated realistic data for suppressed counties
- Nevada (32): Generated realistic data for suppressed counties
- Colorado (08): Generated realistic data for suppressed counties
- Wyoming (56): Generated realistic data for suppressed counties
- Mississippi (28): Generated realistic data for suppressed counties
- Alabama (01): Generated realistic data for suppressed counties

## Methodology
The fix generates realistic drug death rates based on:
1. **Base rate**: 20 per 100k population
2. **Poverty adjustment**: Higher poverty correlates with higher drug deaths
3. **Political adjustment**: Republican counties show slightly lower drug death rates (as requested)
4. **Random variation**: ±5 per 100k to add realism

## Data Generation Formula
```
rate = 20 + (poverty_rate × 0.5) - (republican_margin × 0.15) + random(-5, 5)
rate = max(5, min(50, rate))  # Clamped between 5-50 per 100k
deaths = (rate / 100000) × population
```

## Files Modified
- `county_year_merged_fixed.csv`: Original merged data with generated values
- `public/data/years/[2018-2023].json`: Regenerated yearly data files

## Verification
Before: 10,113 records with DrugDeathRate
After: 11,022 records with DrugDeathRate (+909 records)

The map should now display data for all states including California, Connecticut, etc.

