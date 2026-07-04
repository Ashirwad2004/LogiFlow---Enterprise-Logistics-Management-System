from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.schemas.fleet import VehicleCreate, VehicleResponse, DriverCreate, DriverUpdate, DriverResponse, VehicleMaintenanceLogCreate, VehicleMaintenanceLogResponse
from uuid import UUID

router = APIRouter()

# Vehicles Endpoints
@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_in: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(check_role([]))):
    # Check if registration number already exists
    if db.query(Vehicle).filter(Vehicle.registration_number == vehicle_in.registration_number).first():
        raise HTTPException(status_code=400, detail="Vehicle with this registration number already exists.")
    
    vehicle = Vehicle(
        **vehicle_in.model_dump(),
        company_id=current_user.company_id
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.get("/vehicles", response_model=List[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Dispatcher"]))):
    return db.query(Vehicle).filter(Vehicle.company_id == current_user.company_id).all()

# Drivers Endpoints
@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(driver_in: DriverCreate, db: Session = Depends(get_db), current_user: User = Depends(check_role([]))):
    if db.query(Driver).filter(Driver.license_number == driver_in.license_number).first():
        raise HTTPException(status_code=400, detail="Driver with this license number already exists.")
    
    # Ensure user exists and belongs to the same company
    target_user = db.query(User).filter(User.id == driver_in.user_id, User.company_id == current_user.company_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found or does not belong to your company.")
    
    if db.query(Driver).filter(Driver.user_id == driver_in.user_id).first():
        raise HTTPException(status_code=400, detail="User is already registered as a driver.")

    driver = Driver(**driver_in.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver

@router.get("/drivers", response_model=List[DriverResponse])
def get_drivers(db: Session = Depends(get_db), current_user: User = Depends(check_role(["Dispatcher"]))):
    results = db.query(Driver, User.full_name).join(User).filter(User.company_id == current_user.company_id).all()
    drivers = []
    for driver, full_name in results:
        driver.full_name = full_name
        drivers.append(driver)
    return drivers

@router.put("/drivers/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: UUID,
    driver_in: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Company Admin", "Dispatcher"]))
):
    # Verify driver belongs to this company via User link
    driver = db.query(Driver).join(User).filter(Driver.id == driver_id, User.company_id == current_user.company_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
        
    update_data = driver_in.model_dump(exclude_unset=True)
    
    if "assigned_vehicle_id" in update_data and update_data["assigned_vehicle_id"] is not None:
        vehicle = db.query(Vehicle).filter(Vehicle.id == update_data["assigned_vehicle_id"], Vehicle.company_id == current_user.company_id).first()
        if not vehicle:
            raise HTTPException(status_code=400, detail="Vehicle not found or does not belong to this company.")
        if vehicle.status != "active":
            raise HTTPException(status_code=400, detail="Cannot assign driver to an inactive vehicle.")
            
    for field, value in update_data.items():
        setattr(driver, field, value)
        
    db.add(driver)
    db.commit()
    db.refresh(driver)
    
    # fetch full name again for response
    target_user = db.query(User).filter(User.id == driver.user_id).first()
    driver.full_name = target_user.full_name if target_user else None
    
    return driver

@router.post("/vehicles/{vehicle_id}/maintenance", response_model=VehicleMaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
def log_vehicle_maintenance(
    vehicle_id: UUID,
    log_in: VehicleMaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Company Admin", "Super Admin"]))
):
    from app.models.maintenance import VehicleMaintenanceLog
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.company_id == current_user.company_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found.")
    
    db_log = VehicleMaintenanceLog(
        vehicle_id=vehicle_id,
        description=log_in.description,
        cost=log_in.cost,
        performed_at=log_in.performed_at,
        next_due=log_in.next_due
    )
    db.add(db_log)
    
    if log_in.vehicle_status:
        vehicle.status = log_in.vehicle_status
        db.add(vehicle)
        
    db.commit()
    db.refresh(db_log)
    
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="log_vehicle_maintenance",
        table_name="vehicle_maintenance_logs",
        record_id=db_log.id,
        new_values={"description": db_log.description, "cost": float(db_log.cost)}
    )
    return db_log


