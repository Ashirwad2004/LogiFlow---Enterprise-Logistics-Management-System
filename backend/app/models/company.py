from sqlalchemy import Column, String, TIMESTAMP, text
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
    created_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=text("now()"), nullable=False)
