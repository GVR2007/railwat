# computeTrainParameters.py
"""
Train Movement / Kinematics Parameters (P1–P20)
Used by backend for fully deterministic and replicable computation.
"""

import math
from typing import List, Dict

def compute_train_parameters(trains: List[Dict]) -> Dict[str, Dict[str, float]]:
    """
    Returns:
      { trainId : { p1:..., p2:..., ..., p20:... }, ... }
    """

    results = {}

    # Avoid division-by-zero when only one train
    n = max(1, len(trains))

    for t in trains:
        tid = t["id"]

        speed_kmh = t.get("speed", 0)
        progress = t.get("progress", 0)
        priority = t.get("priority", 1)
        status = t.get("status", "RUNNING")

        # Convert speed
        speed_mps = speed_kmh / 3.6

        # ---------------------------------------------
        # P1 – Speed normalized (0..1)
        # ---------------------------------------------
        p1 = min(1.0, speed_kmh / 200.0)

        # ---------------------------------------------
        # P2 – Acceleration estimate (finite difference)
        # (Assume previous speed in object or smooth)
        # ---------------------------------------------
        prev_speed = t.get("prev_speed", speed_kmh)
        accel = (speed_kmh - prev_speed) / max(1.0, 1.0)  # km/h per second approx
        p2 = accel / 50.0  # normalize
        p2 = max(-1.0, min(1.0, p2))

        # ---------------------------------------------
        # P3 – Jerk (change in acceleration)
        # ---------------------------------------------
        prev_accel = t.get("prev_accel", accel)
        jerk = accel - prev_accel
        p3 = jerk / 20.0
        p3 = max(-1.0, min(1.0, p3))

        # ---------------------------------------------
        # P4 – Kinetic Energy factor (normalized)
        # KE = 1/2 * m * v^2 but we normalize by v only
        # ---------------------------------------------
        p4 = (speed_mps ** 2) / (40.0 ** 2)
        p4 = min(1.0, p4)

        # ---------------------------------------------
        # P5 – Progress indicator normalized
        # ---------------------------------------------
        p5 = max(0.0, min(1.0, progress))

        # ---------------------------------------------
        # P6 – Remaining distance factor
        # ---------------------------------------------
        p6 = 1.0 - p5

        # ---------------------------------------------
        # P7 – Stopping distance estimate
        # typical decel = 0.8 m/s^2
        # ---------------------------------------------
        decel = 0.8
        stopping_distance = (speed_mps ** 2) / (2 * decel + 1e-9)
        p7 = min(1.0, stopping_distance / 2000.0)  # normalize

        # ---------------------------------------------
        # P8 – Priority normalized (1..3 → 0.33..1)
        # ---------------------------------------------
        p8 = min(1.0, priority / 3.0)

        # ---------------------------------------------
        # P9 – Time since start (rough estimate)
        # ---------------------------------------------
        start_time = t.get("startTime", 0)
        if start_time > 0:
            elapsed = (t.get("now", start_time) - start_time) / 1000.0
        else:
            elapsed = 0
        p9 = min(1.0, elapsed / 3600.0)

        # ---------------------------------------------
        # P10 – Status risk factor
        # ---------------------------------------------
        status_map = {
            "RUNNING": 0.1,
            "STOPPED": 0.5,
            "EMERGENCY": 1.0,
            "DELAYED": 0.6,
        }
        p10 = status_map.get(status, 0.2)

        # ---------------------------------------------
        # P11 – Relative spacing to nearest train
        # computed later in holistic pass, placeholder
        # ---------------------------------------------
        p11 = 0.0

        # ---------------------------------------------
        # P12 – Speed variance indicator
        # ---------------------------------------------
        p12 = abs(speed_kmh - prev_speed) / 200.0

        # ---------------------------------------------
        # P13 – Efficiency score (speed/priority)
        # ---------------------------------------------
        p13 = min(1.0, speed_kmh / max(1.0, priority * 100.0))

        # ---------------------------------------------
        # P14 – Running smoothness (inverse jerk)
        # ---------------------------------------------
        p14 = 1.0 - min(1.0, abs(p3))

        # ---------------------------------------------
        # P15 – Momentum factor
        # ---------------------------------------------
        p15 = min(1.0, (speed_mps * 1.0) / 50.0)

        # ---------------------------------------------
        # P16 – Trip completion phase (0 early, 1 near end)
        # ---------------------------------------------
        p16 = p5

        # ---------------------------------------------
        # P17 – Reversal / backtracking risk (rare)
        # ---------------------------------------------
        if speed_kmh < 0:
            p17 = min(1.0, abs(speed_kmh) / 50.0)
        else:
            p17 = 0.0

        # ---------------------------------------------
        # P18 – Station proximity (to be filled later)
        # placeholder
        # ---------------------------------------------
        p18 = 0.0

        # ---------------------------------------------
        # P19 – Lat/Lon drift factor
        # ---------------------------------------------
        lat = t.get("lat", 0)
        lon = t.get("lon", 0)
        p19 = min(1.0, (abs(lat) + abs(lon)) % 1.0)

        # ---------------------------------------------
        # P20 – Global normalization
        # ---------------------------------------------
        p20 = (p1 + p5 + p8) / 3.0

        results[tid] = {
            "p1": p1, "p2": p2, "p3": p3, "p4": p4, "p5": p5,
            "p6": p6, "p7": p7, "p8": p8, "p9": p9, "p10": p10,
            "p11": p11, "p12": p12, "p13": p13, "p14": p14, "p15": p15,
            "p16": p16, "p17": p17, "p18": p18, "p19": p19, "p20": p20
        }

        # Save for next frame calculation (accel, speed)
        t["prev_speed"] = speed_kmh
        t["prev_accel"] = accel

    return results
