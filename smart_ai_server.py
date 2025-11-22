from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
import logging

app = FastAPI()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

COLLISION_DISTANCE_METERS = 100  # 100 km for testing collision detection

class Train(BaseModel):
    name: str
    lat: float
    lon: float

class TrainWrapper(BaseModel):
    trains: list[Train]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat/2)**2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon/2)**2
    )
    return 2 * R * math.asin(math.sqrt(a))

@app.post("/decide")
def decide(data: TrainWrapper):
    logger.info(f"Received decide request with {len(data.trains)} trains")
    trains = data.trains
    decisions = []

    for i in range(len(trains)):
        for j in range(i + 1, len(trains)):
            A = trains[i]
            B = trains[j]

            dist = haversine(A.lat, A.lon, B.lat, B.lon)
            logger.info(f"Distance between {A.name} and {B.name}: {dist:.2f} meters")

            if dist <= COLLISION_DISTANCE_METERS:
                logger.info(f"Collision detected between {A.name} and {B.name}")
                decisions.append({
                    "action": "STOP",
                    "reason": "Collision danger",
                    "affected_trains": [A.name, B.name]
                })

    if not decisions:
        logger.info("No collisions detected, all safe")
        return [{"action": "NORMAL", "reason": "All safe", "affected_trains": []}]

    logger.info(f"Returning {len(decisions)} stop decisions")
    return decisions

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Smart AI Server...")
    uvicorn.run("smart_ai_server:app", host="0.0.0.0", port=8000, reload=True)
