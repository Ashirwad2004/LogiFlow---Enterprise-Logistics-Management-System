from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.warehouse import Warehouse, WarehouseSection, WarehouseRack
from app.models.shipment import Shipment, ShipmentItem
from app.schemas.warehouse import (
    WarehouseCreate, 
    Warehouse as WarehouseSchema,
    WarehouseSectionCreate,
    WarehouseSectionWithRacks,
    WarehouseRackCreate,
    WarehouseRackWithItems
)
from app.services.audit import log_action
from uuid import UUID

router = APIRouter()

@router.post("/", response_model=WarehouseSchema, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
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
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_warehouse",
        table_name="warehouses",
        record_id=warehouse.id,
        new_values={"name": warehouse.name}
    )
    return warehouse

@router.get("/", response_model=List[WarehouseSchema])
def get_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr", "Dispatcher"]))
):
    """
    Get all warehouses for the current tenant company.
    """
    return db.query(Warehouse).filter(Warehouse.company_id == current_user.company_id).all()

@router.get("/{warehouse_id}/sections", response_model=List[WarehouseSectionWithRacks])
def get_warehouse_sections(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr", "Dispatcher"]))
):
    """
    Get all sections and racks in a warehouse, with calculated rack occupancy.
    """
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
        
    sections = db.query(WarehouseSection).filter(WarehouseSection.warehouse_id == warehouse_id).all()
    
    response_sections = []
    for section in sections:
        racks_data = []
        for rack in section.racks:
            # Calculate current occupied weight
            current_weight = 0.0
            items_list = []
            for item in rack.items:
                w = float(item.weight_kg or 0.0)
                qty = int(item.quantity or 1)
                current_weight += w * qty
                items_list.append({
                    "id": str(item.id),
                    "description": item.description,
                    "quantity": item.quantity,
                    "weight_kg": float(item.weight_kg or 0.0),
                    "dimensions": item.dimensions,
                    "status": item.status,
                    "shipment_id": str(item.shipment_id)
                })
                
            capacity = float(rack.capacity_weight_kg or 1000.0)
            fill_pct = min(100.0, (current_weight / capacity) * 100.0) if capacity > 0 else 0.0
            
            racks_data.append({
                "id": rack.id,
                "section_id": rack.section_id,
                "code": rack.code,
                "capacity_weight_kg": capacity,
                "status": "full" if fill_pct >= 95.0 else rack.status,
                "created_at": rack.created_at,
                "items": items_list,
                "current_weight_kg": round(current_weight, 2),
                "fill_percentage": round(fill_pct, 1)
            })
            
        response_sections.append({
            "id": section.id,
            "warehouse_id": section.warehouse_id,
            "name": section.name,
            "type": section.type,
            "created_at": section.created_at,
            "racks": racks_data
        })
        
    return response_sections

