"""
Authentication endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.core.auth import verify_password, get_password_hash, create_access_token
from app.db.database import get_db

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


class UserRegister(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str
    full_name: str
    organization: Optional[str] = None


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=TokenResponse)
async def register(user: UserRegister, db = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.user.find_unique(where={"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user.password)
    new_user = await db.user.create(
        data={
            "email": user.email,
            "hashedPassword": hashed_password,
            "fullName": user.full_name,
            "organization": user.organization
        }
    )
    
    # Generate token
    access_token = create_access_token(data={"sub": new_user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.fullName,
            "organization": new_user.organization
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    """Login with email and password"""
    # Find user
    user = await db.user.find_unique(where={"email": form_data.username})
    if not user or not verify_password(form_data.password, user.hashedPassword):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.fullName,
            "organization": user.organization
        }
    )


@router.get("/me")
async def get_current_user_info(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    """Get current user information"""
    from app.core.auth import get_current_user
    from app.models.user import User
    
    # This will decode the token and get the user
    current_user = await get_current_user(token)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "organization": current_user.organization
    }


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Logout current user"""
    # TODO: Invalidate token (add to blacklist if needed)
    return {"status": "logged_out"}


class OAuthSyncRequest(BaseModel):
    """OAuth sync request from NextAuth"""
    email: EmailStr
    name: str
    provider: str
    provider_id: str


@router.post("/oauth-sync", response_model=TokenResponse)
async def oauth_sync(data: OAuthSyncRequest, db = Depends(get_db)):
    """
    Sync OAuth user with database.
    Creates user if doesn't exist, or returns existing user.
    Called by NextAuth after OAuth sign in.
    """
    # Check if user exists
    existing_user = await db.user.find_unique(where={"email": data.email})
    
    if existing_user:
        # User exists, generate token
        access_token = create_access_token(data={"sub": existing_user.id})
        return TokenResponse(
            access_token=access_token,
            user={
                "id": existing_user.id,
                "email": existing_user.email,
                "full_name": existing_user.fullName,
                "organization": existing_user.organization
            }
        )
    
    # Create new user (no password for OAuth users)
    import secrets
    random_password = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(random_password)
    
    new_user = await db.user.create(
        data={
            "email": data.email,
            "hashedPassword": hashed_password,
            "fullName": data.name,
            "organization": None
        }
    )
    
    # Generate token
    access_token = create_access_token(data={"sub": new_user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.fullName,
            "organization": new_user.organization
        }
    )
