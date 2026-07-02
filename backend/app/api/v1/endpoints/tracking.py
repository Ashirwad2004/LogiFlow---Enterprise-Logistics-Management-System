from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.shipment import Shipment, ShipmentTracking
from app.schemas.tracking import TrackingCoordinates, TrackingResponse, TrackingPointResponse
from datetime import datetime

router = APIRouter()

@router.post("/coordinates", response_model=TrackingResponse)
def update_coordinates(
    *,
    db: Session = Depends(get_db),
    tracking_in: TrackingCoordinates,
    current_user: User = Depends(get_current_user)
) -> Any:
    shipment = db.query(Shipment).filter(
        Shipment.id == tracking_in.shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    tracking_record = ShipmentTracking(
        shipment_id=shipment.id,
        latitude=tracking_in.latitude,
        longitude=tracking_in.longitude,
        speed_kmh=tracking_in.speed_kmh,
        status_update="Coordinates updated"
    )
    
    db.add(tracking_record)
    db.commit()
    
    return {
        "success": True,
        "timestamp": tracking_record.timestamp
    }

@router.get("/{shipment_id}", response_model=List[TrackingPointResponse])
def get_shipment_tracking(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get tracking history for a shipment in chronological order.
    """
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    tracking = db.query(ShipmentTracking).filter(
        ShipmentTracking.shipment_id == shipment_id
    ).order_by(ShipmentTracking.timestamp.asc()).all()
    
    return tracking