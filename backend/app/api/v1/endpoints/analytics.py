from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.shipment import Shipment
from app.models.invoice import Invoice
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.audit_log import AuditLog
import datetime

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id
    
    # Check if Customer role
    is_customer = current_user.role_name == "Customer"
    customer_id = None
    if is_customer:
        from app.models.customer import Customer
        cust = db.query(Customer).filter(Customer.email == current_user.email, Customer.company_id == company_id).first()
        customer_id = cust.id if cust else None

    # Total Active Shipments
    q_active_ship = db.query(Shipment).filter(
        Shipment.company_id == company_id,
        Shipment.status.notin_(["delivered", "cancelled"])
    )
    if is_customer and customer_id:
        q_active_ship = q_active_ship.filter(Shipment.customer_id == customer_id)
    elif is_customer and not customer_id:
        q_active_ship = q_active_ship.filter(Shipment.id == None) # Return 0
    active_shipments = q_active_ship.count()
    
    # Available Drivers (N/A for customer)
    available_drivers = 0
    if not is_customer:
        available_drivers = db.query(Driver).join(User).filter(
            User.company_id == company_id,
            Driver.status == "available"
        ).count()
    
    # Vehicles on Duty (N/A for customer)
    active_vehicles = 0
    if not is_customer:
        active_vehicles = db.query(Vehicle).filter(
            Vehicle.company_id == company_id,
            Vehicle.status == "active"
        ).count()
    
    # Pending Revenue (Unpaid invoices)
    q_pending_rev = db.query(func.sum(Invoice.total_amount)).join(Shipment).filter(
        Shipment.company_id == company_id,
        Invoice.status == "unpaid"
    )
    if is_customer and customer_id:
        q_pending_rev = q_pending_rev.filter(Shipment.customer_id == customer_id)
    elif is_customer and not customer_id:
        q_pending_rev = q_pending_rev.filter(Shipment.id == None)
        
    pending_revenue = q_pending_rev.scalar() or 0.0
    
    # 1. Weekly Shipment Volume (last 7 rolling days)
    today = datetime.date.today()
    weekly_volume = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        day_str = d.strftime("%a")
        start_time = datetime.datetime.combine(d, datetime.time.min)
        end_time = datetime.datetime.combine(d, datetime.time.max)
        q_count = db.query(Shipment).filter(
            Shipment.company_id == company_id,
            Shipment.created_at >= start_time,
            Shipment.created_at <= end_time
        )
        if is_customer and customer_id:
            q_count = q_count.filter(Shipment.customer_id == customer_id)
        elif is_customer and not customer_id:
            q_count = q_count.filter(Shipment.id == None)
        count = q_count.count()
        weekly_volume.append({"day": day_str, "count": count})
        
    # 2. Monthly Payouts / Revenue (last 4 rolling months)
    monthly_revenue = []
    for i in range(3, -1, -1):
        first_day_current = today.replace(day=1)
        month_val = first_day_current.month - i
        year_val = first_day_current.year
        while month_val <= 0:
            month_val += 12
            year_val -= 1
        
        m_start = datetime.date(year_val, month_val, 1)
        if month_val == 12:
            m_end = datetime.date(year_val + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            m_end = datetime.date(year_val, month_val + 1, 1) - datetime.timedelta(days=1)
            
        month_label = m_start.strftime("%B")
        
        # Sum both paid and unpaid invoices to represent generated freight revenue
        q_rev = db.query(func.sum(Invoice.total_amount)).join(Shipment).filter(
            Shipment.company_id == company_id,
            Invoice.issued_at >= datetime.datetime.combine(m_start, datetime.time.min),
            Invoice.issued_at <= datetime.datetime.combine(m_end, datetime.time.max)
        )
        if is_customer and customer_id:
            q_rev = q_rev.filter(Shipment.customer_id == customer_id)
        elif is_customer and not customer_id:
            q_rev = q_rev.filter(Shipment.id == None)
            
        rev = q_rev.scalar() or 0.0
        
        monthly_revenue.append({
            "month": month_label,
            "revenue": float(rev)
        })
        
    # 3. Recent Audit Logs (acting as recent alerts/notifications)
    results = db.query(AuditLog, User.full_name).join(
        User, AuditLog.user_id == User.id
    ).filter(
        User.company_id == company_id
    ).order_by(
        AuditLog.timestamp.desc()
    ).limit(4).all()
    
    alerts = []
    for log, full_name in results:
        action_title = log.action.replace('_', ' ').title()
        alerts.append({
            "id": str(log.id),
            "title": action_title,
            "message": f"Action logged by {full_name} on table '{log.table_name}'.",
            "type": "info"
        })
        
    # Default alert if no logs exist yet
    if not alerts:
        alerts.append({
            "id": "default",
            "title": "System Active",
            "message": "All logistics operations are running healthy. Audit ledger is active.",
            "type": "info"
        })
        
    return {
        "metrics": {
            "active_shipments": active_shipments,
            "available_drivers": available_drivers,
            "active_vehicles": active_vehicles,
            "pending_revenue": float(pending_revenue)
        },
        "weekly_volume": weekly_volume,
        "monthly_revenue": monthly_revenue,
        "alerts": alerts
    }

