from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
import string
import random

from app.api import deps
from app.models.shipment import Shipment, ShipmentItem
from app.models.user import User
from app.schemas.shipment import Shipment as ShipmentSchema, ShipmentCreate, ShipmentUpdate

router = APIRouter()

def generate_tracking_number():
    return "TRK-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))

@router.get("/", response_model=List[ShipmentSchema])
def read_shipments(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve shipments.
    """
    shipments = db.query(Shipment).filter(Shipment.company_id == current_user.company_id).offset(skip).limit(limit).all()
    return shipments

@router.post("/", response_model=ShipmentSchema)
def create_shipment(
    *,
    db: Session = Depends(deps.get_db),
    shipment_in: ShipmentCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new shipment.
    """
    db_shipment = Shipment(
        tracking_number=shipment_in.tracking_number or generate_tracking_number(),
        company_id=current_user.company_id,
        customer_id=shipment_in.customer_id,
        warehouse_id=shipment_in.warehouse_id,
        driver_id=shipment_in.driver_id,
        status=shipment_in.status,
        pickup_address=shipment_in.pickup_address,
        delivery_address=shipment_in.delivery_address,
        estimated_delivery=shipment_in.estimated_delivery
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    
    for item_in in shipment_in.items:
        db_item = ShipmentItem(
            shipment_id=db_shipment.id,
            description=item_in.description,
            quantity=item_in.quantity,
            weight_kg=item_in.weight_kg,
            dimensions=item_in.dimensions
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@router.get("/{id}", response_model=ShipmentSchema)
def read_shipment(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get shipment by ID.
    """
    shipment = db.query(Shipment).filter(Shipment.id == id, Shipment.company_id == current_user.company_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment

@router.put("/{id}", response_model=ShipmentSchema)
def update_shipment(
    *,
    db: Session = Depends(deps.get_db),
    id: UUID,
    shipment_in: ShipmentUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a shipment.
    """
    shipment = db.query(Shipment).filter(Shipment.id == id, Shipment.company_id == current_user.company_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    update_data = shipment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shipment, field, value)
        
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment
