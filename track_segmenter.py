# track_segmenter.py
# Splits each track into 100-meter segments and assigns environment parameters

from haversine import haversine
from environment_model import generate_segment_environment

def segment_track(stations, u, v, segment_length=100.0):
    """
    stations: { "DEL": {lat, lon}, ... }
    u, v: station names
    returns: list of segments with environment parameters
    """

    A = stations[u]
    B = stations[v]
    lat1, lon1 = A["lat"], A["lon"]
    lat2, lon2 = B["lat"], B["lon"]

    total_dist = haversine(lat1, lon1, lat2, lon2)   # meters
    num_segments = max(1, int(total_dist // segment_length))

    segments = []
    for i in range(num_segments):
        t1 = i / num_segments
        t2 = (i+1) / num_segments

        # interpolate
        sx = lat1 + (lat2 - lat1) * t1
        sy = lon1 + (lon2 - lon1) * t1
        ex = lat1 + (lat2 - lat1) * t2
        ey = lon1 + (lon2 - lon1) * t2

        segment_id = f"{u}-{v}-{i}"

        segment_env = generate_segment_environment(
            segment_id=segment_id,
            distance_meters=segment_length
        )

        segments.append({
            "id": segment_id,
            "start": {"lat": sx, "lon": sy},
            "end": {"lat": ex, "lon": ey},
            "env": segment_env
        })

    return segments
