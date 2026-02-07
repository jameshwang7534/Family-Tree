from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    createdAt: datetime

class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class TreeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


class TreeResponse(BaseModel):
    id: str
    userId: str
    name: str
    description: Optional[str] = None
    iconUrl: str
    createdAt: str
    updatedAt: str
