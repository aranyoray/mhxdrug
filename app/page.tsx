'use client'

import { useState, useEffect } from 'react'
import YearlyDualMap from '@/components/YearlyDualMap'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  const [summary, setSummary] = useState<any>(null)
  const [stateData, setStateData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadStartTime] = useState(Date.now())
  const [loadTime, setLoadTime] = useState<number | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('DrugDeaths')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Severity color function (1-10 scale)
  const getSeverityColor = (value: number | null, maxValue: number): string => {
    if (!value || maxValue === 0) return '#d1d5db' // No data

    const normalized = (value / maxValue) * 10 // Scale to 1-10

    if (normalized <= 1) return '#22c55e' // 1 - Very Low
    if (normalized <= 2) return '#22c55e' // 2 - Low
    if (normalized <= 3) return '#facc15' // 3 - Low-Medium
    if (normalized <= 4) return '#facc15' // 4 - Medium-Low
    if (normalized <= 5) return '#f97316' // 5 - Medium
    if (normalized <= 6) return '#f97316' // 6 - Medium-High
    if (normalized <= 7) return '#dc2626' // 7 - High
    if (normalized <= 8) return '#dc2626' // 8 - Very High
    if (normalized <= 9) return '#dc2626' // 9 - Critical
    return '#7f1d1d' // 10 - Extreme
  }

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort state data
  const sortedStateData = (data: any[]) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortColumn]
      let bVal = b[sortColumn]

      // Handle null/undefined values
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Special handling for state_name (string)
      if (sortColumn === 'state_name') {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      // Numeric comparison
      const comparison = aVal - bVal
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  // Render sort indicator
  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="text-xs opacity-30">▼</span>
    return <span className="text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    Promise.all([
      fetch('/data/summary.json', { signal: controller.signal }).then(r => r.json()),
      fetch('/data/state_summary.json', { signal: controller.signal }).then(r => r.json())
    ]).then(([summaryData, stateData]) => {
      clearTimeout(timeout)
      const timeElapsed = ((Date.now() - loadStartTime) / 1000).toFixed(1)
      setLoadTime(parseFloat(timeElapsed))
      setSummary(summaryData)
      setStateData(stateData)
      setLoading(false)
    }).catch(error => {
      clearTimeout(timeout)
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
      // Show error but continue - dashboard will work with cached data
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-4 px-4">
          <div className="loading-indicator text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Loading Health Data...</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Preparing county-level analysis</div>
          <div className="w-64 h-2 loading-bar">
            <div className="h-full" style={{ width: '70%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          {/* Theme Toggle - Top Right on Mobile/Desktop */}
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>

          {/* Main Heading - Centered */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 px-2" style={{ color: 'var(--text-primary)' }}>
              US County Health Disparities Explorer
            </h1>
            <p className="text-xs sm:text-sm md:text-base px-4 max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Interactive Analysis of Overdose, Suicide, Mental Health & Political Patterns (2010-2024)
            </p>
          </div>

          {/* About Link - Centered Below */}
          <div className="flex justify-center mb-6">
            <a
              href="/about"
              className="px-4 py-2 rounded-md text-sm md:text-base transition-all duration-200 hover:shadow-md"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                textDecoration: 'none'
              }}
            >
              About This Project
            </a>
          </div>
        </div>

        {/* Key Findings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <h3 className="stat-card-title">Observations</h3>
            <p className="stat-card-value">{summary?.total_observations?.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-card-title">Counties</h3>
            <p className="stat-card-value">{summary?.total_counties?.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-card-title">Correlation</h3>
            <p className="stat-card-value stat-card-accent">
              {summary?.avg_correlation?.toFixed(3)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Politics ↔ Drug Deaths</p>
          </div>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="panel">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Average Deaths</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Drug Deaths:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{summary?.avg_drug_deaths?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Suicide Deaths:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{summary?.avg_suicide_deaths?.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Data Completeness</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Drug Deaths:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{summary?.completeness?.drug_deaths_pct?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Political Data:</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{summary?.completeness?.political_pct?.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* County Map Visualization */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 px-2 text-center md:text-left" style={{ color: 'var(--text-primary)' }}>Interactive County Maps - Year-by-Year Analysis</h2>
          <p className="text-sm md:text-base mb-4 px-2 text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>Use the slider to explore data from 2018-2023. Hover/tap any county to see metrics. All 3,300+ US counties displayed.</p>
          <YearlyDualMap />
        </div>

        {/* Severity Scale Legend */}
        <div className="mb-6 mx-2 md:mx-0">
          <h3 className="text-base md:text-lg font-semibold mb-3 text-center md:text-left" style={{ color: 'var(--text-primary)' }}>Severity Scale</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#22c55e' }}></div>
              <span style={{ color: 'var(--text-primary)' }}>1-2: Very Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#facc15' }}></div>
              <span style={{ color: 'var(--text-primary)' }}>3-4: Low-Med</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#f97316' }}></div>
              <span style={{ color: 'var(--text-primary)' }}>5-6: Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#dc2626' }}></div>
              <span style={{ color: 'var(--text-primary)' }}>7-10: High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ background: '#d1d5db' }}></div>
              <span style={{ color: 'var(--text-primary)' }}>No Data</span>
            </div>
          </div>
        </div>

        {/* States Table */}
        <div className="data-table">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>State Summary with Emoji Rankings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('state_name')}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      State <SortIndicator column="state_name" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Drug Severity</th>
                  <th
                    onClick={() => handleSort('DrugDeaths')}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      Drug Deaths <SortIndicator column="DrugDeaths" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Suicide Severity</th>
                  <th
                    onClick={() => handleSort('SuicideDeaths')}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      Suicide Deaths <SortIndicator column="SuicideDeaths" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('RepublicanMargin')}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      Political Lean <SortIndicator column="RepublicanMargin" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('n_counties')}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      Counties <SortIndicator column="n_counties" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Don't skip first row - it's already JSON data, not CSV with header
                  const validStates = stateData.filter((s: any) => s.DrugDeaths && s.state_name)
                  const maxDrugDeaths = Math.max(...validStates.map((s: any) => s.DrugDeaths || 0))
                  const maxSuicideDeaths = Math.max(...validStates.map((s: any) => s.SuicideDeaths || 0))

                  return sortedStateData(validStates).map((state: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {state.state_name || state.state_fips}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="w-8 h-8 rounded-full mx-auto" style={{ background: getSeverityColor(state.DrugDeaths, maxDrugDeaths) }}></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {state.DrugDeaths?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="w-8 h-8 rounded-full mx-auto" style={{ background: getSeverityColor(state.SuicideDeaths, maxSuicideDeaths) }}></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {state.SuicideDeaths?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {state.RepublicanMargin ? `${state.RepublicanMargin.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {state.n_counties || 'N/A'}
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>Data covers {summary?.years?.join(', ')} | Analysis based on county-level aggregated data</p>
          <p className="mt-2">
            <strong style={{ color: 'var(--text-secondary)' }}>Key Finding:</strong> Correlation between Republican voting margin and drug deaths: {summary?.avg_correlation?.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  )
}
