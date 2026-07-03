from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

# Vehicle Schemas
class VehicleBase(BaseModel):
    registration_number: str
    model: str
    type: str
    capacity_kg: float
    fuel_type: Optional[str] = None
    status: Optional[str] = "active"
    insurance_expiry: Optional[date] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleMaintenanceLogResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    description: str
    cost: float
    performed_at: date
    next_due: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VehicleMaintenanceLogCreate(BaseModel):
    description: str
    cost: float
    performed_at: date
    next_due: Optional[date] = None
    vehicle_status: Optional[str] = "maintenance"

class VehicleResponse(VehicleBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    maintenance_logs: List[VehicleMaintenanceLogResponse] = []

    class Config:
        from_attributes = True

# Driver Schemas
class DriverBase(BaseModel):
    user_id: UUID
    license_number: str
    license_expiry: date
    emergency_contact: Optional[str] = None
    status: Optional[str] = "available"
    assigned_vehicle_id: Optional[UUID] = None

class DriverCreate(DriverBase):
    pass

class DriverResponse(DriverBase):
    id: UUID
    created_at: datetime
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
