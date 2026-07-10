from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Numeric, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Product(Base):
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    product_number = Column(String(100), nullable=False, index=True) # SKU / Code
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=0.0) # Price for billing
    weight_kg = Column(Numeric(10, 2), nullable=False, default=0.0)
    dimensions = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=False, default=0)
    
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_sections.id", ondelete="SET NULL"), nullable=True)
    rack_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_racks.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=text("now()"))
    
    # Relationships
    company = relationship("Company")
    warehouse = relationship("Warehouse")
    section = relationship("WarehouseSection")
    rack = relationship("WarehouseRack")
    
    shipment_items = relationship("ShipmentItem", back_populates="product")
