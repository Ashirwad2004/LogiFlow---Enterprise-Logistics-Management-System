from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(String)
    created_at = Column(TIMESTAMP, server_default=text("now()"))

    from sqlalchemy.orm import relationship
    from app.models.permission import role_permissions
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

