import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'us_counties.geojson')
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const geojson = JSON.parse(fileContents)

    return NextResponse.json(geojson, {
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
    return NextResponse.json(
      { error: 'Failed to load GeoJSON' },
      { status: 500 }
    )
  }
}
