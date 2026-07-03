from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/token"
)

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == token_data.sub).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Check if company subscription is suspended (Super Admin bypasses)
    if user.company_id:
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company and company.subscription_status == "suspended":
            from app.models.role import Role
            role = db.query(Role).filter(Role.id == user.role_id).first()
            if not role or role.name != "Super Admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Subscription suspended. Please contact platform support."
                )
            
    return user

def check_role(allowed_roles: List[str]):
    def role_dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        from app.models.role import Role
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        role_name = role.name if role else "No Role"
        if role_name in ["Company Admin", "Super Admin"]:
            return current_user
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Access restricted to roles: {', '.join(allowed_roles)} (Your role: {role_name})"
            )
        return current_user
    return role_dependency
