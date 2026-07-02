from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Any

class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    action: str
    table_name: Optional[str] = None
    record_id: Optional[UUID] = None
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
