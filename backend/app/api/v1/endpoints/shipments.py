from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, joinedload
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.shipment import Shipment, ShipmentItem
from app.schemas.shipment import ShipmentCreate, ShipmentListResponse, Shipment as ShipmentSchema, ShipmentUpdate
from datetime import datetime
import uuid

router = APIRouter()

def generate_tracking_number() -> str:
    # A simple generator for LF-YYYY-RANDOM
    import random
    year = datetime.now().year
    rand_num = random.randint(100000, 999999)
    return f"LF-{year}-{rand_num}"

@router.post("/", status_code=201)
def create_shipment(
    *,
    db: Session = Depends(get_db),
    shipment_in: ShipmentCreate,
    current_user: User = Depends(check_role(["Dispatcher"]))
) -> Any:
    import random
    tracking_num = generate_tracking_number()
    qr_data = f"LF-QR-{tracking_num}-{random.randint(1000, 9999)}"
    
    db_shipment = Shipment(
        company_id=current_user.company_id,
        tracking_number=tracking_num,
        customer_id=shipment_in.customer_id,
        warehouse_id=shipment_in.warehouse_id,
        driver_id=shipment_in.driver_id,
        status="pending",
        pickup_address=shipment_in.pickup_address,
        delivery_address=shipment_in.delivery_address,
        estimated_delivery=shipment_in.estimated_delivery,
        qr_code_data=qr_data
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    
    # Add Items
    if shipment_in.items:
        for item_in in shipment_in.items:
            db_item = ShipmentItem(
                shipment_id=db_shipment.id,
                description=item_in.description,
                quantity=item_in.quantity,
                weight_kg=item_in.weight_kg,
                dimensions=item_in.dimensions
            )
            db.add(db_item)
        db.commit()
    
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_shipment",
        table_name="shipments",
        record_id=db_shipment.id,
        new_values={"tracking_number": db_shipment.tracking_number, "status": db_shipment.status}
    )
    
    from app.services.notifications import trigger_notification
    trigger_notification(
        db=db,
        company_id=current_user.company_id,
        trigger_event="shipment_created",
        title="New Shipment Booked",
        message=f"Shipment {db_shipment.tracking_number} has been created and is pending dispatch."
    )
    
    return {
        "id": db_shipment.id,
        "tracking_number": db_shipment.tracking_number,
        "status": db_shipment.status,
        "qr_code_data": db_shipment.qr_code_data,
        "created_at": db_shipment.created_at
    }

@router.get("/", response_model=ShipmentListResponse)
def read_shipments(
    db: Session = Depends(get_db),
    page: int = 1,
    size: int = 20,
    status: str = Query(None),
    search: str = Query(None),
    current_user: User = Depends(check_role(["Dispatcher", "Driver", "Warehouse Mgr", "Accountant", "Customer"]))
) -> Any:
    from app.models.customer import Customer
    from app.models.driver import Driver

    query = db.query(
        Shipment,
        Customer.name.label("customer_name"),
        User.full_name.label("driver_name")
    ).join(
        Customer, Shipment.customer_id == Customer.id
    ).outerjoin(
        Driver, Shipment.driver_id == Driver.id
    ).outerjoin(
        User, Driver.user_id == User.id
    ).options(
        joinedload(Shipment.items)
    ).filter(
        Shipment.company_id == current_user.company_id
    )
    
    if current_user.role_name == "Customer":
        # Find the customer record by email
        customer_record = db.query(Customer).filter(Customer.email == current_user.email, Customer.company_id == current_user.company_id).first()
        if not customer_record:
            return {"items": [], "total": 0, "page": page, "size": size, "pages": 0}
        query = query.filter(Shipment.customer_id == customer_record.id)
        
    if status:
        query = query.filter(Shipment.status == status)
    if search:
        query = query.filter(Shipment.tracking_number.ilike(f"%{search}%"))
        
    total = query.count()
    results = query.offset((page - 1) * size).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    items = []
    for shipment, cust_name, drv_name in results:
        shipment.customer_name = cust_name
        shipment.driver_name = drv_name
        items.append(shipment)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/{shipment_id}", response_model=ShipmentSchema)
def read_shipment(
    shipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Dispatcher", "Driver", "Warehouse Mgr", "Accountant", "Customer"]))
) -> Any:
    from app.models.customer import Customer
    from app.models.driver import Driver

    query = db.query(
        Shipment,
        Customer.name.label("customer_name"),
        User.full_name.label("driver_name")
    ).join(
        Customer, Shipment.customer_id == Customer.id
    ).outerjoin(
        Driver, Shipment.driver_id == Driver.id
    ).outerjoin(
        User, Driver.user_id == User.id
    ).options(
        joinedload(Shipment.items)
    ).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == current_user.company_id
    )
    
    if current_user.role_name == "Customer":
        customer_record = db.query(Customer).filter(Customer.email == current_user.email, Customer.company_id == current_user.company_id).first()
        if not customer_record:
            raise HTTPException(status_code=404, detail="Shipment not found")
        query = query.filter(Shipment.customer_id == customer_record.id)
        
    result = query.first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    shipment, cust_name, drv_name = result
    shipment.customer_name = cust_name
    shipment.driver_name = drv_name
    return shipment

