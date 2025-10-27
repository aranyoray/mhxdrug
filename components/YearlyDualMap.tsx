'use client'

import { useState, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface CountyData {
  fips: string
  DrugDeaths: number | null
  DrugDeathRate: number | null
  Is_Suppressed: boolean
  SuicideRate: number | null
  RepublicanMargin: number | null
  UnemploymentRate: number | null
  PovertyRate: number | null
}

export default function YearlyDualMap() {
  const mapContainer1 = useRef<HTMLDivElement>(null)
  const mapContainer2 = useRef<HTMLDivElement>(null)
  const map1 = useRef<maplibregl.Map | null>(null)
  const map2 = useRef<maplibregl.Map | null>(null)
  const [yearlyData, setYearlyData] = useState<Record<string, Record<string, CountyData>>>({})
  const [selectedYear, setSelectedYear] = useState<string>('2023')
  const [hoveredCounty, setHoveredCounty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(false)
  const [countyNames, setCountyNames] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Array<{fips: string, name: string}>>([])
  const [fipsToName, setFipsToName] = useState<Record<string, string>>({})
  const [geojsonData, setGeojsonData] = useState<any>(null)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, filename: '' })
  const allDataLoaded = useRef<Record<string, boolean>>({})

  const years = ['2018', '2019', '2020', '2021', '2022', '2023']

  // Load a specific year's data with timeout and fallback to API route
  const loadYearData = async (year: string): Promise<Record<string, CountyData>> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    // Try static file first, then API route as fallback
    const urls = [
      `/data/years/${year}.json`,
      `/api/years/${year}`
    ]

    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)

        if (!response.ok) {
          console.warn(`Failed to load from ${url}: ${response.status}`)
          continue
        }

        const counties = await response.json()

        const dataMap: Record<string, CountyData> = {}
        counties.forEach((county: CountyData) => {
          dataMap[county.fips] = county
        })

        console.log(`✓ Loaded ${year} data from ${url}`)
        return dataMap
      } catch (error) {
        console.warn(`Error loading from ${url}:`, error)
        continue
      }
    }

    clearTimeout(timeout)
    throw new Error(`Failed to load year ${year} from all sources`)
  }

  // Fast initial load - only load current year (2023)
  useEffect(() => {
    const loadInitialData = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000) // 45 second timeout for initial load

      try {
        setLoadingProgress({ current: 1, total: 3, filename: 'counties.geojson' })

        // Try static file first, then API route as fallback
        const geojsonUrls = ['/data/us_counties.geojson', '/api/geojson']
        let geojson = null
        let lastError = null

        for (const url of geojsonUrls) {
          try {
            const geojsonResponse = await fetch(url, { signal: controller.signal })
            if (geojsonResponse.ok) {
              geojson = await geojsonResponse.json()
              console.log(`✓ Loaded GeoJSON from ${url}`)
              break
            } else {
              console.warn(`Failed to load GeoJSON from ${url}: ${geojsonResponse.status}`)
            }
          } catch (err) {
            console.warn(`Error loading GeoJSON from ${url}:`, err)
            lastError = err
          }
        }

        if (!geojson) {
          throw new Error(`Failed to load GeoJSON: ${lastError}`)
        }

        setGeojsonData(geojson)

        setLoadingProgress({ current: 2, total: 3, filename: '2023 data' })
        const year2023Data = await loadYearData('2023')

        clearTimeout(timeout)

        setYearlyData({ '2023': year2023Data })
        allDataLoaded.current['2023'] = true

        // Extract county names from GeoJSON
        const names: Record<string, string> = {}
        geojson.features.forEach((feature: any) => {
          const fips = feature.properties.GEOID
          const name = feature.properties.NAME
          if (fips && name) {
            names[fips] = name
          }
        })
        setCountyNames(names)
        setFipsToName(names)

        setLoadingProgress({ current: 3, total: 3, filename: 'complete' })
        setLoading(false)
      } catch (error) {
        clearTimeout(timeout)
        console.error('Error loading initial data:', error)

        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            alert('Loading timed out. Please check your internet connection and refresh the page.')
          } else {
            alert(`Failed to load map data: ${error.message}. Please refresh the page.`)
          }
        }

        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const results = Object.entries(fipsToName)
      .filter(([_, name]) => name.toLowerCase().includes(query))
      .map(([fips, name]) => ({ fips, name }))
      .slice(0, 10)

    setSearchResults(results)
  }, [searchQuery, fipsToName])

  const handleCountySelect = (fips: string) => {
    // Highlight selected county on both maps
    if (map1.current && map2.current) {
      // Get county center from GeoJSON or use a default zoom
      [map1.current, map2.current].forEach(map => {
        map.flyTo({ zoom: 8, essential: true })
      })
    }

    // Show county data
    const countyData = yearlyData[selectedYear]?.[fips]
    if (countyData) {
      setHoveredCounty({
        name: fipsToName[fips],
        ...countyData
      })
    }

    setSearchQuery('')
    setSearchResults([])
  }

  const getColorForValue = (value: number | null, isPolitic: boolean): string => {
    // Show gray for NA/missing data
    if (value === null || value === undefined) return '#d1d5db'

    if (isPolitic) {
      if (value > 40) return '#7f1d1d'
      if (value > 20) return '#dc2626'
      if (value > 0) return '#fca5a5'
      if (value > -20) return '#93c5fd'
      if (value > -40) return '#2563eb'
      return '#1e3a8a'
    } else {
      if (value > 40) return '#7f1d1d'
      if (value > 30) return '#dc2626'
      if (value > 20) return '#f97316'
      if (value > 10) return '#facc15'
      return '#22c55e'
    }
  }

  const updateMapColors = (map: maplibregl.Map, countyData: Record<string, CountyData>, isDrugMap: boolean) => {
    if (!map || !map.getLayer('counties-fill')) return

    const fillExpression: any[] = ['match', ['get', 'GEOID']]

    Object.entries(countyData).forEach(([fips, data]) => {
      const value = isDrugMap ? data.DrugDeathRate : data.RepublicanMargin
      const color = getColorForValue(value, !isDrugMap)
      fillExpression.push(fips, color)
    })

    fillExpression.push('#e5e7eb')

    map.setPaintProperty('counties-fill', 'fill-color', fillExpression as any)
  }

  const createMap = (container: HTMLDivElement, isDrugMap: boolean) => {
    const newMap = new maplibregl.Map({
      container: container,
      style: {
        version: 8,
        sources: {},
        layers: []
      },
      center: [-98.5, 39.8],
      zoom: 3.5
    })

    newMap.addControl(new maplibregl.NavigationControl(), 'top-right')

    newMap.on('load', () => {
      // Use cached geojson data instead of fetching again
      if (!geojsonData) {
        console.error('GeoJSON data not loaded')
        return
      }

      newMap.addSource('counties', {
        type: 'geojson',
        data: geojsonData
      })

      newMap.addLayer({
        id: 'counties-fill',
        type: 'fill',
        source: 'counties',
        paint: {
          'fill-color': '#e5e7eb',
          'fill-opacity': 0.8
        }
      })

      newMap.addLayer({
        id: 'counties-outline',
        type: 'line',
        source: 'counties',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.5
        }
      })

      // Add state borders - load async but don't block rendering
      fetch('/data/us_states.geojson')
        .then(r => r.json())
        .then(statesGeoJSON => {
          newMap.addSource('states', {
            type: 'geojson',
            data: statesGeoJSON
          })

          newMap.addLayer({
            id: 'state-borders',
            type: 'line',
            source: 'states',
            paint: {
              'line-color': '#000000',
              'line-width': 2.5,
              'line-opacity': 0.8
            }
          })
        })
        .catch(error => {
          console.error('Error loading state borders:', error)
        })

      // Initial color update
      const countyData = yearlyData[selectedYear]
      if (countyData) {
        updateMapColors(newMap, countyData, isDrugMap)
      }

      // Add hover
      newMap.on('mousemove', 'counties-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const fips = feature.properties?.GEOID
          const countyName = countyNames[fips] || feature.properties?.NAME
          const data = yearlyData[selectedYear]?.[fips]

          if (data) {
            setHoveredCounty({
              name: countyName,
              ...data
            })
            newMap.getCanvas().style.cursor = 'pointer'
          }
        }
      })

      newMap.on('mouseleave', 'counties-fill', () => {
        setHoveredCounty(null)
        newMap.getCanvas().style.cursor = ''
      })
    })

    return newMap
  }

  useEffect(() => {
    if (!mapContainer1.current || !mapContainer2.current || loading || map1.current || map2.current) return
    if (Object.keys(yearlyData).length === 0 || !geojsonData) return

    map1.current = createMap(mapContainer1.current, true)
    map2.current = createMap(mapContainer2.current, false)

    return () => {
      map1.current?.remove()
      map2.current?.remove()
      map1.current = null
      map2.current = null
    }
  }, [loading, yearlyData, geojsonData])

  // Lazy load year data when switching years
  useEffect(() => {
    const loadYearIfNeeded = async () => {
      // If year is already loaded, just update colors
      if (yearlyData[selectedYear]) {
        if (map1.current && map2.current) {
          updateMapColors(map1.current, yearlyData[selectedYear], true)
          updateMapColors(map2.current, yearlyData[selectedYear], false)
        }
        return
      }

      // Year not loaded yet, load it now
      setMapLoading(true)
      try {
        const yearData = await loadYearData(selectedYear)
        setYearlyData(prev => ({ ...prev, [selectedYear]: yearData }))
        allDataLoaded.current[selectedYear] = true

        // Update map colors after loading
        if (map1.current && map2.current) {
          updateMapColors(map1.current, yearData, true)
          updateMapColors(map2.current, yearData, false)
        }
      } catch (error) {
        console.error(`Error loading year ${selectedYear}:`, error)
      } finally {
        setMapLoading(false)
      }
    }

    if (!loading) {
      loadYearIfNeeded()
    }
  }, [selectedYear, loading])

  if (loading) {
    const progress = loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0
    return (
      <div className="h-96 flex flex-col items-center justify-center rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="loading-indicator text-xl mb-4">Loading map data...</div>
        <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Loading {loadingProgress.filename}... ({loadingProgress.current}/{loadingProgress.total})
        </div>
        <div className="mt-4 w-64 h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="h-full rounded-full loading-indicator transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--accent-blue)' }}></div>
        </div>
        <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Initial load: ~284 KB (was 1.5 MB, ~80% smaller!) ⚡
        </div>
      </div>
    )
  }

  const currentData = yearlyData[selectedYear]
  const totalCounties = currentData ? Object.keys(currentData).length : 0

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="search-container">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search county by name (e.g., Los Angeles, Cook, Harris)..."
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div
                  key={result.fips}
                  onClick={() => handleCountySelect(result.fips)}
                  className="search-result-item"
                >
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.name} County</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>FIPS: {result.fips}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Year Slider */}
      <div className="year-slider-container">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Year:</label>
          <input
            type="range"
            min="0"
            max={years.length - 1}
            value={years.indexOf(selectedYear)}
            onChange={(e) => setSelectedYear(years[parseInt(e.target.value)])}
            className="year-slider flex-1"
          />
          <span className="text-2xl font-bold min-w-[80px]" style={{ color: 'var(--accent-blue)' }}>{selectedYear}</span>
        </div>
        <div className="flex justify-between text-sm mt-2 px-2" style={{ color: 'var(--text-muted)' }}>
          {years.map(year => (
            <span key={year}>{year}</span>
          ))}
        </div>
        <div className="text-sm mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
          Showing {totalCounties.toLocaleString()} counties
        </div>
        {mapLoading && (
          <div className="text-xs mt-2 text-center animate-pulse" style={{ color: 'var(--accent-blue)' }}>
            Loading {selectedYear} data (~80 KB)...
          </div>
        )}
      </div>

      {/* Legends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="legend-container">
          <h4 className="legend-title">Drug Death Rate (per 100k)</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#22c55e'}}></div>
              <span>&lt;10</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#facc15'}}></div>
              <span>10-20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#f97316'}}></div>
              <span>20-30</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#dc2626'}}></div>
              <span>30-40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#7f1d1d'}}></div>
              <span>&gt;40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#d1d5db'}}></div>
              <span>No Data</span>
            </div>
          </div>
        </div>

        <div className="legend-container">
          <h4 className="legend-title">Republican Margin (%)</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#1e3a8a'}}></div>
              <span>D+40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#2563eb'}}></div>
              <span>D+20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#93c5fd'}}></div>
              <span>D+0</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#fca5a5'}}></div>
              <span>R+0</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#dc2626'}}></div>
              <span>R+20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#7f1d1d'}}></div>
              <span>R+40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#d1d5db'}}></div>
              <span>No Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side by Side Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="relative">
          <div className="absolute top-2 left-2 px-3 py-1 rounded shadow z-10 font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            Drug Death Rate ({selectedYear})
          </div>
          <div ref={mapContainer1} className="h-[500px] rounded-lg shadow-lg" style={{ border: '1px solid var(--border-color)' }} />
        </div>
        <div className="relative">
          <div className="absolute top-2 left-2 px-3 py-1 rounded shadow z-10 font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            Political Lean ({selectedYear})
          </div>
          <div ref={mapContainer2} className="h-[500px] rounded-lg shadow-lg" style={{ border: '1px solid var(--border-color)' }} />
        </div>
      </div>

      {/* Hover Tooltip - Only Comparable Metrics */}
      {hoveredCounty && (
        <div className="county-tooltip" style={{ background: 'var(--bg-secondary)', border: `2px solid var(--accent-blue)` }}>
          <h3 className="font-bold text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{hoveredCounty.name} County ({selectedYear})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Drug Deaths</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.Is_Suppressed
                  ? '0 (Suppressed)'
                  : hoveredCounty.DrugDeaths !== null
                    ? hoveredCounty.DrugDeaths.toFixed(1)
                    : 'No Data'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Drug Death Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.Is_Suppressed
                  ? 'Suppressed'
                  : hoveredCounty.DrugDeathRate !== null
                    ? `${hoveredCounty.DrugDeathRate.toFixed(1)} per 100k`
                    : 'No Data'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Suicide Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.SuicideRate !== null
                  ? `${hoveredCounty.SuicideRate.toFixed(1)} per 100k`
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Political Lean</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.RepublicanMargin !== null
                  ? `${hoveredCounty.RepublicanMargin > 0 ? 'R+' : 'D+'}${Math.abs(hoveredCounty.RepublicanMargin).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Unemployment Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.UnemploymentRate !== null
                  ? `${hoveredCounty.UnemploymentRate.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>Poverty Rate</span>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {hoveredCounty.PovertyRate !== null
                  ? `${hoveredCounty.PovertyRate.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
