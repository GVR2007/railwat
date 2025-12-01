# TODO: Implement Phase B - 100-meter Track Segmentation Engine

## Completed: Implement Track Parameters (P21-P40)
- Created `computeTrackParameters.py` with deterministic computation of track geometry/infrastructure parameters.
- Integrated into `compute140Parameters.py` to compute and return track_params alongside train and station params.
- Added test file `test_track_params.py` for validation.

## Step 1: Create track_segmenter.py
- Create the new file `track_segmenter.py` with the provided code.
- Ensure it uses `from haversine import haversine` (install haversine if needed: `pip install haversine`).

## Step 2: Update extreme_ai_server.py
- Add imports: `from environment_model import generate_station_environment`, `from track_segmenter import segment_track`.
- Add global dictionaries: `station_env = {}`, `segment_env_map = {}`.
- In `/decide` endpoint:
  - After processing `stations`, for each station name, if not in `station_env`, generate and store using `generate_station_environment(name)`.
  - After processing `edges`, for each edge (u, v), generate segments using `segment_track(stations, u, v)`, store in `segment_env_map[f"{u}-{v}"]`.
- In `/compute140` endpoint, pass `station_env` and `segment_env_map` to `compute140Parameters`.

## Step 3: Update compute140Parameters.py
- Modify function signature: `def compute140Parameters(trains, stations, edges, station_env=None, segment_env=None):`.
- Inside the function, implement logic to use `station_env` for station-related params (e.g., p81-p100 from src station).
- For segment-related params (e.g., p95), find the appropriate segment in `segment_env` based on src-dst and segment_index, and use its env.

## Step 4: Update lib/store.ts
- Add interfaces: `Station` with optional `env?: Record<string, number>`, `TrackSegment` with id, start, end, env.
- Add `trackSegments: Record<string, TrackSegment[]>` to the store state.
- Update logic to store `station_env` and `segment_env_map` when calling backend (e.g., in `/decide` or new endpoint).

## Step 5: Install Dependencies
- Run `pip install haversine` if not already installed.

## Step 6: Test Implementation
- Test `/decide` endpoint to ensure station and segment env are generated.
- Test `/compute140` to verify parameters use env data.
- Update frontend to display env data if needed.
