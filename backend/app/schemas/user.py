from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    is_active: Optional[bool] = True
    is_verified: Optional[bool] = False
    role_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    company_id: Optional[UUID] = None
    role_id: UUID

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: UUID
    company_id: Optional[UUID] = None
    role_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass
