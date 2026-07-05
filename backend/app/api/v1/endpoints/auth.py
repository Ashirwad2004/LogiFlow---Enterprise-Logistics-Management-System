from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.company import Company
from app.models.user import User
from app.models.role import Role
from app.schemas.token import Token
from app.schemas.user import User as UserSchema
from app.schemas.company import CompanyUpdate, CompanyResponse
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_password_reset_token
)
from pydantic import BaseModel, EmailStr, field_validator
from datetime import timedelta
from app.core.config import settings
import re

router = APIRouter()

def validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
        raise ValueError("Password must contain at least one special character.")
    return value

class UserRegister(BaseModel):
    company_name: str
    admin_name: str
    admin_email: EmailStr
    admin_password: str

    @field_validator("admin_password")
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        return validate_password_strength(v)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

def assign_default_permissions_to_role(db: Session, role: Role):
    from app.models.permission import Permission
    
    role_permissions_map = {
        "Super Admin": [
            "shipment:create", "shipment:read", "shipment:update", "shipment:delete",
            "driver:assign", "vehicle:assign", "warehouse:manage", "warehouse:read",
            "tracking:update", "billing:manage", "billing:read", "reports:view",
            "company:manage", "user:manage"
        ],
        "Company Admin": [
            "shipment:create", "shipment:read", "shipment:update", "shipment:delete",
            "driver:assign", "vehicle:assign", "warehouse:manage", "warehouse:read",
            "tracking:update", "billing:manage", "billing:read", "reports:view",
            "company:manage", "user:manage"
        ],
        "Dispatcher": [
            "shipment:create", "shipment:read", "shipment:update", "driver:assign",
            "warehouse:read", "reports:view"
        ],
        "Warehouse Mgr": [
            "warehouse:manage", "warehouse:read", "shipment:read"
        ],
        "Driver": [
            "shipment:read", "tracking:update"
        ],
        "Accountant": [
            "billing:manage", "billing:read", "reports:view"
        ],
        "Customer": [
            "shipment:create", "shipment:read"
        ]
    }
    
    perms_to_assign = role_permissions_map.get(role.name, [])
    for p_name in perms_to_assign:
        perm = db.query(Permission).filter(Permission.name == p_name).first()
        if not perm:
            desc = p_name.replace(":", " ").capitalize()
            perm = Permission(name=p_name, description=desc)
            db.add(perm)
            db.commit()
            db.refresh(perm)
        
        if perm not in role.permissions:
            role.permissions.append(perm)
            
    db.add(role)
    db.commit()
    db.refresh(role)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_company_and_admin(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.admin_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create Company
    company = Company(name=data.company_name)
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Create Role (Company Admin)
    role = Role(company_id=company.id, name="Company Admin", description="Admin for the company")
    db.add(role)
    db.commit()
    db.refresh(role)
    
    assign_default_permissions_to_role(db, role)
    
    # Create User
    user = User(
        company_id=company.id,
        role_id=role.id,
        email=data.admin_email,
        full_name=data.admin_name,
        hashed_password=get_password_hash(data.admin_password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "company_id": str(company.id),
        "admin_id": str(user.id),
        "message": "Company and administrator registered successfully."
    }

@router.post("/token", response_model=Token)
def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Audit log login action
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=user.id,
        action="user_login",
        table_name="users",
        record_id=user.id,
        new_values={
            "email": user.email,
            "ip": request.client.host if request.client else "127.0.0.1"
        }
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/refresh", response_model=Token)
def refresh_access_token(
    data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    from jose import jwt, JWTError
    from pydantic import ValidationError
    from app.schemas.token import TokenPayload
    try:
        payload = jwt.decode(
            data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate refresh token",
        )
        
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    
    # Audit log token refresh
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=user.id,
        action="token_refresh",
        table_name="users",
        record_id=user.id,
        new_values={
            "email": user.email,
            "ip": request.client.host if request.client else "127.0.0.1"
        }
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": role.name if role else "No Role",
        "company": {
            "id": company.id if company else None,
            "name": company.name if company else None,
            "legal_name": company.legal_name if company else None,
            "gst_number": company.gst_number if company else None,
            "support_email": company.support_email if company else None,
            "invoice_prefix": company.invoice_prefix if company else None,
            "tax_rate": float(company.tax_rate) if company and company.tax_rate else 18.00,
            "currency": company.currency if company else "USD",
            "base_rate": float(company.base_rate) if company and company.base_rate is not None else 50.00,
            "rate_per_kg": float(company.rate_per_kg) if company and company.rate_per_kg is not None else 0.50,
            "address": company.address if company else None
        },
        "permissions": [p.name for p in role.permissions] if role else []
    }

@router.put("/company", response_model=CompanyResponse)
def update_company(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update company profile configurations (restricted to Company Admin / Super Admin).
    """
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role or role.name not in ["Company Admin", "Super Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify company configurations."
        )
        
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
        
    old_values = {
        "name": company.name,
        "legal_name": company.legal_name,
        "gst_number": company.gst_number,
        "support_email": company.support_email,
        "invoice_prefix": company.invoice_prefix,
        "tax_rate": float(company.tax_rate) if company.tax_rate else 18.00,
        "currency": company.currency,
        "base_rate": float(company.base_rate) if company.base_rate is not None else 50.00,
        "rate_per_kg": float(company.rate_per_kg) if company.rate_per_kg is not None else 0.50,
        "address": company.address,
        "is_e_invoice_enabled": company.is_e_invoice_enabled
    }
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
        
    db.add(company)
    db.commit()
    db.refresh(company)
    
    new_values = {
        "name": company.name,
        "legal_name": company.legal_name,
        "gst_number": company.gst_number,
        "support_email": company.support_email,
        "invoice_prefix": company.invoice_prefix,
        "tax_rate": float(company.tax_rate) if company.tax_rate else 18.00,
        "currency": company.currency,
        "base_rate": float(company.base_rate) if company.base_rate is not None else 50.00,
        "rate_per_kg": float(company.rate_per_kg) if company.rate_per_kg is not None else 0.50,
        "address": company.address,
        "is_e_invoice_enabled": company.is_e_invoice_enabled
    }
    
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="update_company",
        table_name="companies",
        record_id=company.id,
        old_values=old_values,
        new_values=new_values
    )
    
    return company

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {
            "success": True,
            "message": "If the email is registered, a password reset link has been generated."
        }
    token = create_password_reset_token(data.email)
    return {
        "success": True,
        "message": "If the email is registered, a password reset link has been generated.",
        "debug_token": token
    }

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_password_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    
    # Audit log password reset
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=user.id,
        action="password_reset",
        table_name="users",
        record_id=user.id,
        new_values={"email": user.email}
    )
    
    return {
        "success": True,
        "message": "Password reset successfully"
    }

class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role_name: str

    @field_validator("password")
    @classmethod
    def validate_user_password(cls, v: str) -> str:
        return validate_password_strength(v)

@router.get("/users", response_model=List[UserSchema])
def list_company_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all users belonging to the company.
    """
    results = db.query(User, Role.name).join(Role, User.role_id == Role.id).filter(
        User.company_id == current_user.company_id
    ).all()
    
    users = []
    for user, role_name in results:
        user.role_name = role_name
        users.append(user)
    return users

@router.post("/users", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_company_user(data: UserCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new user account within the company workspace.
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    role = db.query(Role).filter(Role.company_id == current_user.company_id, Role.name == data.role_name).first()
    if not role:
        role = Role(company_id=current_user.company_id, name=data.role_name, description=f"{data.role_name} role")
        db.add(role)
        db.commit()
        db.refresh(role)
        assign_default_permissions_to_role(db, role)
        
    user = User(
        company_id=current_user.company_id,
        role_id=role.id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log user creation
    from app.services.audit import log_action
    log_action(
        db=db,
        user_id=current_user.id,
        action="create_user",
        table_name="users",
        record_id=user.id,
        new_values={"email": user.email, "role": role.name}
    )
    
    user.role_name = role.name
    return user