# County Health and Political Analysis Dashboard

Interactive map visualization showing county-level correlations between political leanings and drug overdose deaths across the United States (2018-2023).

## Features

- Side-by-side county maps comparing drug overdose deaths and political lean
- Year slider to view trends from 2018-2023
- County comparison tool with statistical adjustments
- Search functionality to find specific counties
- Interactive hover tooltips with detailed county statistics

## stack
- Next.js 14
- MapLibre GL
- TypeScript
- Tailwind CSS
- Wolfram Language (geospatial analytics)
- Python (data processing)

## Data Processing

This project uses a combination of Wolfram Language for geospatial analytics (interstate proximity calculations) and Python for data merging and statistical processing. Key scripts:

- `merge_SES.py`: Merges socioeconomic data with health outcomes
- `wolfram/`: Wolfram scripts for geospatial calculations

## Data Sources

- CDC Wonder (drug overdose mortality)
- MIT Election Data Science Lab (county voting)
- U.S. Census Bureau (demographics)

## Installation

```bash
npm install
npm run dev
```

Visit http://localhost:3000

