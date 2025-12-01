#!/usr/bin/env python3

# Quick test for computeTrackParameters.py

from computeTrackParameters import compute_track_parameters, compute_edge_metrics

# Test data
stations = [
    {"id": "DEL", "name": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"id": "GZB", "name": "Ghaziabad", "lat": 28.6692, "lon": 77.4538},
    {"id": "AGC", "name": "Agra Cantt", "lat": 27.1617, "lon": 78.0081}
]

edges = [
    {"source": "DEL", "target": "GZB"},
    {"source": "GZB", "target": "AGC"}
]

print("Testing compute_edge_metrics...")
edge_metrics = compute_edge_metrics("DEL-GZB", 25.0)
print("Edge metrics keys:", list(edge_metrics.keys()))
print("Sample values:", {k: v for k, v in edge_metrics.items() if k in ["track_condition", "curve_severity", "max_allowed_speed_kmh"]})

print("\nTesting compute_track_parameters...")
track_params = compute_track_parameters(stations, edges)
print("Track params keys:", sorted(track_params.keys()))
print("Sample p21-p25:", {k: v for k, v in track_params.items() if k in ["p21", "p22", "p23", "p24", "p25"]})

print("\nTest completed successfully!")
