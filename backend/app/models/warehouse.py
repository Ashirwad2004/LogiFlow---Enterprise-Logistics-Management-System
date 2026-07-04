from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Warehouse(Base):
    __tablename__ = "warehouses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String, nullable=False)
    capacity_volume = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    sections = relationship("WarehouseSection", back_populates="warehouse", cascade="all, delete-orphan")

class WarehouseSection(Base):
    __tablename__ = "warehouse_sections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False) # e.g. Cold Storage, Fast-Moving, Bulk Dry
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    warehouse = relationship("Warehouse", back_populates="sections")
    racks = relationship("WarehouseRack", back_populates="section", cascade="all, delete-orphan")

class WarehouseRack(Base):
    __tablename__ = "warehouse_racks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    section_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False) # e.g. A1, A2
    capacity_weight_kg = Column(Numeric(10, 2), nullable=False, default=1000.0)
    status = Column(String(50), nullable=False, default="active") # active, locked, full
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    section = relationship("WarehouseSection", back_populates="racks")
    items = relationship("ShipmentItem", back_populates="rack")