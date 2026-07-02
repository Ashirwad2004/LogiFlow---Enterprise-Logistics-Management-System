from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.shipment import Shipment, ShipmentTracking
from app.models.user import User
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class TrackingCreate(BaseModel):
    shipment_id: UUID
    latitude: float
    longitude: float
    speed_kmh: float = None
    status_update: str = None

class TrackingResponse(TrackingCreate):
    id: UUID
    timestamp: datetime
    class Config:
        from_attributes = True

@router.post("/coordinates", response_model=TrackingResponse)
def add_tracking_point(
    *,
    db: Session = Depends(deps.get_db),
    tracking_in: TrackingCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Add a tracking point for a shipment.
    """
    shipment = db.query(Shipment).filter(Shipment.id == tracking_in.shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    db_tracking = ShipmentTracking(
        shipment_id=tracking_in.shipment_id,
        latitude=tracking_in.latitude,
        longitude=tracking_in.longitude,
        speed_kmh=tracking_in.speed_kmh,
        status_update=tracking_in.status_update
    )
    db.add(db_tracking)
    
    if tracking_in.status_update:
        shipment.status = tracking_in.status_update
        db.add(shipment)
        
    db.commit()
    db.refresh(db_tracking)
    return db_tracking

@router.get("/{shipment_id}", response_model=List[TrackingResponse])
def get_shipment_tracking(
    *,
    db: Session = Depends(deps.get_db),
    shipment_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get tracking history for a shipment.
    """
    tracking = db.query(ShipmentTracking).filter(ShipmentTracking.shipment_id == shipment_id).order_by(ShipmentTracking.timestamp.desc()).all()
    return tracking
