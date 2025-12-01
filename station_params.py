# station_params.py
import math

G = 9.81

def kmh_to_mps(v_kmh: float) -> float:
    return v_kmh / 3.6

def braking_distance(v_kmh: float, mu: float) -> float:
    v = kmh_to_mps(v_kmh)
    if mu <= 0: mu = 0.25
    return (v * v) / (2.0 * mu * G)

def reaction_distance(v_kmh: float, reaction_time_s: float) -> float:
    v = kmh_to_mps(v_kmh)
    return v * reaction_time_s

def total_stopping_distance(v_kmh: float, mu: float, reaction_time_s: float, margin_factor: float = 1.0) -> float:
    d_brake = braking_distance(v_kmh, mu)
    d_react = reaction_distance(v_kmh, reaction_time_s)
    return (d_brake + d_react) * margin_factor

def platform_utilization(arrival_rate_per_hr: float, avg_dwell_s: float) -> float:
    return (arrival_rate_per_hr * avg_dwell_s) / 3600.0

def max_simultaneous_trains(station_length_m: float, avg_train_length_m: float) -> int:
    if avg_train_length_m <= 0:
        return 0
    return int(math.floor(station_length_m / avg_train_length_m))

def capacity_per_platform(avg_dwell_s: float, buffer_s: float) -> float:
    denom = (avg_dwell_s + buffer_s)
    if denom <= 0:
        return float('inf')
    return 3600.0 / denom

def station_capacity(num_platforms: int, avg_dwell_s: float, buffer_s: float) -> float:
    return capacity_per_platform(avg_dwell_s, buffer_s) * max(1, num_platforms)

def risk_index_from_utilization(overall_utilization: float, cv: float = 1.0) -> float:
    return (overall_utilization ** 2) * (1.0 + cv * cv)

def compute_station_parameters(
    station_length_m: float,
    platform_length_m: float,
    num_platforms: int,
    avg_train_length_m: float,
    arrival_rate_per_hr: float,
    avg_dwell_s: float,
    avg_approach_speed_kmh: float,
    adhesion_mu: float = 0.35,
    reaction_time_s: float = 1.5,
    safety_buffer_s: float = 30.0,
    cv_interarrival: float = 1.0,
    margin_factor: float = 1.0
) -> dict:
    # Derived
    max_trains = max_simultaneous_trains(station_length_m, avg_train_length_m)
    util_single = platform_utilization(arrival_rate_per_hr, avg_dwell_s)
    overall_util = util_single / max(1, num_platforms)
    brake_m = braking_distance(avg_approach_speed_kmh, adhesion_mu)
    react_m = reaction_distance(avg_approach_speed_kmh, reaction_time_s)
    stop_m = (brake_m + react_m) * margin_factor
    cap = station_capacity(num_platforms, avg_dwell_s, safety_buffer_s)
    min_clearance_s = avg_dwell_s + safety_buffer_s
    risk = risk_index_from_utilization(overall_util, cv_interarrival)

    return {
        "station_length_m": station_length_m,
        "platform_length_m": platform_length_m,
        "num_platforms": num_platforms,
        "avg_train_length_m": avg_train_length_m,
        "arrival_rate_per_hr": arrival_rate_per_hr,
        "avg_dwell_s": avg_dwell_s,
        "avg_approach_speed_kmh": avg_approach_speed_kmh,
        "adhesion_mu": adhesion_mu,
        "reaction_time_s": reaction_time_s,
        "safety_buffer_s": safety_buffer_s,
        "max_simultaneous_trains": max_trains,
        "platform_utilization_single": util_single,
        "platform_utilization_overall": overall_util,
        "braking_distance_m": brake_m,
        "reaction_distance_m": react_m,
        "total_stopping_distance_m": stop_m,
        "station_capacity_trains_per_hr": cap,
        "min_clearance_time_s": min_clearance_s,
        "conflict_risk_index": risk
    }

# Example quick-run
if __name__ == "__main__":
    demo = compute_station_parameters(
        station_length_m=400.0,
        platform_length_m=250.0,
        num_platforms=2,
        avg_train_length_m=200.0,
        arrival_rate_per_hr=4.0,
        avg_dwell_s=150.0,
        avg_approach_speed_kmh=80.0
    )
    import pprint
    pprint.pprint(demo)
