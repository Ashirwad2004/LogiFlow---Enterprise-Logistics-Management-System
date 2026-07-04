from sqlalchemy import Column, String, Numeric, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base
import uuid

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="RESTRICT"), unique=True, nullable=False)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(50), default="unpaid", index=True)
    pdf_url = Column(Text, nullable=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
