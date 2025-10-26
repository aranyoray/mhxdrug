# Interactive Dashboard - Deployment Guide

## 🎯 Overview

This dashboard visualizes the relationship between political orientation, drug overdose deaths, and suicide mortality across U.S. counties (2018-2023), with statistical rigor and controlled analyses.

**Features:**
- 📍 Interactive choropleth map colored by politics-drug correlation
- 📊 Statistical analyses page (GLMM, ANOVA, controlled correlations)
- 🔍 Two-county comparison tool with bootstrapped CIs
- ⏱️ Time filtering and animation
- 🗺️ State selection filters
- 📥 Data download options

---

## 🚀 Quick Deployment to Vercel

### Option 1: Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to dashboard directory
cd /Users/aranyoray/Downloads/mhxdrug/dashboard_nextjs

# 3. Deploy
vercel

# Follow prompts:
#   - Setup and deploy? Yes
#   - Which scope? Your account
#   - Link to existing project? No
#   - Project name? mh-drug-politics-dashboard
#   - Directory? ./
#   - Override settings? No

# 4. Deploy to production
vercel --prod
```

### Option 2: GitHub + Vercel Dashboard

```bash
# 1. Initialize git repo
git init
git add .
git commit -m "Initial dashboard commit"

# 2. Create GitHub repo and push
gh repo create mh-drug-politics-dashboard --public --source=. --push

# 3. Go to vercel.com
# - Import GitHub repository
# - Configure: Framework Preset = Next.js
# - Deploy
```

---

## 📁 Required File Structure

```
dashboard_nextjs/
├── app/
│   ├── page.tsx                 # Main map page
│   ├── statistics/page.tsx      # Statistical methodology page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/
│   ├── Map.tsx                 # Interactive choropleth map
│   ├── CountyComparison.tsx    # Two-county comparison tool
│   ├── TimeFilter.tsx          # Year selection/animation
│   ├── StateFilter.tsx         # State selection
│   └── StatsPanel.tsx          # Statistics display
├── public/
│   └── data/
│       ├── county_data.json    # County averages & correlations
│       ├── yearly_stats.json   # Temporal trends
│       ├── state_summary.json  # State aggregations
│       └── us-counties.json    # County boundaries (GeoJSON)
├── lib/
│   ├── data.ts                 # Data loading utilities
│   └── stats.ts                # Statistical functions
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

---

## 📦 Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "maplibre-gl": "^4.0.0",
    "react-map-gl": "^7.1.0",
    "recharts": "^2.10.0",
    "d3-scale": "^4.0.2",
    "d3-scale-chromatic": "^3.0.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

Install:
```bash
npm install
```

---

## 🗺️ Data Preparation

### 1. Copy Prepared Data

```bash
# Copy JSON files to public/data
cp dashboard_data/*.json dashboard_nextjs/public/data/
```

### 2. Download County GeoJSON

```bash
# Download US counties boundaries
curl -o dashboard_nextjs/public/data/us-counties.json \
  https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json
```

---

## 🎨 Key Components to Build

