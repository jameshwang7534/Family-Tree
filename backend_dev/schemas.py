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


# --- Profile Media ---

class ProfileMediaResponse(BaseModel):
    id: str
    treeId: str
    profileId: str
    fileUrl: str
    fileType: str
    caption: Optional[str] = None
    createdAt: str


# --- Profile Voice ---

class ProfileVoiceResponse(BaseModel):
    id: str
    treeId: str
    profileId: str
    fileUrl: str
    durationSeconds: Optional[float] = None
    createdAt: str


# --- Profile Stories ---

class ProfileStoryCreate(BaseModel):
    title: str
    mainText: str
    dateCreated: Optional[str] = None  # YYYY-MM-DD


class ProfileStoryUpdate(BaseModel):
    title: Optional[str] = None
    mainText: Optional[str] = None
    dateCreated: Optional[str] = None


class ProfileStoryResponse(BaseModel):
    id: str
    treeId: str
    profileId: str
    title: str
    dateCreated: str
    mainText: str
    createdAt: str
    updatedAt: str
