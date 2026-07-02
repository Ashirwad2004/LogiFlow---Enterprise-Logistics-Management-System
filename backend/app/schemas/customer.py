from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    billing_address: str
    shipping_address: str

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: UUID
    company_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