@router.put("/{shipment_id}", response_model=ShipmentSchema)
def update_shipment(
    shipment_id: str,
    shipment_in: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Dispatcher", "Driver"]))
) -> Any:
    """
    Update shipment details (e.g. driver assignment, status, actual delivery, POD).
    If status transitions to 'delivered', automatically generate an Invoice with GST.
    """
    shipment = db.query(Shipment).filter(
        Shipment.id == shipment_id,
        Shipment.company_id == current_user.company_id
    ).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    old_status = shipment.status
    old_values = {
        "status": shipment.status,
        "driver_id": str(shipment.driver_id) if shipment.driver_id else None
    }
    
    # Update fields
    update_data = shipment_in.model_dump(exclude_unset=True)
    
    # Check if driver assignment is being changed
    new_driver_id = update_data.get("driver_id")
    if new_driver_id and str(new_driver_id) != str(shipment.driver_id):
        from app.models.driver import Driver
        from app.models.vehicle import Vehicle
        
        driver = db.query(Driver).filter(Driver.id == new_driver_id).first()
        if not driver:
            raise HTTPException(status_code=400, detail="The assigned driver does not exist.")
            
        # 1. Verify driver has an assigned vehicle
        if not driver.assigned_vehicle_id:
            raise HTTPException(
                status_code=400,
                detail="The driver cannot be assigned because they have no vehicle allocated."
            )
            
        # 2. Verify driver is available
        if driver.status != "available":
            raise HTTPException(
                status_code=400,
                detail=f"The driver is currently {driver.status} and cannot take a new shipment."
            )
            
        vehicle = db.query(Vehicle).filter(Vehicle.id == driver.assigned_vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=400, detail="The driver's assigned vehicle does not exist.")
            
        # 3. Verify vehicle is active
        if vehicle.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"The vehicle is currently {vehicle.status} and cannot be used."
            )
            
        # 4. Verify vehicle capacity vs total items weight
        total_shipment_weight = sum(float(item.weight_kg or 0.0) * int(item.quantity or 1) for item in shipment.items)
        if total_shipment_weight > float(vehicle.capacity_kg):
            raise HTTPException(
                status_code=400,
                detail=f"Shipment weight ({total_shipment_weight} kg) exceeds vehicle capacity ({vehicle.capacity_kg} kg)."
            )
            
    # Verification check when transitioning to delivered
    new_status = update_data.get("status")
    if new_status == "delivered" and old_status != "delivered":
        scanned_qr = update_data.get("qr_code_data")
        if not scanned_qr or scanned_qr != shipment.qr_code_data:
            raise HTTPException(
                status_code=400,
                detail="Package verification failed. QR code data does not match the shipment record."
            )
            
    for field, value in update_data.items():
        setattr(shipment, field, value)
        
    # Update driver status dynamically based on shipment status transitions
    if shipment.driver_id:
        from app.models.driver import Driver
        driver = db.query(Driver).filter(Driver.id == shipment.driver_id).first()
        if driver:
            if shipment.status == "in_transit":
                driver.status = "on_trip"
            elif shipment.status == "delivered":
                driver.status = "available"
            db.add(driver)
            
    # If transitioning to delivered, generate invoice
    if shipment.status == "delivered" and old_status != "delivered":
        # Load company to get custom prefix and tax rate
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == shipment.company_id).first()
        prefix = company.invoice_prefix if company and company.invoice_prefix else "INV"
        tax_pct = float(company.tax_rate) / 100.0 if company and company.tax_rate is not None else 0.18
        
        # Calculate invoice amount
        base_rate = float(company.base_rate) if company and company.base_rate is not None else 50.00
        rate_per_kg = float(company.rate_per_kg) if company and company.rate_per_kg is not None else 0.50
        
        item_charge = 0.00
        for item in shipment.items:
            weight = float(item.weight_kg or 0.0)
            quantity = int(item.quantity or 1)
            item_charge += quantity * weight * rate_per_kg
            
        subtotal = base_rate + item_charge
        gst_amount = subtotal * tax_pct
        total_amount = subtotal + gst_amount
        
        # Check if invoice already exists
        from app.models.invoice import Invoice
        existing_invoice = db.query(Invoice).filter(Invoice.shipment_id == shipment.id).first()
        if not existing_invoice:
            import random
            inv_number = f"{prefix}-{datetime.now().year}-{random.randint(100000, 999999)}"
            db_invoice = Invoice(
                shipment_id=shipment.id,
                invoice_number=inv_number,
                subtotal=subtotal,
                tax_amount=gst_amount,
                total_amount=total_amount,
                status="unpaid",
                issued_at=datetime.utcnow()
            )
            db.add(db_invoice)
            
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    
    # Notifications trigger transitions
    from app.services.notifications import trigger_notification
    if shipment.status == "in_transit" and old_status != "in_transit":
        trigger_notification(
            db=db,
            company_id=shipment.company_id,
            trigger_event="shipment_in_transit",
            title="Shipment In Transit",
            message=f"Shipment {shipment.tracking_number} is now in transit."
        )
    elif shipment.status == "delivered" and old_status != "delivered":
        trigger_notification(
            db=db,
            company_id=shipment.company_id,
            trigger_event="shipment_delivered",
            title="Shipment Delivered",
            message=f"Shipment {shipment.tracking_number} has been successfully delivered."
        )
    
    new_values = {
        "status": shipment.status,
        "driver_id": str(shipment.driver_id) if shipment.driver_id else None
    }
    
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="update_shipment",
        table_name="shipments",
        record_id=shipment.id,
        old_values=old_values,
        new_values=new_values
    )
    
    # Attach names for Pydantic serialization compatibility
    from app.models.customer import Customer
    from app.models.driver import Driver
    
    cust = db.query(Customer).filter(Customer.id == shipment.customer_id).first()
    shipment.customer_name = cust.name if cust else None
    
    if shipment.driver_id:
        drv_user = db.query(User).join(Driver, Driver.user_id == User.id).filter(Driver.id == shipment.driver_id).first()
        shipment.driver_name = drv_user.full_name if drv_user else None
    else:
        shipment.driver_name = None
        
    return shipment
