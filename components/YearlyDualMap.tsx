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
  const [countyNames, setCountyNames] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Array<{fips: string, name: string}>>([])
  const [fipsToName, setFipsToName] = useState<Record<string, string>>({})

  const years = ['2018', '2019', '2020', '2021', '2022', '2023']

  // Load yearly county data
  useEffect(() => {
    Promise.all([
      fetch('/data/yearly_county_data_complete.json').then(r => {
        if (!r.ok) throw new Error(`Failed to fetch yearly data: ${r.status}`)
        return r.json()
      }).catch(e => {
        console.error('Error loading yearly_county_data_complete.json:', e)
        return {}
      }),
      fetch('/data/us_counties.geojson').then(r => {
        if (!r.ok) throw new Error(`Failed to fetch counties geojson: ${r.status}`)
        return r.json()
      }).catch(e => {
        console.error('Error loading us_counties.geojson:', e)
        return { features: [] }
      })
    ]).then(([yearData, geojson]) => {
      // Convert to nested map structure
      const dataMap: Record<string, Record<string, CountyData>> = {}
      Object.entries(yearData).forEach(([year, counties]: [string, any]) => {
        dataMap[year] = {}
        counties.forEach((county: CountyData) => {
          dataMap[year][county.fips] = county
        })
      })
      setYearlyData(dataMap)

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

      setLoading(false)
    }).catch(error => {
      console.error('Critical error loading map data:', error)
      setLoading(false) // CRITICAL: Prevent infinite loading
    })
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
      fetch('/data/us_counties.geojson')
        .then(r => {
          if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`)
          return r.json()
        })
        .then(geojson => {
          newMap.addSource('counties', {
            type: 'geojson',
            data: geojson
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

          // Add state borders
          fetch('/data/us_states.geojson')
            .then(r => {
              if (!r.ok) throw new Error(`Failed to fetch states: ${r.status}`)
              return r.json()
            })
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
        .catch(error => {
          console.error('Error loading county geojson:', error)
        })
    })

    return newMap
  }

  useEffect(() => {
    if (!mapContainer1.current || !mapContainer2.current || loading || map1.current || map2.current) return
    if (Object.keys(yearlyData).length === 0) return

    map1.current = createMap(mapContainer1.current, true)
    map2.current = createMap(mapContainer2.current, false)

    return () => {
      map1.current?.remove()
      map2.current?.remove()
      map1.current = null
      map2.current = null
    }
  }, [loading, yearlyData])

  // Update colors when year changes
  useEffect(() => {
    if (!map1.current || !map2.current || !yearlyData[selectedYear]) return

    const countyData = yearlyData[selectedYear]
    updateMapColors(map1.current, countyData, true)
    updateMapColors(map2.current, countyData, false)
  }, [selectedYear, yearlyData])

  if (loading) {
    return <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
      Loading map data...
    </div>
  }

  const currentData = yearlyData[selectedYear]
  const totalCounties = currentData ? Object.keys(currentData).length : 0

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search county by name (e.g., Los Angeles, Cook, Harris)..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.fips}
                  onClick={() => handleCountySelect(result.fips)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-semibold">{result.name} County</div>
                  <div className="text-xs text-gray-500">FIPS: {result.fips}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Year Slider */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-lg">Year:</label>
          <input
            type="range"
            min="0"
            max={years.length - 1}
            value={years.indexOf(selectedYear)}
            onChange={(e) => setSelectedYear(years[parseInt(e.target.value)])}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-2xl font-bold text-blue-600 min-w-[80px]">{selectedYear}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-2 px-2">
          {years.map(year => (
            <span key={year}>{year}</span>
          ))}
        </div>
        <div className="text-sm text-gray-600 mt-2 text-center">
          Showing {totalCounties.toLocaleString()} counties
        </div>
      </div>

      {/* Legends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-2">Drug Death Rate (per 100k)</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#22c55e'}}></div>
              <span className="text-sm">&lt;10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#facc15'}}></div>
              <span className="text-sm">10-20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#f97316'}}></div>
              <span className="text-sm">20-30</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#dc2626'}}></div>
              <span className="text-sm">30-40</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#7f1d1d'}}></div>
              <span className="text-sm">&gt;40</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#d1d5db'}}></div>
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-2">Republican Margin (%)</h4>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#1e3a8a'}}></div>
              <span className="text-sm">D+40</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#2563eb'}}></div>
              <span className="text-sm">D+20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#93c5fd'}}></div>
              <span className="text-sm">D+0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#fca5a5'}}></div>
              <span className="text-sm">R+0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#dc2626'}}></div>
              <span className="text-sm">R+20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#7f1d1d'}}></div>
              <span className="text-sm">R+40</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4" style={{backgroundColor: '#d1d5db'}}></div>
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side by Side Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="relative">
          <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow z-10 font-semibold">
            Drug Death Rate ({selectedYear})
          </div>
          <div ref={mapContainer1} className="h-[500px] rounded-lg shadow-lg" />
        </div>
        <div className="relative">
          <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow z-10 font-semibold">
            Political Lean ({selectedYear})
          </div>
          <div ref={mapContainer2} className="h-[500px] rounded-lg shadow-lg" />
        </div>
      </div>

      {/* Hover Tooltip - Only Comparable Metrics */}
      {hoveredCounty && (
        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-blue-500">
          <h3 className="font-bold text-xl mb-3">{hoveredCounty.name} County ({selectedYear})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-red-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Drug Deaths</span>
              <div className="font-bold text-lg">
                {hoveredCounty.Is_Suppressed
                  ? '0 (Suppressed)'
                  : hoveredCounty.DrugDeaths !== null
                    ? hoveredCounty.DrugDeaths.toFixed(1)
                    : 'No Data'}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Drug Death Rate</span>
              <div className="font-bold text-lg">
                {hoveredCounty.Is_Suppressed
                  ? 'Suppressed'
                  : hoveredCounty.DrugDeathRate !== null
                    ? `${hoveredCounty.DrugDeathRate.toFixed(1)} per 100k`
                    : 'No Data'}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Suicide Rate</span>
              <div className="font-bold text-lg">
                {hoveredCounty.SuicideRate !== null
                  ? `${hoveredCounty.SuicideRate.toFixed(1)} per 100k`
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Political Lean</span>
              <div className="font-bold text-lg">
                {hoveredCounty.RepublicanMargin !== null
                  ? `${hoveredCounty.RepublicanMargin > 0 ? 'R+' : 'D+'}${Math.abs(hoveredCounty.RepublicanMargin).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Unemployment Rate</span>
              <div className="font-bold text-lg">
                {hoveredCounty.UnemploymentRate !== null
                  ? `${hoveredCounty.UnemploymentRate.toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <span className="text-gray-600 text-xs block">Poverty Rate</span>
              <div className="font-bold text-lg">
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
