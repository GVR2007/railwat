#!/usr/bin/env python3
"""
Test script for compute_train_parameters function.
Tests functional correctness, edge cases, and integration.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from computeTrainParameters import compute_train_parameters
from compute140Parameters import compute140Parameters

def test_basic_functionality():
    """Test basic functionality with sample train data."""
    trains = [
        {
            "id": "T1",
            "speed": 100,  # km/h
            "progress": 0.5,
            "priority": 1,
            "status": "RUNNING",
            "lat": 28.6139,
            "lon": 77.2090,
            "startTime": 1000000,
            "now": 1003600,  # 1 hour later
        },
        {
            "id": "T2",
            "speed": 80,
            "progress": 0.3,
            "priority": 2,
            "status": "STOPPED",
            "lat": 28.6692,
            "lon": 77.4538,
            "startTime": 1000000,
            "now": 1007200,  # 2 hours later
        }
    ]

    results = compute_train_parameters(trains)

    print("Basic Functionality Test:")
    for tid, params in results.items():
        print(f"Train {tid}:")
        for p in range(1, 21):
            print(f"  p{p}: {params[f'p{p}']:.4f}")
        print()

    # Assertions
    assert len(results) == 2
    assert "T1" in results
    assert "T2" in results
    assert results["T1"]["p1"] == min(1.0, 100 / 200.0)  # 0.5
    assert results["T1"]["p5"] == 0.5
    assert results["T1"]["p8"] == min(1.0, 1 / 3.0)  # ~0.3333
    assert results["T2"]["p10"] == 0.5  # STOPPED status
    print("✓ Basic functionality test passed.\n")

def test_edge_cases():
    """Test edge cases: empty list, missing keys, invalid data."""
    print("Edge Cases Test:")

    # Empty train list
    results = compute_train_parameters([])
    assert results == {}
    print("✓ Empty train list handled.")

    # Train with missing keys (should use defaults)
    train_missing = {"id": "T3"}
    results = compute_train_parameters([train_missing])
    assert results["T3"]["p1"] == 0.0  # speed=0
    assert results["T3"]["p5"] == 0.0  # progress=0
    assert results["T3"]["p8"] == min(1.0, 1 / 3.0)  # priority=1
    print("✓ Missing keys handled with defaults.")

    # Negative speed (reversal)
    train_neg = {"id": "T4", "speed": -50}
    results = compute_train_parameters([train_neg])
    assert results["T4"]["p17"] == min(1.0, 50 / 50.0)  # 1.0
    print("✓ Negative speed handled.")

    # High speed
    train_high = {"id": "T5", "speed": 300}
    results = compute_train_parameters([train_high])
    assert results["T5"]["p1"] == 1.0  # capped at 1.0
    print("✓ High speed capped.")

    print("✓ Edge cases test passed.\n")

def test_integration():
    """Test integration with compute140Parameters."""
    print("Integration Test:")

    trains = [
        {"id": "T1", "speed": 100, "progress": 0.5, "priority": 1, "status": "RUNNING"}
    ]
    stations = {}
    edges = []

    train_params, track_params, network_params = compute140Parameters(trains, stations, edges)

    assert isinstance(train_params, dict)
    assert "T1" in train_params
    assert len(train_params["T1"]) == 20  # p1 to p20
    assert track_params == {}
    assert network_params == {}
    print("✓ Integration with compute140Parameters passed.\n")

def test_performance():
    """Test performance with multiple trains."""
    import time

    print("Performance Test:")
    trains = [
        {"id": f"T{i}", "speed": i * 10, "progress": i / 100.0, "priority": (i % 3) + 1, "status": "RUNNING"}
        for i in range(1, 101)  # 100 trains
    ]

    start_time = time.time()
    results = compute_train_parameters(trains)
    end_time = time.time()

    assert len(results) == 100
    duration = end_time - start_time
    print(f"✓ Computed parameters for 100 trains in {duration:.4f} seconds.")
    assert duration < 1.0  # Should be fast
    print("✓ Performance test passed.\n")

if __name__ == "__main__":
    test_basic_functionality()
    test_edge_cases()
    test_integration()
    test_performance()
    print("All tests passed! ✅")
