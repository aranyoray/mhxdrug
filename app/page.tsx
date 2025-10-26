'use client'

import { useState, useEffect } from 'react'
import YearlyDualMap from '@/components/YearlyDualMap'

export default function Home() {
  const [summary, setSummary] = useState<any>(null)
  const [stateData, setStateData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      setSummary(summaryData)
      setStateData(stateData)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Politics, Drug Deaths & Mental Health Dashboard
          </h1>
          <p className="text-gray-600">
            Interactive county-level analysis (2018-2023)
          </p>
        </div>

        {/* Key Findings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Observations</h3>
            <p className="text-3xl font-bold text-gray-900">{summary?.total_observations?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Counties</h3>
            <p className="text-3xl font-bold text-gray-900">{summary?.total_counties?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Correlation</h3>
            <p className="text-3xl font-bold text-blue-600">
              {summary?.avg_correlation?.toFixed(3)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Politics ↔ Drug Deaths</p>
          </div>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Average Deaths</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Drug Deaths:</span>
                <span className="font-semibold">{summary?.avg_drug_deaths?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Suicide Deaths:</span>
                <span className="font-semibold">{summary?.avg_suicide_deaths?.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Data Completeness</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Drug Deaths:</span>
                <span className="font-semibold">{summary?.completeness?.drug_deaths_pct?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Political Data:</span>
                <span className="font-semibold">{summary?.completeness?.political_pct?.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* County Map Visualization */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Interactive County Maps - Year-by-Year Analysis</h2>
          <p className="text-gray-600 mb-4">Use the slider to explore data from 2018-2023. Hover over any county to see comparable metrics. All 3,300+ US counties displayed.</p>
          <YearlyDualMap />
        </div>

        {/* Emoji Legend */}
        <div className="bg-gradient-to-r from-green-50 to-red-50 p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Severity Scale (Language-Free)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <span className="text-2xl">🟢</span>
              <span>1-2: Very Low</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <span className="text-2xl">🟡</span>
              <span>3-4: Low-Med</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <span className="text-2xl">🟠</span>
              <span>5-6: Medium</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <span className="text-2xl">🔴</span>
              <span>7-10: High</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded">
              <span className="text-2xl">⚪</span>
              <span>No Data</span>
            </div>
          </div>
        </div>

        {/* States Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">State Summary with Emoji Rankings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Drug Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug Deaths</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Suicide Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suicide Deaths</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Political Lean</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counties</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const validStates = stateData.slice(1).filter((s: any) => s.DrugDeaths)
                  const maxDrugDeaths = Math.max(...validStates.map((s: any) => s.DrugDeaths || 0))
                  const maxSuicideDeaths = Math.max(...validStates.map((s: any) => s.SuicideDeaths || 0))

                  return validStates.slice(0, 20).map((state: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {state.state_name || state.state_fips}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-3xl">
                        {getEmojiRank(state.DrugDeaths, maxDrugDeaths)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {state.DrugDeaths?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-3xl">
                        {getEmojiRank(state.SuicideDeaths, maxSuicideDeaths)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {state.SuicideDeaths?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {state.RepublicanMargin ? `${state.RepublicanMargin.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data covers {summary?.years?.join(', ')} | Analysis based on county-level aggregated data</p>
          <p className="mt-2">
            <strong>Key Finding:</strong> Correlation between Republican voting margin and drug deaths: {summary?.avg_correlation?.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  )
}
