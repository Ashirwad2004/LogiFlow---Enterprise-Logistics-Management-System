from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    title: str
    message: str
    channel: Optional[str] = "system"
    trigger_event: str
    user_id: Optional[UUID] = None

class NotificationCreate(NotificationBase):
    company_id: UUID

class NotificationResponse(NotificationBase):
    id: UUID
    company_id: UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
