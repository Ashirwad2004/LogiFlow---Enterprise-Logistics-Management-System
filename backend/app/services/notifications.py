from sqlalchemy.orm import Session
from uuid import UUID
from app.models.notification import Notification

def trigger_notification(
    db: Session,
    company_id: UUID,
    trigger_event: str,
    title: str,
    message: str,
    user_id: UUID = None,
    channel: str = "system"
) -> Notification:
    notification = Notification(
        company_id=company_id,
        user_id=user_id,
        title=title,
        message=message,
        channel=channel,
        trigger_event=trigger_event
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
