# computeTrackParameters.py
"""
Track Geometry / Infrastructure Parameters (P21–P40)

Usage:
    from computeTrackParameters import compute_track_parameters, compute_edge_metrics

    # stations: list of {id, name, lat, lon}
    # edges: list of {source, target}
    track_params = compute_track_parameters(stations, edges)
    # track_params is a dict with keys "p21".."p40"

Notes:
- Deterministic: values derived from hashed edge ids so same input -> same output.
- Values are normalized 0..1 where 1 is "worse" or "higher" depending on param (check docstrings).
"""

import hashlib
import math
from typing import List, Dict, Tuple

# Helpers
def _seed_from_str(s: str) -> int:
    h = hashlib.sha256(s.encode("utf-8")).digest()
    return int.from_bytes(h[:8], "big")

def _rand_from_seed_int(seed_int: int) -> float:
    # turn int into 0..1 pseudo-random but deterministic
    return (seed_int % 1000003) / 1000003.0

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))

def _normalize_speed_kmh(v: float, max_kmh: float = 200.0) -> float:
    return _clamp(v / max_kmh)

# Edge metrics (deterministic per edge)
def compute_edge_metrics(edge_id: str, distance_km: float = 1.0) -> Dict[str, float]:
    """
    Deterministic pseudo-random edge-level metrics.
    edge_id: string uniquely identifying the edge (e.g., "DEL-GZB")
    distance_km: approximate distance for the edge (can be approx 1.0 if unknown)
    Returns dict of metrics (0..1):
      - track_condition (higher=worse)
      - curve_severity (higher=tighter)
      - gradient_index (higher=steeper)
      - track_age (higher=older)
      - switch_count_norm (0..1)
      - max_allowed_speed_kmh (unnormalized)
      - drainage_risk
      - ballast_condition
      - embankment_susceptibility
      - electrification_health (higher=bad)
      - switch_condition
    """
    seed = _seed_from_str(edge_id)
    r = _rand_from_seed_int(seed)

    # base variations from hashed value
    track_condition = _clamp(0.2 * r + 0.3 * ((seed >> 7) % 100) / 100.0 + 0.1 * (distance_km / 10.0))
    curve_severity = _clamp(0.1 * r + 0.6 * (((seed >> 13) % 100) / 100.0))
    gradient_index = _clamp(0.05 * r + 0.4 * (((seed >> 19) % 100) / 100.0))
    track_age = _clamp(0.2 * (((seed >> 23) % 100) / 100.0) + 0.3 * r)
    switch_count_norm = _clamp(((seed >> 29) % 5) / 5.0)  # 0..0.8 approx
    # set a deterministic "max speed" influenced by seed and curve severity
    base_max_speed = 200.0 - (curve_severity * 80.0) - (gradient_index * 40.0)
    base_max_speed = max(40.0, base_max_speed - ((track_condition) * 40.0))

    drainage_risk = _clamp(0.3 * (((seed >> 17) % 100) / 100.0) + 0.4 * r)
    ballast_condition = _clamp(0.25 * (((seed >> 11) % 100) / 100.0) + 0.5 * r)
    embankment_susceptibility = _clamp(0.2 * r + 0.6 * (((seed >> 5) % 100) / 100.0))
    electrification_health = _clamp(0.2 * r + 0.5 * (((seed >> 3) % 100) / 100.0))
    switch_condition = _clamp(0.2 * r + 0.6 * (((seed >> 2) % 100) / 100.0))

    return {
        "edge_id": edge_id,
        "distance_km": distance_km,
        "track_condition": track_condition,
        "curve_severity": curve_severity,
        "gradient_index": gradient_index,
        "track_age": track_age,
        "switch_count_norm": switch_count_norm,
        "max_allowed_speed_kmh": base_max_speed,
        "drainage_risk": drainage_risk,
        "ballast_condition": ballast_condition,
        "embankment_susceptibility": embankment_susceptibility,
        "electrification_health": electrification_health,
        "switch_condition": switch_condition
    }

