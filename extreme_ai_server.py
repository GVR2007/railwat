# extreme_ai_server.py
# AI Decision + 140-Parameter Computation Engine
# Works directly with your TrainMap.tsx frontend

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import math
import uvicorn
from typing import Dict, List, Any

# import your 140-parameter engine
from compute140Parameters import compute140Parameters
from environment_model import generate_station_environment
from track_segmenter import segment_track
from station_schema import StationModel

app = FastAPI(title="Extreme Train AI Decision Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Global caches for environment data
# -------------------------------------------------------------------
station_env = {}
segment_env_map = {}

# -------------------------------------------------------------------
# Utility: simple distance (meters)
# -------------------------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dLon/2)**2)
    return 2 * R * math.asin(math.sqrt(a))

# -------------------------------------------------------------------
# Decide collision resolution between trains
# -------------------------------------------------------------------
def decide_collision_action(trains: List[Dict[str, Any]]):
    """
    trains = [
        { "id": "...", "name": "...", "lat":.., "lon":.., "speed":.., "priority":.. },
        { ... }
    ]

    RETURNS:
    - STOP_ONE
    - STOP_BOTH
    - LET_PASS
    """

    if len(trains) < 2:
        return {"action": "NO_ACTION"}

    A = trains[0]
    B = trains[1]

    # distance between them
    dist = haversine(A["lat"], A["lon"], B["lat"], B["lon"])

    # ------------------------
    # Priority rule
    # ------------------------
    # Higher priority trains get preference (higher number = more priority)
    prA = A.get("priority", 1)
    prB = B.get("priority", 1)

    # ------------------------
    # Speed rule
    # ------------------------
    sA = A.get("speed", 0)
    sB = B.get("speed", 0)

    # ------------------------
    # STOP both if extremely close (safety hard-stop)
    # ------------------------
    if dist <= 35:  # meters (your aura ~ 30px ≈ this)
        return {
            "action": "STOP_BOTH",
            "reason": "Critical proximity"
        }

    # ------------------------
    # Pick which train to stop:
    # Higher priority => let pass
    # Faster train => let pass
    # ------------------------
    if prA > prB:
        return {
            "action": "STOP_ONE",
            "stop_train": B["id"],
            "let_pass": A["id"],
            "reason": "Train A higher priority"
        }

    if prB > prA:
        return {
            "action": "STOP_ONE",
            "stop_train": A["id"],
            "let_pass": B["id"],
            "reason": "Train B higher priority"
        }

    # If priorities equal → faster goes first
    if sA > sB:
        return {
            "action": "STOP_ONE",
            "stop_train": B["id"],
            "let_pass": A["id"],
            "reason": "Train A faster"
        }

    if sB > sA:
        return {
            "action": "STOP_ONE",
            "stop_train": A["id"],
            "let_pass": B["id"],
            "reason": "Train B faster"
        }

    # identical => stop both
    return {
        "action": "STOP_BOTH",
        "reason": "Same speed & priority"
    }

# -------------------------------------------------------------------
# API: /decide
# -------------------------------------------------------------------
@app.post("/decide")
async def decide_endpoint(req: Request):
    """
    Expected payload from TrainMap.tsx:

    {
      "trains": [
         { "id":"T1", "lat":..., "lon":..., "speed":100, "priority":1 },
         { "id":"T2", "lat":..., "lon":..., "speed":80, "priority":1 }
      ],
      "stations": { "DEL": { "lat": 28.6139, "lon": 77.2090 }, ... },
      "edges": [["DEL", "NDLS"], ...]
    }
    """
    data = await req.json()
    trains = data.get("trains", [])
    stations = data.get("stations", {})
    edges = data.get("edges", [])

    # Attach environment to each station if missing
    for name in stations.keys():
        if name not in station_env:
            station_env[name] = generate_station_environment(name)

    # Build 100m track segments for each edge
    segment_env_map.clear()
    for u, v in edges:
        key = f"{u}-{v}"
        segment_env_map[key] = segment_track(stations, u, v)

    if not trains or len(trains) < 2:
        return {"action": "NO_ACTION", "error": "Not enough trains"}

    # AI decision logic
    decision = decide_collision_action(trains)

    # Include fallback id mapping
    if "stop_train" in decision:
        decision["stop_train_id"] = decision["stop_train"]
    if "let_pass" in decision:
        decision["let_pass_id"] = decision["let_pass"]

    return decision

# -------------------------------------------------------------------
# API: /compute140
# -------------------------------------------------------------------
@app.post("/compute140")
async def compute140(req: Request):
    data = await req.json()
    trains = data.get("trains", [])
    stations = data.get("stations", {})
    edges = data.get("edges", [])

    params, contribs, weights = compute140Parameters(
        trains,
        stations,
        edges,
        station_env=station_env,
        segment_env=segment_env_map
    )

    return {
        "params": params,
        "contribs": contribs,
        "weights": weights
    }

# -------------------------------------------------------------------
# Run
# -------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("extreme_ai_server:app", host="0.0.0.0", port=8000, reload=True)
