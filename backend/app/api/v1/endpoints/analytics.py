from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.shipment import Shipment
from app.models.invoice import Invoice
from app.models.driver import Driver
from app.models.vehicle import Vehicle

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company_id = current_user.company_id
    
    # Total Active Shipments
    active_shipments = db.query(Shipment).filter(
        Shipment.company_id == company_id,
        Shipment.status.notin_(["delivered", "cancelled"])
    ).count()
    
    # Available Drivers
    available_drivers = db.query(Driver).join(User).filter(
        User.company_id == company_id,
        Driver.status == "available"
    ).count()
    
    # Vehicles on Duty (Assigned to active shipments, or not available)
    # Simple proxy: count vehicles that are active
    active_vehicles = db.query(Vehicle).filter(
        Vehicle.company_id == company_id,
        Vehicle.status == "active"
    ).count()
    
    # Pending Revenue
    # Join shipments and invoices to ensure it's the company's invoices
    pending_revenue = db.query(func.sum(Invoice.total_amount)).join(Shipment).filter(
        Shipment.company_id == company_id,
        Invoice.status == "unpaid"
    ).scalar() or 0.0
    
    # Recent Alerts (Mocked for now until we have an alerts table)
    alerts = [
        {"id": 1, "title": "System Online", "message": "All logistics systems operating normally.", "type": "info"}
    ]
    
    return {
        "metrics": {
            "active_shipments": active_shipments,
            "available_drivers": available_drivers,
            "active_vehicles": active_vehicles,
            "pending_revenue": float(pending_revenue)
        },
        "alerts": alerts
    }
