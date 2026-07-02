from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

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
