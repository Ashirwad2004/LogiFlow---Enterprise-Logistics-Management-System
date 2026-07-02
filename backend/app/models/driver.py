from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    license_number = Column(String(100), unique=True, nullable=False)
    license_expiry = Column(Date, nullable=False)
    emergency_contact = Column(String(255))
    status = Column(String(50), default="available")
    assigned_vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text("now()"))
