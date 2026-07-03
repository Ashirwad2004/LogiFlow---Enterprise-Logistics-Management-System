from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Company Admin", "Super Admin"]))
) -> Any:
    """
    Retrieve all audit logs for the logged-in user's company tenant.
    """
    # Join with User to enforce company tenant filter
    results = db.query(AuditLog, User.full_name).join(
        User, AuditLog.user_id == User.id
    ).filter(
        User.company_id == current_user.company_id
    ).order_by(
        AuditLog.timestamp.desc()
    ).all()
    
    logs = []
    for log, full_name in results:
        log.user_name = full_name
        logs.append(log)
        
    return logs
