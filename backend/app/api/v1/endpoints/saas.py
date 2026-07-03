from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from pydantic import BaseModel
from app.api.deps import get_db, check_role
from app.models.user import User
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.services.audit import log_action

router = APIRouter()

class SubscriptionUpdate(BaseModel):
    subscription_status: str

@router.get("/companies")
def get_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Super Admin"]))
):
    """
    List all companies registered on the platform. Restricted to Super Admins.
    """
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    
    response = []
    for c in companies:
        response.append({
            "id": str(c.id),
            "name": c.name,
            "legal_name": c.legal_name,
            "gst_number": c.gst_number,
            "subscription_status": c.subscription_status,
            "support_email": c.support_email,
            "invoice_prefix": c.invoice_prefix,
            "tax_rate": float(c.tax_rate) if c.tax_rate else 18.00,
            "address": c.address,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return response

@router.put("/companies/{company_id}/subscription")
def update_company_subscription(
    company_id: UUID,
    payload: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Super Admin"]))
):
    """
    Update subscription status of any tenant company.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
        
    old_status = company.subscription_status
    new_status = payload.subscription_status.lower()
    
    if new_status not in ["trial", "active", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid subscription status. Allowed: trial, active, suspended.")
        
    company.subscription_status = new_status
    db.add(company)
    db.commit()
    
    # Audit log this change
    log_action(
        db=db,
        user_id=current_user.id,
        action="update_company_subscription",
        table_name="companies",
        record_id=company.id,
        old_values={"subscription_status": old_status},
        new_values={"subscription_status": new_status}
    )
    
    return {
        "success": True,
        "message": f"Company subscription updated from '{old_status}' to '{new_status}'.",
        "company_id": str(company.id),
        "subscription_status": new_status
    }

@router.get("/audit-logs")
def get_global_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Super Admin"]))
):
    """
    Get all audit logs across all platform tenants. Restricted to Super Admin.
    """
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    response = []
    for log in logs:
        # Resolve company name
        comp = db.query(Company).filter(Company.id == log.company_id).first()
        comp_name = comp.name if comp else "System"
        
        # Resolve user name
        usr = db.query(User).filter(User.id == log.user_id).first()
        user_name = usr.full_name if usr else "Unknown User"
        user_email = usr.email if usr else "N/A"
        
        response.append({
            "id": str(log.id),
            "company_id": str(log.company_id) if log.company_id else None,
            "company_name": comp_name,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": user_name,
            "user_email": user_email,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": str(log.record_id) if log.record_id else None,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })
    return response
