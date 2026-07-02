from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class TrackingCoordinates(BaseModel):
    shipment_id: UUID
    latitude: float
    longitude: float
    speed_kmh: float = 0.0

class TrackingResponse(BaseModel):
    success: bool
    timestamp: datetime

class TrackingPointResponse(BaseModel):
    id: UUID
    shipment_id: UUID
    latitude: float
    longitude: float
    speed_kmh: float
    status_update: str
    timestamp: datetime

    class Config:
        from_attributes = True
