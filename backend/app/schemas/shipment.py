from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ShipmentItemBase(BaseModel):
    description: str
    quantity: int
    weight_kg: Optional[float] = None
    dimensions: Optional[str] = None
    rack_id: Optional[UUID] = None

class ShipmentItemCreate(ShipmentItemBase):
    pass

class ShipmentItem(ShipmentItemBase):
    id: UUID
    shipment_id: UUID

    class Config:
        from_attributes = True

class ShipmentBase(BaseModel):
    tracking_number: Optional[str] = None
    customer_id: UUID
    warehouse_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    status: Optional[str] = "pending"
    pickup_address: str
    delivery_address: str
    estimated_delivery: Optional[datetime] = None

class ShipmentCreate(ShipmentBase):
    company_id: Optional[UUID] = None
    items: List[ShipmentItemCreate] = []

class ShipmentUpdate(BaseModel):
    status: Optional[str] = None
    driver_id: Optional[UUID] = None
    actual_delivery: Optional[datetime] = None
    proof_of_delivery_url: Optional[str] = None
    qr_code_data: Optional[str] = None

class Shipment(ShipmentBase):
    id: UUID
    company_id: UUID
    actual_delivery: Optional[datetime] = None
    proof_of_delivery_url: Optional[str] = None
    qr_code_data: Optional[str] = None
    created_at: datetime
    
    items: List[ShipmentItem] = []
    
    customer_name: Optional[str] = None
    driver_name: Optional[str] = None

    class Config:
        from_attributes = True

class ShipmentListResponse(BaseModel):
    items: List[Shipment]
    total: int
    page: int
    size: int
    pages: int