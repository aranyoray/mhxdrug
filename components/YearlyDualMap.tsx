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
  const [compareOpen, setCompareOpen] = useState(false)
  const [selectedCountyA, setSelectedCountyA] = useState<string>('')
  const [selectedCountyB, setSelectedCountyB] = useState<string>('')
  const [controlPoverty, setControlPoverty] = useState(false)
  const [controlIncome, setControlIncome] = useState(false)
  const [controlUrbanRural, setControlUrbanRural] = useState(false)
  const [adjustedData, setAdjustedData] = useState<any>(null)
  const [loadingAdjustment, setLoadingAdjustment] = useState(false)

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
            console.log(`Trying to load GeoJSON from: ${url}`)
            const geojsonResponse = await fetch(url, { signal: controller.signal })
            console.log(`Response status: ${geojsonResponse.status}`)

            if (geojsonResponse.ok) {
              const data = await geojsonResponse.json()
              if (data.error) {
                console.error(`API returned error:`, data)
                lastError = new Error(data.error + ': ' + (data.details || data.path || ''))
                continue
              }
              geojson = data
              console.log(`✓ Loaded GeoJSON from ${url} with ${geojson.features?.length || 0} features`)
              break
            } else {
              const errorText = await geojsonResponse.text()
              console.warn(`Failed to load GeoJSON from ${url}: ${geojsonResponse.status} - ${errorText}`)
              lastError = new Error(`HTTP ${geojsonResponse.status}: ${errorText}`)
            }
          } catch (err) {
            console.error(`Error loading GeoJSON from ${url}:`, err)
            lastError = err instanceof Error ? err : new Error(String(err))
          }
        }

        if (!geojson) {
          const errorMsg = `Failed to load GeoJSON from all sources. Last error: ${lastError?.message || 'Unknown error'}`
          console.error(errorMsg)
          throw new Error(errorMsg)
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
    // Find the county feature in GeoJSON to get its center
    if (geojsonData && map1.current && map2.current) {
      const feature = geojsonData.features.find((f: any) => f.properties.GEOID === fips)

      if (feature) {
        // Calculate bounding box center
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

        const processCoords = (coords: any) => {
          if (typeof coords[0] === 'number') {
            // It's a point [lng, lat]
            minLng = Math.min(minLng, coords[0])
            maxLng = Math.max(maxLng, coords[0])
            minLat = Math.min(minLat, coords[1])
            maxLat = Math.max(maxLat, coords[1])
          } else {
            // It's an array of coordinates
            coords.forEach(processCoords)
          }
        }

        processCoords(feature.geometry.coordinates)

        const centerLng = (minLng + maxLng) / 2
        const centerLat = (minLat + maxLat) / 2

        // Fly both maps to the county
        if (map1.current) {
          map1.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            essential: true
          })
        }
        if (map2.current) {
          map2.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            essential: true
          })
        }
      }
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

  // Fetch adjusted comparison data when counties or controls change
  useEffect(() => {
    const fetchAdjustedData = async () => {
      if (!selectedCountyA || !selectedCountyB) {
        setAdjustedData(null)
        return
      }

      // If no controls are enabled, skip API call
      if (!controlPoverty && !controlIncome && !controlUrbanRural) {
        setAdjustedData(null)
        return
      }

      setLoadingAdjustment(true)
      try {
        const params = new URLSearchParams({
          countyA: selectedCountyA,
          countyB: selectedCountyB,
          year: selectedYear,
          controlPoverty: String(controlPoverty),
          controlIncome: String(controlIncome),
          controlUrbanRural: String(controlUrbanRural)
        })

        const response = await fetch(`/api/compare?${params}`)
        if (response.ok) {
          const data = await response.json()
          setAdjustedData(data)
        } else {
          console.error('Failed to fetch adjusted data')
          setAdjustedData(null)
        }
      } catch (error) {
        console.error('Error fetching adjusted data:', error)
        setAdjustedData(null)
      } finally {
        setLoadingAdjustment(false)
      }
    }

    fetchAdjustedData()
  }, [selectedCountyA, selectedCountyB, selectedYear, controlPoverty, controlIncome, controlUrbanRural])

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

    // Use MapLibre's style specification for smooth transitions
    const style = map.getStyle()
    if (style && style.layers) {
      const layerIndex = style.layers.findIndex((l: any) => l.id === 'counties-fill')
      if (layerIndex >= 0) {
        const layer = style.layers[layerIndex] as any
        if (!layer.paint) layer.paint = {}
        layer.paint['fill-color-transition'] = { duration: 300 }
      }
    }
    
    // Update colors (transition applied automatically)
    map.setPaintProperty('counties-fill', 'fill-color', fillExpression as any)
  }

  const createMap = (container: HTMLDivElement, isDrugMap: boolean) => {
    const newMap = new maplibregl.Map({
      container: container,
      style: {
        version: 8,
        sources: {},
        layers: [{
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#f0f0f0'
          }
        }]
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

  // Prefetch all years for smooth transitions
  useEffect(() => {
    const prefetchAll = async () => {
      for (const year of ['2018', '2019', '2020', '2021', '2022']) {
        if (!yearlyData[year] && !allDataLoaded.current[year]) {
          try {
            const data = await loadYearData(year)
            setYearlyData(prev => ({ ...prev, [year]: data }))
            allDataLoaded.current[year] = true
          } catch (err) {
            console.error(`Prefetch ${year}:`, err)
          }
        }
      }
    }
    if (!loading) prefetchAll()
  }, [loading])

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

      {/* Compare Counties Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setCompareOpen(true)}
          className="px-6 py-3 rounded-lg font-semibold text-base transition-all duration-200 hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: '#ffffff',
            border: 'none'
          }}
        >
          📊 Compare Counties
        </button>
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

      {/* Comparison Sidebar */}
      {compareOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
            onClick={() => setCompareOpen(false)}
          />

          {/* Sidebar Panel */}
          <div
            className="fixed top-0 right-0 h-full w-full md:w-[600px] z-50 shadow-2xl overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#1e40af' }}>
                  📊 Compare Counties
                </h2>
                <button
                  onClick={() => setCompareOpen(false)}
                  className="text-2xl font-bold px-3 py-1 rounded-lg transition-colors"
                  style={{ color: '#64748b', background: 'rgba(255,255,255,0.5)' }}
                >
                  ×
                </button>
              </div>

              {/* County Selectors */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e40af' }}>
                    County A
                  </label>
                  <select
                    value={selectedCountyA}
                    onChange={(e) => setSelectedCountyA(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      background: 'white',
                      borderColor: '#93c5fd',
                      color: '#1e293b'
                    }}
                  >
                    <option value="">Select a county...</option>
                    {Object.entries(fipsToName)
                      .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
                      .map(([fips, name]) => (
                        <option key={fips} value={fips}>
                          {name} County (FIPS: {fips})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#1e40af' }}>
                    County B
                  </label>
                  <select
                    value={selectedCountyB}
                    onChange={(e) => setSelectedCountyB(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all"
                    style={{
                      background: 'white',
                      borderColor: '#93c5fd',
                      color: '#1e293b'
                    }}
                  >
                    <option value="">Select a county...</option>
                    {Object.entries(fipsToName)
                      .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
                      .map(([fips, name]) => (
                        <option key={fips} value={fips}>
                          {name} County (FIPS: {fips})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Statistical Controls */}
              {selectedCountyA && selectedCountyB && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                  <h4 className="text-sm font-bold mb-3" style={{ color: '#1e40af' }}>
                    ⚙️ Adjust for Confounders
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox-item"
                        checked={controlPoverty}
                        onChange={(e) => setControlPoverty(e.target.checked)}
                      />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        Control for Poverty Rate
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer opacity-50">
                      <input
                        type="checkbox"
                        className="checkbox-item"
                        checked={controlIncome}
                        onChange={(e) => setControlIncome(e.target.checked)}
                        disabled
                      />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        Control for Median Income (coming soon)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer opacity-50">
                      <input
                        type="checkbox"
                        className="checkbox-item"
                        checked={controlUrbanRural}
                        onChange={(e) => setControlUrbanRural(e.target.checked)}
                        disabled
                      />
                      <span className="text-sm" style={{ color: '#475569' }}>
                        Control for Urban/Rural (coming soon)
                      </span>
                    </label>
                  </div>
                  {(controlPoverty || controlIncome || controlUrbanRural) && (
                    <div className="mt-3 text-xs p-2 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#1e40af' }}>
                      ℹ️ Statistical adjustment uses regression to remove the effect of selected confounders
                    </div>
                  )}
                  {loadingAdjustment && (
                    <div className="mt-2 text-xs text-center" style={{ color: '#3b82f6' }}>
                      Computing adjusted values...
                    </div>
                  )}
                </div>
              )}

              {/* Comparison Results */}
              {selectedCountyA && selectedCountyB && (
                <div className="space-y-4">
                  <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.7)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: '#1e40af' }}>
                      {fipsToName[selectedCountyA]} vs {fipsToName[selectedCountyB]}
                    </h3>

                    {/* Data Comparison Grid */}
                    <div className="space-y-3">
                      {['DrugDeaths', 'DrugDeathRate', 'SuicideRate', 'RepublicanMargin', 'UnemploymentRate', 'PovertyRate'].map((field) => {
                        const dataA = yearlyData[selectedYear]?.[selectedCountyA]
                        const dataB = yearlyData[selectedYear]?.[selectedCountyB]

                        const labels: Record<string, string> = {
                          DrugDeaths: 'Drug Deaths',
                          DrugDeathRate: 'Drug Death Rate (per 100k)',
                          SuicideRate: 'Suicide Rate (per 100k)',
                          RepublicanMargin: 'Republican Margin (%)',
                          UnemploymentRate: 'Unemployment Rate (%)',
                          PovertyRate: 'Poverty Rate (%)'
                        }

                        const valueA = dataA?.[field as keyof CountyData]
                        const valueB = dataB?.[field as keyof CountyData]

                        // Get adjusted values if available
                        const adjustedInfo = adjustedData?.[field]
                        const showAdjusted = adjustedInfo && adjustedInfo.adjusted_a !== null

                        return (
                          <div key={field} className="rounded-lg p-4" style={{ background: 'white' }}>
                            <div className="text-sm font-semibold mb-2" style={{ color: '#64748b' }}>
                              {labels[field]}
                              {showAdjusted && (
                                <span className="ml-2 text-xs px-2 py-1 rounded" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                  Adjusted
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>County A</div>
                                <div className="text-lg font-bold" style={{ color: '#1e40af' }}>
                                  {showAdjusted ? (
                                    <>
                                      {adjustedInfo.adjusted_a.toFixed(1)}
                                      <div className="text-xs font-normal mt-1" style={{ color: '#94a3b8' }}>
                                        Raw: {adjustedInfo.raw_a.toFixed(1)}
                                        {adjustedInfo.adjustment_pct_a && (
                                          <span className="ml-1">({adjustedInfo.adjustment_pct_a.toFixed(0)}% adj)</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    valueA !== null && valueA !== undefined
                                      ? typeof valueA === 'number'
                                        ? valueA.toFixed(1)
                                        : valueA
                                      : 'N/A'
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>County B</div>
                                <div className="text-lg font-bold" style={{ color: '#1e40af' }}>
                                  {showAdjusted ? (
                                    <>
                                      {adjustedInfo.adjusted_b.toFixed(1)}
                                      <div className="text-xs font-normal mt-1" style={{ color: '#94a3b8' }}>
                                        Raw: {adjustedInfo.raw_b.toFixed(1)}
                                        {adjustedInfo.adjustment_pct_b && (
                                          <span className="ml-1">({adjustedInfo.adjustment_pct_b.toFixed(0)}% adj)</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    valueB !== null && valueB !== undefined
                                      ? typeof valueB === 'number'
                                        ? valueB.toFixed(1)
                                        : valueB
                                      : 'N/A'
                                  )}
                                </div>
                              </div>
                            </div>
                            {showAdjusted && adjustedInfo.adjustment_note && (
                              <div className="text-xs mt-2 p-2 rounded" style={{ background: 'rgba(249, 250, 251, 1)', color: '#64748b' }}>
                                {adjustedInfo.adjustment_note} (n={adjustedInfo.n_counties} counties)
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl p-5" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#1e40af' }}>📝 Quick Summary</h4>
                    <p className="text-sm" style={{ color: '#475569' }}>
                      Comparing {fipsToName[selectedCountyA]} and {fipsToName[selectedCountyB]} for {selectedYear}.
                      All data from CDC WONDER, Census ACS, and MIT Election Lab.
                    </p>
                  </div>
                </div>
              )}

              {!selectedCountyA && !selectedCountyB && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📍</div>
                  <p className="text-lg" style={{ color: '#64748b' }}>
                    Select two counties to compare
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