### 1. Main Map Page (`app/page.tsx`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import Map from '@/components/Map'
import TimeFilter from '@/components/TimeFilter'
import StateFilter from '@/components/StateFilter'
import CountyComparison from '@/components/CountyComparison'

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(2023)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [countyData, setCountyData] = useState([])

  useEffect(() => {
    fetch('/data/county_data.json')
      .then(res => res.json())
      .then(data => setCountyData(data))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Politics, Drug Deaths & Mental Health
          </h1>
          <p className="text-sm text-gray-600">
            County-level analysis (2018-2023)
          </p>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Controls */}
        <aside className="w-80 bg-white p-4 shadow-lg">
          <TimeFilter
            value={selectedYear}
            onChange={setSelectedYear}
          />
          <StateFilter
            selected={selectedStates}
            onChange={setSelectedStates}
          />
          <CountyComparison data={countyData} />
        </aside>

        {/* Main Map */}
        <main className="flex-1">
          <Map
            data={countyData}
            year={selectedYear}
            states={selectedStates}
          />
        </main>
      </div>
    </div>
  )
}
```

### 2. Interactive Map (`components/Map.tsx`)

Uses MapLibre GL + county GeoJSON colored by correlation coefficient.

**Color Scale:**
- Blue (strong negative): High Rep margin → Low drug deaths
- White (no correlation): ~0
- Red (strong positive): High Rep margin → High drug deaths

**Hover Tooltip:**
```
County: [Name]
Correlation: -0.42 (p < 0.001)
Avg Drug Deaths: 45.2
Republican Margin: +35.2%
Unemployment: 4.5%
Poverty: 15.3%
```

### 3. Statistics Page (`app/statistics/page.tsx`)

**Sections:**
1. **Study Design** - Ecological county-level panel study
2. **Statistical Models** - GLMM specification
3. **Findings** - Controlled associations
4. **Limitations** - Ecological fallacy, confounding
5. **Technical Details** - Model diagnostics

---

## 📊 Statistical Analyses to Implement

### Server-side (Python - run once, save results)

```python
# Run GLMM using statsmodels
# Save coefficient estimates, CIs, p-values to JSON
# Include:
#   - Main effect: Politics → Drug deaths
#   - Adjusted for: SES, demographics, time
#   - Random effects: County, State
```

### Client-side (JavaScript - interactive)

- Scatter plots with regression lines
- Time series animations
- Bootstrap confidence intervals for county comparisons
- Interactive coefficient tables

---

## 🎯 Core Features Implementation

### 1. Choropleth Map

**Maplibre GL JS:**
```javascript
map.addLayer({
  id: 'counties',
  type: 'fill',
  source: 'counties',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'correlation'],
      -0.7, '#0571b0',  // Strong negative (blue)
      0, '#f7f7f7',     // No correlation (white)
      0.7, '#ca0020'    // Strong positive (red)
    ],
    'fill-opacity': 0.7
  }
})
```

### 2. County Comparison

**Select two counties → Show side-by-side:**
- Drug deaths trend
- Political lean trend
- Adjusted predicted values from model
- Bootstrap 95% CIs

### 3. Time Animation

Play/pause button cycles through years 2018-2023, updating map colors.

### 4. State Filter

Multi-select dropdown → Show only selected states.

---

## 📝 Methodology Footer (Small Text)

Add to bottom of map:

```
Methodology: County-level panel study (2018-2023). Partial correlations control for unemployment,
poverty, income, education, race/ethnicity, and population. Colors show correlation between
Republican vote margin and drug overdose deaths. Ecological study limitations apply—associations
do not imply individual-level relationships. Data sources: CDC WONDER, Census Bureau, MIT Election Lab.
Missing data due to CDC privacy suppression (counts <10). Statistical details on /statistics page.
```

---

## 🔒 Important Disclaimers

**Ecological Fallacy Warning:**
> These are county-level associations. Individual-level inferences cannot be made from ecological data. Political orientation and drug deaths may be associated through unmeasured confounders.

**Causality:**
> Observational data. Cannot establish causation. Associations may reflect:
> - Reverse causation
> - Unmeasured confounding
> - Selection bias
> - Measurement error

**Data Limitations:**
> - CDC suppresses counts <10 for privacy
> - Rural counties over-represented in missing data
> - Political data interpolated for non-election years
> - SES controls may not capture all relevant factors

---

## 🚀 Deployment Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Copy data files to `public/data/`
- [ ] Download county GeoJSON
- [ ] Build project (`npm run build`)
- [ ] Test locally (`npm run dev`)
- [ ] Deploy to Vercel
- [ ] Configure custom domain (optional)
- [ ] Enable analytics
- [ ] Test on mobile devices

---

## 📈 Performance Optimization

**For Fast Loading:**
1. Use static GeoJSON (pre-simplified)
2. Lazy-load statistics page
3. Compress JSON files (gzip)
4. Use Vercel Edge Functions for data
5. Implement data pagination for large datasets

**Bundle Size:**
- Keep map library lightweight (MapLibre < Mapbox)
- Code-split by route
- Use dynamic imports for heavy components

---

## 🔗 Useful Resources

**MapLibre GL:**
- https://maplibre.org/maplibre-gl-js/docs/

**County Boundaries:**
- https://github.com/plotly/datasets/blob/master/geojson-counties-fips.json

**Color Scales:**
- https://colorbrewer2.org/ (diverging scales for correlations)

**Vercel Docs:**
- https://vercel.com/docs

---

## 📞 Next Steps

1. **Build components** - Start with Map, then filters
2. **Run statistical models** - Python GLMM → save results
3. **Create statistics page** - Methodology & findings
4. **Test & refine** - User feedback
5. **Deploy** - Vercel production

**Estimated Time:**
- Basic dashboard: 4-6 hours
- Full statistics: +4-6 hours
- Polish & deploy: +2-3 hours
- **Total: ~12-15 hours**

---

## 🎓 Statistical Model Code (Python)

Save this for backend processing:

```python
import statsmodels.api as sm
import statsmodels.formula.api as smf
from statsmodels.genmod.bayes_mixed_glm import BinomialBayesMixedGLM

# Negative binomial GLMM
model = smf.glm(
    formula='''
        DrugDeaths ~
        RepublicanMargin +
        UnemploymentRate + PovertyRate + MedianIncome +
        BachelorsOrHigher + WhiteAlone + BlackAlone + HispanicLatino +
        C(Year) +
        offset(np.log(Population))
    ''',
    data=df,
    family=sm.families.NegativeBinomial()
).fit()

# Save results
results = {
    'coefficients': model.params.to_dict(),
    'conf_int': model.conf_int().to_dict(),
    'pvalues': model.pvalues.to_dict(),
    'aic': model.aic,
    'bic': model.bic
}

with open('public/data/glmm_results.json', 'w') as f:
    json.dump(results, f)
```

---

**Ready to deploy! 🚀**

See `VERCEL_DEPLOY_STEPS.md` for detailed deployment instructions.
