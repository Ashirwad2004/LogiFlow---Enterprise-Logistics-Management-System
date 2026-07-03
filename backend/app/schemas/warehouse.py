from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class WarehouseBase(BaseModel):
    name: str
    address: str
    capacity_volume: float

class WarehouseCreate(WarehouseBase):
    pass

class Warehouse(WarehouseBase):
    id: UUID
    company_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Warehouse Section (Zone) ---
class WarehouseSectionBase(BaseModel):
    name: str
    type: str

class WarehouseSectionCreate(WarehouseSectionBase):
    pass

class WarehouseSectionResponse(WarehouseSectionBase):
    id: UUID
    warehouse_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Warehouse Rack ---
class WarehouseRackBase(BaseModel):
    code: str
    capacity_weight_kg: float = 1000.0
    status: str = "active"

class WarehouseRackCreate(WarehouseRackBase):
    pass

class WarehouseRackResponse(WarehouseRackBase):
    id: UUID
    section_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- Nested serialization structures ---
class WarehouseRackWithItems(WarehouseRackResponse):
    items: List[dict] = []
    fill_percentage: float = 0.0
    current_weight_kg: float = 0.0

class WarehouseSectionWithRacks(WarehouseSectionResponse):
    racks: List[WarehouseRackWithItems] = []

class WarehouseDetailResponse(Warehouse):
    sections: List[WarehouseSectionWithRacks] = []

