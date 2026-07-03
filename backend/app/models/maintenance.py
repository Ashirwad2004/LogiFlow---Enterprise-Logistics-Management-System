from sqlalchemy import Column, String, Numeric, Date, ForeignKey, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import uuid

class VehicleMaintenanceLog(Base):
    __tablename__ = "vehicle_maintenance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(255), nullable=False)
    cost = Column(Numeric(10, 2), nullable=False)
    performed_at = Column(Date, nullable=False)
    next_due = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    vehicle = relationship("Vehicle", back_populates="maintenance_logs")
