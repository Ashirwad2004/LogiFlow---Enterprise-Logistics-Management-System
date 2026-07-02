from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Warehouse(Base):
    __tablename__ = "warehouses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(String, nullable=False)
    capacity_volume = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("now()"))