# Network-level aggregator
def compute_track_parameters(stations: List[Dict], edges: List[Dict], default_segment_km: float = 10.0) -> Dict[str, float]:
    """
    Compute network-level P21..P40 aggregated metrics.
    stations: list of {id, name, lat, lon} (lat/lon optional but helpful)
    edges: list of {source, target}
    default_segment_km: used if you don't provide distances

    Returns:
      { "p21":..., "p22":..., ..., "p40":... }
    All values normalized 0..1.
    """
    if not edges:
        # return safe defaults (very healthy low-risk network)
        return { f"p{21+i}": 0.0 for i in range(20) }

    # Summation accumulators
    n_edges = len(edges)
    sum_track_condition = 0.0
    sum_curve = 0.0
    sum_grad = 0.0
    sum_age = 0.0
    sum_switch_density = 0.0
    max_speed_seen = 0.0
    sum_gauge_var = 0.0
    sum_drainage = 0.0
    sum_ballast = 0.0
    sum_embank = 0.0
    sum_signal_gap = 0.0
    sum_switch_cond = 0.0
    sum_electr_health = 0.0
    sum_thermal_risk = 0.0
    total_utilization_proxy = 0.0
    sum_seg_len_km = 0.0
    sum_maintenance_overdue = 0.0
    sum_ballast_uniform = 0.0
    sum_lateral_clearance = 0.0

    # Simple util proxy: edges connected to big stations considered busier
    big_station_ids = set([s["id"] for s in stations[:5]])  # heuristic: first 5 are "large"
    for idx, e in enumerate(edges):
        src = e.get("source")
        tgt = e.get("target")
        edge_id = f"{src}-{tgt}"

        # distance approx: use haversine if lat/lon available, else default_segment_km
        distance_km = default_segment_km
        try:
            s = next((x for x in stations if x["id"] == src), None)
            t = next((x for x in stations if x["id"] == tgt), None)
            if s and t and ("lat" in s) and ("lat" in t):
                # rough distance: planar approx (OK for backend estimation)
                dlat = (s["lat"] - t["lat"])
                dlon = (s["lon"] - t["lon"])
                distance_km = max(0.1, math.hypot(dlat, dlon) * 111.0)  # degrees->km approx
        except Exception:
            distance_km = default_segment_km

        em = compute_edge_metrics(edge_id, distance_km)

        sum_track_condition += em["track_condition"]
        sum_curve += em["curve_severity"]
        sum_grad += em["gradient_index"]
        sum_age += em["track_age"]
        sum_switch_density += em["switch_count_norm"] / max(1.0, distance_km)  # per km
        max_speed_seen = max(max_speed_seen, em["max_allowed_speed_kmh"])
        # gauge variability: mimic from seed bits
        seed = _seed_from_str(edge_id)
        gauge_var = ((seed >> 17) % 100) / 100.0
        sum_gauge_var += gauge_var
        sum_drainage += em["drainage_risk"]
        sum_ballast += em["ballast_condition"]
        sum_embank += em["embankment_susceptibility"]

        # signaling gap: if edge connects non-big stations, slightly higher gap
        if src in big_station_ids or tgt in big_station_ids:
            sum_signal_gap += 0.2 * _rand_from_seed_int(seed)
        else:
            sum_signal_gap += 0.5 * _rand_from_seed_int(seed)

        sum_switch_cond += em["switch_condition"]
        sum_electr_health += em["electrification_health"]
        sum_thermal_risk += 0.2 * _rand_from_seed_int(seed)
        # utilization proxy: edges linking big stations are busier
        total_utilization_proxy += (2.0 if (src in big_station_ids and tgt in big_station_ids) else 1.0)
        sum_seg_len_km += distance_km
        # maintenance overdue: derived from age and randomized multiplier
        sum_maintenance_overdue += em["track_age"] * (0.3 + 0.7 * _rand_from_seed_int(seed))
        # ballast uniformity: higher when ballast_condition low
        sum_ballast_uniform += 1.0 - em["ballast_condition"]
        # lateral clearance: better when small curve and low vegetation factor
        sum_lateral_clearance += 1.0 - em["curve_severity"]

    # compute averages and normalized outputs
    avg_track_condition = _clamp(sum_track_condition / n_edges)
    avg_curve = _clamp(sum_curve / n_edges)
    avg_gradient = _clamp(sum_grad / n_edges)
    avg_age = _clamp(sum_age / n_edges)
    avg_switch_density = _clamp(sum_switch_density / n_edges)
    # normalize max speed to 0..1 (1 = 200 km/h)
    p26_norm = _normalize_speed_kmh(max_speed_seen)
    avg_gauge_var = _clamp(sum_gauge_var / n_edges)
    avg_drainage = _clamp(sum_drainage / n_edges)
    avg_ballast = _clamp(sum_ballast / n_edges)
    avg_embank = _clamp(sum_embank / n_edges)
    avg_signal_gap = _clamp(sum_signal_gap / n_edges)
    avg_switch_cond = _clamp(sum_switch_cond / n_edges)
    avg_electr_health = _clamp(sum_electr_health / n_edges)
    avg_thermal_risk = _clamp(sum_thermal_risk / n_edges)
    # utilization normalized by edges count (simple proxy)
    track_utilization = _clamp((total_utilization_proxy / (2.0 * n_edges)))
    avg_seg_len_km = _clamp(sum_seg_len_km / (n_edges * 100.0))  # normalized (100 km => 1.0)
    maintenance_overdue = _clamp(sum_maintenance_overdue / (n_edges * 1.0))
    ballast_uniformity = _clamp(sum_ballast_uniform / n_edges)
    lateral_clearance = _clamp(sum_lateral_clearance / n_edges)

    # composite track risk (weighted)
    aggregate_track_risk = _clamp(
        0.20 * avg_track_condition
        + 0.15 * avg_curve
        + 0.10 * avg_gradient
        + 0.10 * avg_age
        + 0.10 * avg_drainage
        + 0.10 * (1.0 - ballast_uniformity)  # poor uniformity increases risk
        + 0.15 * maintenance_overdue
    )

    result = {
        "p21": avg_track_condition,
        "p22": avg_curve,
        "p23": avg_gradient,
        "p24": avg_age,
        "p25": _clamp(avg_switch_density),
        "p26": p26_norm,
        "p27": avg_gauge_var,
        "p28": avg_drainage,
        "p29": avg_ballast,
        "p30": avg_embank,
        "p31": avg_signal_gap,
        "p32": avg_switch_cond,
        "p33": avg_electr_health,
        "p34": avg_thermal_risk,
        "p35": track_utilization,
        "p36": avg_seg_len_km,
        "p37": maintenance_overdue,
        "p38": _clamp(1.0 - avg_ballast),  # ballast compaction uniformity inverted
        "p39": lateral_clearance,
        "p40": aggregate_track_risk
    }

    return result
