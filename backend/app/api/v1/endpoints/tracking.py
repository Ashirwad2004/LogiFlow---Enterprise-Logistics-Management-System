from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.shipment import Shipment, ShipmentTracking
from app.schemas.tracking import TrackingCoordinates, TrackingResponse, TrackingPointResponse
from datetime import datetime

router = APIRouter()

@router.post("/coordinates", response_model=TrackingResponse)
def update_coordinates(
    *,
    db: Session = Depends(get_db),
    tracking_in: TrackingCoordinates,
    current_user: User = Depends(check_role(["Driver"]))
) -> Any:
    shipment = db.query(Shipment).filter(
        Shipment.id == tracking_in.shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    tracking_record = ShipmentTracking(
        shipment_id=shipment.id,
        latitude=tracking_in.latitude,
        longitude=tracking_in.longitude,
        speed_kmh=tracking_in.speed_kmh,
        status_update="Coordinates updated"
    )
    
    db.add(tracking_record)
    db.commit()
    
    return {
        "success": True,
        "timestamp": tracking_record.timestamp
    }

@router.get("/{shipment_id}", response_model=List[TrackingPointResponse])
def get_shipment_tracking(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get tracking history for a shipment in chronological order.
    """
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    tracking = db.query(ShipmentTracking).filter(
        ShipmentTracking.shipment_id == shipment_id
    ).order_by(ShipmentTracking.timestamp.asc()).all()
    
    return tracking

@router.get("/public/{tracking_number}")
def get_public_shipment_tracking(
    tracking_number: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get tracking info and history for a shipment by tracking number (public access).
    """
    from app.models.invoice import Invoice
    from app.models.customer import Customer
    
    result = db.query(
        Shipment,
        Customer.name.label("customer_name")
    ).join(
        Customer, Shipment.customer_id == Customer.id
    ).filter(
        Shipment.tracking_number == tracking_number
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment, cust_name = result
    
    # Fetch tracking history
    tracking = db.query(ShipmentTracking).filter(
        ShipmentTracking.shipment_id == shipment.id
    ).order_by(ShipmentTracking.timestamp.asc()).all()
    
    # Fetch invoice if delivered
    invoice_data = None
    if shipment.status == "delivered":
        invoice = db.query(Invoice).filter(Invoice.shipment_id == shipment.id).first()
        if invoice:
            # Load company to get billing details
            from app.models.company import Company
            company = db.query(Company).filter(Company.id == shipment.company_id).first()
            invoice_data = {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "subtotal": float(invoice.subtotal),
                "tax_amount": float(invoice.tax_amount),
                "total_amount": float(invoice.total_amount),
                "status": invoice.status,
                "issued_at": invoice.issued_at,
                "company": {
                    "name": company.name if company else "LogiFlow",
                    "legal_name": company.legal_name if company else "LogiFlow Enterprise",
                    "address": company.address if company else "LogiFlow Tech Way",
                    "gst_number": company.gst_number if company else None,
                    "support_email": company.support_email if company else "support@logiflow.com",
                    "tax_rate": float(company.tax_rate) if company and company.tax_rate else 18.0
                }
            }
            
    return {
        "id": shipment.id,
        "tracking_number": shipment.tracking_number,
        "customer_name": cust_name,
        "status": shipment.status,
        "pickup_address": shipment.pickup_address,
        "delivery_address": shipment.delivery_address,
        "estimated_delivery": shipment.estimated_delivery,
        "actual_delivery": shipment.actual_delivery,
        "proof_of_delivery_url": shipment.proof_of_delivery_url,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "weight_kg": float(item.weight_kg) if item.weight_kg else 0.0,
                "dimensions": item.dimensions
            }
            for item in shipment.items
        ],
        "tracking_history": [
            {
                "latitude": float(pt.latitude),
                "longitude": float(pt.longitude),
                "speed_kmh": float(pt.speed_kmh) if pt.speed_kmh else 0.0,
                "status_update": pt.status_update,
                "timestamp": pt.timestamp
            }
            for pt in tracking
        ],
        "invoice": invoice_data
    }