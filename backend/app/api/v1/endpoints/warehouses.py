from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, Warehouse as WarehouseSchema

router = APIRouter()

@router.post("/", response_model=WarehouseSchema, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new warehouse for the current tenant company.
    """
    existing = db.query(Warehouse).filter(
        Warehouse.name == warehouse_in.name,
        Warehouse.company_id == current_user.company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse with this name already exists.")
        
    warehouse = Warehouse(
        name=warehouse_in.name,
        address=warehouse_in.address,
        capacity_volume=warehouse_in.capacity_volume,
        company_id=current_user.company_id
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse

@router.get("/", response_model=List[WarehouseSchema])
def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all warehouses for the current tenant company.
    """
    return db.query(Warehouse).filter(Warehouse.company_id == current_user.company_id).all()
