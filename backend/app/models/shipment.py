from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    tracking_number = Column(String(100), unique=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="pending")
    pickup_address = Column(String, nullable=False)
    delivery_address = Column(String, nullable=False)
    estimated_delivery = Column(TIMESTAMP)
    actual_delivery = Column(TIMESTAMP)
    proof_of_delivery_url = Column(String)
    qr_code_data = Column(String)
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    items = relationship("ShipmentItem", back_populates="shipment", cascade="all, delete-orphan")

class ShipmentItem(Base):
    __tablename__ = "shipment_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    rack_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_racks.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    weight_kg = Column(Numeric(10, 2))
    dimensions = Column(String(100))

    shipment = relationship("Shipment", back_populates="items")
    rack = relationship("WarehouseRack", back_populates="items")


class ShipmentTracking(Base):
    __tablename__ = "shipment_tracking"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    speed_kmh = Column(Numeric(5, 2))
    status_update = Column(String(100))
    timestamp = Column(TIMESTAMP, server_default=text("now()"), nullable=False)