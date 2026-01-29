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
