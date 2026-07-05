from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class EInvoice(Base):
    __tablename__ = "e_invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False)
    irn = Column(String(64), unique=True, nullable=False, index=True)
    ack_no = Column(String(50), nullable=False)
    ack_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    signed_invoice = Column(Text, nullable=False)
    signed_qr_code = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)

    invoice = relationship("Invoice", back_populates="e_invoice")
