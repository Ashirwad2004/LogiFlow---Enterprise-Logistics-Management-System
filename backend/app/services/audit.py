from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, Dict, Any
from app.models.audit_log import AuditLog

def log_action(
    db: Session,
    user_id: Optional[UUID],
    action: str,
    table_name: Optional[str] = None,
    record_id: Optional[UUID] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Log an administrative or operational security action to the audit ledger.
    """
    db_log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
