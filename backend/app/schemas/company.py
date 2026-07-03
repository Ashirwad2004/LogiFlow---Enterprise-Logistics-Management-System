from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    support_email: Optional[EmailStr] = None
    invoice_prefix: Optional[str] = "INV"
    tax_rate: Optional[float] = 18.0
    address: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    support_email: Optional[EmailStr] = None
    invoice_prefix: Optional[str] = None
    tax_rate: Optional[float] = None
    address: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
