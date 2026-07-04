from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# Invoice Schemas
class InvoiceBase(BaseModel):
    shipment_id: UUID
    invoice_number: str
    subtotal: float
    tax_amount: float
    discount_amount: float = 0.0
    total_amount: float
    status: str = "unpaid"
    pdf_url: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

from app.schemas.eway_bill import EWayBillResponse

class InvoiceResponse(InvoiceBase):
    id: UUID
    issued_at: datetime
    outstanding_balance: float
    eway_bill: Optional[EWayBillResponse] = None

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    invoice_id: UUID
    amount: float
    payment_method: str
    transaction_reference: Optional[str] = None
    status: str = "pending"

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: UUID
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True