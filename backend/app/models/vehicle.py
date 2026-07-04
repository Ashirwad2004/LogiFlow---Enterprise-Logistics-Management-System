from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_number = Column(String(50), unique=True, nullable=False, index=True)
    model = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    capacity_kg = Column(Numeric(10, 2), nullable=False)
    fuel_type = Column(String(50))
    status = Column(String(50), default="active", index=True)
    insurance_expiry = Column(Date)
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    from sqlalchemy.orm import relationship
    maintenance_logs = relationship("VehicleMaintenanceLog", back_populates="vehicle", cascade="all, delete-orphan")
