from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from schemas import RegisterPayload, LoginPayload, AuthResponse, UserResponse
from models import UserModel
from utils import generate_token, verify_token

router = APIRouter()

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify user ID from bearer token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        payload = verify_token(token)
        return payload["id"]
    except (ValueError, IndexError):
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterPayload):
    """Register a new user"""
    # Validate input
    if not payload.email or not payload.password or not payload.firstName or not payload.lastName:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    # Check if user exists
    existing_user = UserModel.find_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create user
    user = UserModel.create(
        email=payload.email,
        password=payload.password,
        firstName=payload.firstName,
        lastName=payload.lastName,
    )
    
    token = generate_token(user.id, user.email)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            firstName=user.firstName,
            lastName=user.lastName,
            createdAt=user.createdAt,
        ),
    )

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginPayload):
    """Login a user"""
    # Validate input
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    # Find user
    user = UserModel.find_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not UserModel.verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = generate_token(user.id, user.email)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            firstName=user.firstName,
            lastName=user.lastName,
            createdAt=user.createdAt,
        ),
    )

@router.post("/logout")
async def logout():
    """Logout a user"""
    # JWT tokens are stateless, logout typically happens on client side
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current user information"""
    user = UserModel.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        createdAt=user.createdAt,
    )
