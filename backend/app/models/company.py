from sqlalchemy import Column, String, TIMESTAMP, text, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    gst_number = Column(String(50), unique=True)
    logo_url = Column(String)
    subscription_status = Column(String(50), default="trial", nullable=False)
    support_email = Column(String(255))
    invoice_prefix = Column(String(50), default="INV", nullable=False, server_default="INV")
    tax_rate = Column(Numeric(5, 2), default=18.00, nullable=False, server_default="18.00")
    currency = Column(String(10), default="USD", nullable=False, server_default="USD")
    base_rate = Column(Numeric(10, 2), default=50.00, nullable=False, server_default="50.00")
    rate_per_kg = Column(Numeric(10, 2), default=0.50, nullable=False, server_default="0.50")
    address = Column(String)
    is_e_invoice_enabled = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)

