from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class EWayBill(Base):
    __tablename__ = "eway_bills"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False)
    ewb_number = Column(String(12), unique=True, nullable=True, index=True)
    status = Column(String(50), default="draft", nullable=False)
    consignor_gstin = Column(String(15), nullable=False)
    consignee_gstin = Column(String(15), nullable=False)
    hsn_code = Column(String(8), nullable=False)
    transporter_id = Column(String(50), nullable=True)
    vehicle_number = Column(String(20), nullable=True)
    distance_km = Column(Integer, nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    qr_code_data = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)

    invoice = relationship("Invoice", back_populates="eway_bill")
