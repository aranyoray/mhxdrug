#!/usr/bin/env python3
"""
Simplify GeoJSON to reduce file size while maintaining visual quality.
Reduces coordinate precision and simplifies geometries.
"""

import json
import sys

def round_coord(coord, precision=4):
    """Round a coordinate to specified decimal places."""
    if isinstance(coord, list):
        return [round_coord(c, precision) for c in coord]
    return round(coord, precision)

def simplify_geometry(geometry, precision=4):
    """Simplify geometry by reducing coordinate precision."""
    if geometry['type'] == 'Polygon':
        geometry['coordinates'] = round_coord(geometry['coordinates'], precision)
    elif geometry['type'] == 'MultiPolygon':
        geometry['coordinates'] = round_coord(geometry['coordinates'], precision)
    return geometry

def simplify_properties(properties):
    """Keep only essential properties."""
    essential = ['GEOID', 'NAME', 'STATEFP']
    return {k: v for k, v in properties.items() if k in essential}

def simplify_geojson(input_file, output_file, precision=4):
    """Simplify GeoJSON file."""
    print(f"Loading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)

    print(f"Original features: {len(data['features'])}")

    # Simplify each feature
    for i, feature in enumerate(data['features']):
        if i % 500 == 0:
            print(f"Processing feature {i}/{len(data['features'])}...")

        # Simplify geometry
        feature['geometry'] = simplify_geometry(feature['geometry'], precision)

        # Simplify properties
        feature['properties'] = simplify_properties(feature['properties'])

    print(f"Writing to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

    # Compare file sizes
    import os
    original_size = os.path.getsize(input_file)
    new_size = os.path.getsize(output_file)
    reduction = (1 - new_size/original_size) * 100

    print(f"\nOriginal size: {original_size/1024/1024:.2f} MB")
    print(f"New size: {new_size/1024/1024:.2f} MB")
    print(f"Reduction: {reduction:.1f}%")

if __name__ == '__main__':
    simplify_geojson(
        'public/data/us_counties.geojson',
        'public/data/us_counties_simplified.geojson',
        precision=4
    )
