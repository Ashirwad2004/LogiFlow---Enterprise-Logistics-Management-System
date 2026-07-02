from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.customer import Customer as CustomerModel
from app.schemas.customer import Customer, CustomerCreate

router = APIRouter()

@router.get("/", response_model=List[Customer])
def read_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve all customers belonging to the logged-in user's company.
    """
    customers = db.query(CustomerModel).filter(
        CustomerModel.company_id == current_user.company_id
    ).all()
    return customers

@router.post("/", response_model=Customer, status_code=status.HTTP_201_CREATED)
def create_customer(
    *,
    db: Session = Depends(get_db),
    customer_in: CustomerCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Create a new customer under the current user's company.
    """
    existing = db.query(CustomerModel).filter(CustomerModel.email == customer_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer with this email is already registered."
        )
    
    db_customer = CustomerModel(
        company_id=current_user.company_id,
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        billing_address=customer_in.billing_address,
        shipping_address=customer_in.shipping_address
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer
