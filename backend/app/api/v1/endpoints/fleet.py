from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.schemas.fleet import VehicleCreate, VehicleResponse, DriverCreate, DriverResponse

router = APIRouter()

# Vehicles Endpoints
@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_in: VehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def get_vehicles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Vehicle).filter(Vehicle.company_id == current_user.company_id).all()

# Drivers Endpoints
@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(driver_in: DriverCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def get_drivers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Driver, User.full_name).join(User).filter(User.company_id == current_user.company_id).all()
    drivers = []
    for driver, full_name in results:
        driver.full_name = full_name
        drivers.append(driver)
    return drivers
