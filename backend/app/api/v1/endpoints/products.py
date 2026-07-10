from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.api.deps import get_db, get_current_user, check_role
from app.models.user import User
from app.models.product import Product
from app.models.warehouse import Warehouse, WarehouseSection, WarehouseRack
from app.schemas.product import ProductCreate, ProductResponse
from app.services.audit import log_action

router = APIRouter()

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr", "Company Admin", "Super Admin"]))
):
    """
    Register a new product in store inventory.
    """
    warehouse_name = None
    section_name = None
    rack_code = None
    
    if product_in.warehouse_id:
        warehouse = db.query(Warehouse).filter(
            Warehouse.id == product_in.warehouse_id,
            Warehouse.company_id == current_user.company_id
        ).first()
        if not warehouse:
            raise HTTPException(status_code=400, detail="Specified warehouse not found in your company.")
        warehouse_name = warehouse.name
        
    if product_in.section_id:
        section = db.query(WarehouseSection).filter(
            WarehouseSection.id == product_in.section_id,
            WarehouseSection.warehouse_id == product_in.warehouse_id
        ).first()
        if not section:
            raise HTTPException(status_code=400, detail="Specified section not found in this warehouse.")
        section_name = section.name
        
    if product_in.rack_id:
        rack = db.query(WarehouseRack).filter(
            WarehouseRack.id == product_in.rack_id,
            WarehouseRack.section_id == product_in.section_id
        ).first()
        if not rack:
            raise HTTPException(status_code=400, detail="Specified rack not found in this section.")
        rack_code = rack.code

    product = Product(
        company_id=current_user.company_id,
        product_number=product_in.product_number,
        name=product_in.name,
        description=product_in.description,
        price=product_in.price,
        weight_kg=product_in.weight_kg,
        dimensions=product_in.dimensions,
        quantity=product_in.quantity,
        warehouse_id=product_in.warehouse_id,
        section_id=product_in.section_id,
        rack_id=product_in.rack_id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_product",
        table_name="products",
        record_id=product.id,
        new_values={"product_number": product.product_number, "name": product.name}
    )
    
    res = ProductResponse.model_validate(product)
    res.warehouse_name = warehouse_name
    res.section_name = section_name
    res.rack_code = rack_code
    return res

@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all products in store inventory for the tenant.
    """
    products = db.query(Product).filter(Product.company_id == current_user.company_id).all()
    
    response_list = []
    for p in products:
        res = ProductResponse.model_validate(p)
        if p.warehouse:
            res.warehouse_name = p.warehouse.name
        if p.section:
            res.section_name = p.section.name
        if p.rack:
            res.rack_code = p.rack.code
        response_list.append(res)
        
    return response_list

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["Warehouse Mgr", "Company Admin", "Super Admin"]))
):
    """
    Remove a product from inventory.
    """
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
        
    db.delete(product)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user.id,
        action="delete_product",
        table_name="products",
        record_id=product_id,
        new_values={"product_number": product.product_number}
    )
    return