@router.post("/{warehouse_id}/sections", response_model=WarehouseSectionWithRacks, status_code=status.HTTP_201_CREATED)
def create_section(
    warehouse_id: UUID,
    section_in: WarehouseSectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Create a new storage section/zone in a warehouse.
    """
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
        
    existing = db.query(WarehouseSection).filter(
        WarehouseSection.name == section_in.name,
        WarehouseSection.warehouse_id == warehouse_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Section with this name already exists in the warehouse.")
        
    section = WarehouseSection(
        warehouse_id=warehouse_id,
        name=section_in.name,
        type=section_in.type
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_warehouse_section",
        table_name="warehouse_sections",
        record_id=section.id,
        new_values={"name": section.name, "warehouse_name": warehouse.name}
    )
    
    # Return with empty racks list
    return {
        "id": section.id,
        "warehouse_id": section.warehouse_id,
        "name": section.name,
        "type": section.type,
        "created_at": section.created_at,
        "racks": []
    }

@router.post("/sections/{section_id}/racks", response_model=WarehouseRackWithItems, status_code=status.HTTP_201_CREATED)
def create_rack(
    section_id: UUID,
    rack_in: WarehouseRackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Create a new storage rack within a warehouse section.
    """
    section = db.query(WarehouseSection).join(Warehouse).filter(
        WarehouseSection.id == section_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found.")
        
    existing = db.query(WarehouseRack).filter(
        WarehouseRack.code == rack_in.code,
        WarehouseRack.section_id == section_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rack with this code already exists in this section.")
        
    rack = WarehouseRack(
        section_id=section_id,
        code=rack_in.code,
        capacity_weight_kg=rack_in.capacity_weight_kg,
        status=rack_in.status
    )
    db.add(rack)
    db.commit()
    db.refresh(rack)
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_warehouse_rack",
        table_name="warehouse_racks",
        record_id=rack.id,
        new_values={"code": rack.code, "section_name": section.name}
    )
    
    return {
        "id": rack.id,
        "section_id": rack.section_id,
        "code": rack.code,
        "capacity_weight_kg": float(rack.capacity_weight_kg),
        "status": rack.status,
        "created_at": rack.created_at,
        "items": [],
        "current_weight_kg": 0.0,
        "fill_percentage": 0.0
    }

@router.get("/{warehouse_id}/unassigned-items")
def get_unassigned_items(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr", "Dispatcher"]))
):
    """
    Get all shipment items that belong to shipments allocated to this warehouse but are not currently assigned to any rack.
    """
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
        
    # Find all items where shipment.warehouse_id == warehouse_id and shipment_item.rack_id IS NULL
    items = db.query(ShipmentItem).join(Shipment).filter(
        Shipment.warehouse_id == warehouse_id,
        Shipment.company_id == current_user.company_id,
        ShipmentItem.rack_id == None
    ).all()
    
    response = []
    for item in items:
        response.append({
            "id": str(item.id),
            "description": item.description,
            "quantity": item.quantity,
            "weight_kg": float(item.weight_kg or 0.0),
            "dimensions": item.dimensions,
            "status": item.status,
            "shipment_id": str(item.shipment_id),
            "tracking_number": item.shipment.tracking_number
        })
        
    return response

@router.post("/racks/{rack_id}/assign-item")
def assign_item_to_rack(
    rack_id: UUID,
    payload: dict, # {"item_id": "..."}
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Assign a specific shipment item to a rack.
    """
    item_id_str = payload.get("item_id")
    if not item_id_str:
        raise HTTPException(status_code=400, detail="item_id is required.")
        
    try:
        item_id = UUID(item_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item_id UUID.")
        
    rack = db.query(WarehouseRack).join(WarehouseSection).join(Warehouse).filter(
        WarehouseRack.id == rack_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found.")
        
    item = db.query(ShipmentItem).join(Shipment).filter(
        ShipmentItem.id == item_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shipment item not found.")
        
    # Check weight capacity
    current_weight = sum(float(i.weight_kg or 0.0) * int(i.quantity or 1) for i in rack.items if i.id != item.id)
    new_item_weight = float(item.weight_kg or 0.0) * int(item.quantity or 1)
    
    if current_weight + new_item_weight > float(rack.capacity_weight_kg):
        raise HTTPException(status_code=400, detail=f"Rack capacity exceeded. Remaining: {float(rack.capacity_weight_kg) - current_weight} kg, Requested: {new_item_weight} kg.")
        
    old_rack_id = item.rack_id
    item.rack_id = rack_id
    db.add(item)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="assign_item_to_rack",
        table_name="shipment_items",
        record_id=item.id,
        new_values={
            "rack_code": rack.code,
            "description": item.description,
            "old_rack_id": str(old_rack_id) if old_rack_id else None
        }
    )
    
    return {"success": True, "message": "Item successfully assigned to rack."}

@router.post("/racks/{rack_id}/remove-item")
def remove_item_from_rack(
    rack_id: UUID,
    payload: dict, # {"item_id": "..."}
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Remove a shipment item from its assigned rack.
    """
    item_id_str = payload.get("item_id")
    if not item_id_str:
        raise HTTPException(status_code=400, detail="item_id is required.")
        
    try:
        item_id = UUID(item_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item_id UUID.")
        
    rack = db.query(WarehouseRack).join(WarehouseSection).join(Warehouse).filter(
        WarehouseRack.id == rack_id,
        Warehouse.company_id == current_user.company_id
    ).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found.")
        
    item = db.query(ShipmentItem).filter(
        ShipmentItem.id == item_id,
        ShipmentItem.rack_id == rack_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found on this rack.")
        
    item.rack_id = None
    db.add(item)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="remove_item_from_rack",
        table_name="shipment_items",
        record_id=item.id,
        new_values={
            "rack_code": rack.code,
            "description": item.description
        }
    )
    
    return {"success": True, "message": "Item removed from rack."}

@router.post("/items/{item_id}/check-in")
def check_in_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Confirm arrival and check in a cargo package at the warehouse.
    """
    item = db.query(ShipmentItem).join(Shipment).filter(
        ShipmentItem.id == item_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shipment item not found.")
        
    old_status = item.status
    item.status = "received"
    db.add(item)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="check_in_shipment_item",
        table_name="shipment_items",
        record_id=item.id,
        new_values={
            "description": item.description,
            "old_status": old_status,
            "new_status": "received"
        }
    )
    
    return {"success": True, "message": "Cargo item successfully checked in.", "status": "received"}

@router.post("/items/{item_id}/dispatch")
def dispatch_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr"]))
):
    """
    Confirm dispatch / loading cargo package onto vehicle.
    """
    item = db.query(ShipmentItem).join(Shipment).filter(
        ShipmentItem.id == item_id,
        Shipment.company_id == current_user.company_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shipment item not found.")
        
    old_status = item.status
    item.status = "dispatched"
    db.add(item)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="dispatch_shipment_item",
        table_name="shipment_items",
        record_id=item.id,
        new_values={
            "description": item.description,
            "old_status": old_status,
            "new_status": "dispatched"
        }
    )
    
    return {"success": True, "message": "Cargo item successfully dispatched.", "status": "dispatched"}

