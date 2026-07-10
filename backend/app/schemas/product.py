from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class ProductBase(BaseModel):
    product_number: str
    name: str
    description: Optional[str] = None
    price: float = 0.0
    weight_kg: float = 0.0
    dimensions: Optional[str] = None
    quantity: int = 0
    warehouse_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    rack_id: Optional[UUID] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    product_number: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    weight_kg: Optional[float] = None
    dimensions: Optional[str] = None
    quantity: Optional[int] = None
    warehouse_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    rack_id: Optional[UUID] = None

class ProductResponse(ProductBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    
    # Locations detail names for frontend table joins
    warehouse_name: Optional[str] = None
    section_name: Optional[str] = None
    rack_code: Optional[str] = None

    class Config:
        from_attributes = True
