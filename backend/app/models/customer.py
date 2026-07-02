from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    billing_address = Column(String, nullable=False)
    shipping_address = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("now()"))
