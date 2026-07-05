from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class EInvoiceBase(BaseModel):
    invoice_id: UUID

class EInvoiceCreate(EInvoiceBase):
    pass

class EInvoiceResponse(EInvoiceBase):
    id: UUID
    irn: str
    ack_no: str
    ack_date: datetime
    status: str
    signed_invoice: str
    signed_qr_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
