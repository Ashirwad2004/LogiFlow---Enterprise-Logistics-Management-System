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
    import requests
    email = None
    
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.SUPABASE_ANON_KEY
        }
        try:
            url = f"{settings.SUPABASE_URL}/auth/v1/user"
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                user_data = resp.json()
                email = user_data.get("email")
        except Exception as e:
            print(f"Supabase auth check failed: {e}")
            
    if not email:
        # Fallback to custom JWT decoding
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            token_data = TokenPayload(**payload)
            # Find email from user id
            db_user = db.query(User).filter(User.id == token_data.sub).first()
            if db_user:
                email = db_user.email
        except (JWTError, ValidationError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.models.company import Company
    from app.models.role import Role

    result = db.query(User, Company, Role).outerjoin(
        Company, User.company_id == Company.id
    ).join(
        Role, User.role_id == Role.id
    ).filter(User.email == email).first()

    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    user, company, role = result
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    user.role_name = role.name if role else "No Role"
        
    # Check if company subscription is suspended (Super Admin bypasses)
    if company and company.subscription_status == "suspended":
        if user.role_name != "Super Admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription suspended. Please contact platform support."
            )
            
    return user

def check_role(allowed_roles: List[str]):
    def role_dependency(current_user: User = Depends(get_current_user)):
        role_name = current_user.role_name
        if role_name in ["Company Admin", "Super Admin"]:
            return current_user
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Access restricted to roles: {', '.join(allowed_roles)} (Your role: {role_name})"
            )
        return current_user
    return role_dependency
