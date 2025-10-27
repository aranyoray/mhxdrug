'use client'

import { useState, useEffect } from 'react'
import YearlyDualMap from '@/components/YearlyDualMap'

export default function Home() {
  const [summary, setSummary] = useState<any>(null)
  const [stateData, setStateData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadStartTime] = useState(Date.now())
  const [loadTime, setLoadTime] = useState<number | null>(null)

  // Emoji ranking function (1-10 scale)
  const getEmojiRank = (value: number | null, maxValue: number): string => {
    if (!value || maxValue === 0) return '⚪' // No data

    const normalized = (value / maxValue) * 10 // Scale to 1-10

    if (normalized <= 1) return '🟢' // 1 - Very Low
    if (normalized <= 2) return '🟢' // 2 - Low
    if (normalized <= 3) return '🟡' // 3 - Low-Medium
    if (normalized <= 4) return '🟡' // 4 - Medium-Low
    if (normalized <= 5) return '🟠' // 5 - Medium
    if (normalized <= 6) return '🟠' // 6 - Medium-High
    if (normalized <= 7) return '🔴' // 7 - High
    if (normalized <= 8) return '🔴' // 8 - Very High
    if (normalized <= 9) return '🔴' // 9 - Critical
    return '🔴' // 10 - Extreme
  }

  useEffect(() => {
    Promise.all([
      fetch('/data/summary.json').then(r => r.json()),
      fetch('/data/state_summary.json').then(r => r.json())
    ]).then(([summaryData, stateData]) => {
      const timeElapsed = ((Date.now() - loadStartTime) / 1000).toFixed(1)
      setLoadTime(parseFloat(timeElapsed))
      setSummary(summaryData)
      setStateData(stateData)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="loading-indicator text-2xl font-bold">Loading Dashboard...</div>
          <div className="text-sm text-gray-600">Downloading data files</div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 loading-indicator" style={{ width: '70%' }}></div>
          </div>
          <div className="text-xs text-gray-500">Optimized for faster loading ⚡</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Politics, Drug Deaths & Mental Health Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Interactive county-level analysis (2018-2023)
          </p>
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
        <div className="mb-8">
          <h2 className="panel-title mb-4">Interactive County Maps - Year-by-Year Analysis</h2>
          <p className="panel-subtitle mb-4">Use the slider to explore data from 2018-2023. Hover over any county to see comparable metrics. All 3,300+ US counties displayed.</p>
          <YearlyDualMap />
        </div>

        {/* Emoji Legend */}
        <div className="emoji-legend mb-6">
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📊 Severity Scale (Language-Free)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="emoji-legend-item flex items-center gap-2">
              <span className="text-2xl">🟢</span>
              <span style={{ color: 'var(--text-primary)' }}>1-2: Very Low</span>
            </div>
            <div className="emoji-legend-item flex items-center gap-2">
              <span className="text-2xl">🟡</span>
              <span style={{ color: 'var(--text-primary)' }}>3-4: Low-Med</span>
            </div>
            <div className="emoji-legend-item flex items-center gap-2">
              <span className="text-2xl">🟠</span>
              <span style={{ color: 'var(--text-primary)' }}>5-6: Medium</span>
            </div>
            <div className="emoji-legend-item flex items-center gap-2">
              <span className="text-2xl">🔴</span>
              <span style={{ color: 'var(--text-primary)' }}>7-10: High</span>
            </div>
            <div className="emoji-legend-item flex items-center gap-2">
              <span className="text-2xl">⚪</span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>State</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Drug Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Drug Deaths</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Suicide Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Suicide Deaths</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Political Lean</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Counties</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const validStates = stateData.slice(1).filter((s: any) => s.DrugDeaths)
                  const maxDrugDeaths = Math.max(...validStates.map((s: any) => s.DrugDeaths || 0))
                  const maxSuicideDeaths = Math.max(...validStates.map((s: any) => s.SuicideDeaths || 0))

                  return validStates.slice(0, 20).map((state: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {state.state_name || state.state_fips}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-3xl">
                        {getEmojiRank(state.DrugDeaths, maxDrugDeaths)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {state.DrugDeaths?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-3xl">
                        {getEmojiRank(state.SuicideDeaths, maxSuicideDeaths)}
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
