from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Integer, DateTime, Text, Numeric
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

    # Compliance fields
    from_pincode = Column(String(6), nullable=True)
    to_pincode = Column(String(6), nullable=True)
    supply_type = Column(String(10), nullable=True)
    sub_supply_type = Column(String(20), nullable=True)
    doc_type = Column(String(20), nullable=True)
    doc_date = Column(DateTime(timezone=True), nullable=True)
    trans_mode = Column(String(15), nullable=True)
    uqc_code = Column(String(10), nullable=True)
    vehicle_type = Column(String(10), nullable=True)
    trans_doc_no = Column(String(50), nullable=True)
    trans_doc_date = Column(DateTime(timezone=True), nullable=True)
    cess_non_advol_value = Column(Numeric(12, 2), default=0.0)
    other_value = Column(Numeric(12, 2), default=0.0)
    total_value = Column(Numeric(12, 2), nullable=True)
    cgst_value = Column(Numeric(12, 2), default=0.0)
    sgst_value = Column(Numeric(12, 2), default=0.0)
    igst_value = Column(Numeric(12, 2), default=0.0)
    cess_value = Column(Numeric(12, 2), default=0.0)
    tot_inv_value = Column(Numeric(12, 2), nullable=True)

    created_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)

    invoice = relationship("Invoice", back_populates="eway_bill")
