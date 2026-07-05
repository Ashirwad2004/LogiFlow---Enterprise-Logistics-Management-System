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
    currency: Optional[str] = "USD"
    base_rate: Optional[float] = 50.00
    rate_per_kg: Optional[float] = 0.50
    address: Optional[str] = None
    is_e_invoice_enabled: Optional[bool] = False

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
    currency: Optional[str] = None
    base_rate: Optional[float] = None
    rate_per_kg: Optional[float] = None
    address: Optional[str] = None
    is_e_invoice_enabled: Optional[bool] = None

class CompanyResponse(CompanyBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
