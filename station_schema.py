from pydantic import BaseModel
from typing import Optional

class StationModel(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    station_length_m: float
    platform_length_m: float
    num_platforms: int
    avg_train_length_m: float
    arrival_rate_per_hr: float
    avg_dwell_s: float
    avg_approach_speed_kmh: float
    adhesion_mu: Optional[float] = 0.35
    reaction_time_s: Optional[float] = 1.5
    safety_buffer_s: Optional[float] = 30.0
    cv_interarrival: Optional[float] = 1.0
    margin_factor: Optional[float] = 1.0
