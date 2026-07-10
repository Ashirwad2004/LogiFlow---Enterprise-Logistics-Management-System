from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.shipment import Shipment, ShipmentTracking
from app.schemas.tracking import TrackingCoordinates, TrackingResponse, TrackingPointResponse
from datetime import datetime
import redis
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        
    async def connect(self, shipment_id: str, websocket: WebSocket):
        await websocket.accept()
        if shipment_id not in self.active_connections:
            self.active_connections[shipment_id] = []
        self.active_connections[shipment_id].append(websocket)
        
    def disconnect(self, shipment_id: str, websocket: WebSocket):
        if shipment_id in self.active_connections:
            self.active_connections[shipment_id].remove(websocket)
            if not self.active_connections[shipment_id]:
                del self.active_connections[shipment_id]
                
    async def broadcast_to_shipment(self, shipment_id: str, message: dict):
        if shipment_id in self.active_connections:
            for connection in self.active_connections[shipment_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.post("/coordinates", response_model=TrackingResponse)
async def update_coordinates(
    *,
    db: Session = Depends(get_db),
    tracking_in: TrackingCoordinates,
    current_user: User = Depends(check_role(["Driver", "Dispatcher"]))
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
    
    # Update Redis cache
    try:
        r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True, socket_connect_timeout=0.1, socket_timeout=0.1)
        r.hset(f"tracking:shipment:{shipment.id}", mapping={
            "latitude": str(tracking_in.latitude),
            "longitude": str(tracking_in.longitude),
            "speed_kmh": str(tracking_in.speed_kmh),
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print("Failed to cache coordinates in Redis:", e)
        
    # Broadcast to WebSockets
    payload = {
        "latitude": float(tracking_in.latitude),
        "longitude": float(tracking_in.longitude),
        "speed_kmh": float(tracking_in.speed_kmh or 0.0),
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_shipment(str(shipment.id), payload)
    
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
    
    # Fetch invoice if it exists
    invoice_data = None
    invoice = db.query(Invoice).filter(Invoice.shipment_id == shipment.id).first()
    if invoice:
            from app.models.company import Company
            company = db.query(Company).filter(Company.id == shipment.company_id).first()
            invoice_data = {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "subtotal": float(invoice.subtotal),
                "tax_amount": float(invoice.tax_amount),
                "total_amount": float(invoice.total_amount),
                "outstanding_balance": float(invoice.outstanding_balance),
                "status": invoice.status,
                "issued_at": invoice.issued_at,
                "company": {
                    "name": company.name if company else "LogiFlow",
                    "legal_name": company.legal_name if company else "LogiFlow Enterprise",
                    "address": company.address if company else "LogiFlow Tech Way",
                    "gst_number": company.gst_number if company else None,
                    "support_email": company.support_email if company else "support@logiflow.com",
                    "tax_rate": float(company.tax_rate) if company and company.tax_rate else 18.0,
                    "currency": company.currency if company else "USD"
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
        "qr_code_data": shipment.qr_code_data,
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

@router.websocket("/ws/{shipment_id}")
async def websocket_tracking(websocket: WebSocket, shipment_id: str):
    await manager.connect(shipment_id, websocket)
    try:
        # Push cached telemetry immediately upon connection
        try:
            r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True, socket_connect_timeout=0.1, socket_timeout=0.1)
            cached = r.hgetall(f"tracking:shipment:{shipment_id}")
            if cached:
                await websocket.send_json({
                    "latitude": float(cached["latitude"]),
                    "longitude": float(cached["longitude"]),
                    "speed_kmh": float(cached["speed_kmh"]),
                    "timestamp": cached["timestamp"]
                })
        except Exception:
            pass

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(shipment_id, websocket)
    except Exception:
        manager.disconnect(shipment_id, websocket)