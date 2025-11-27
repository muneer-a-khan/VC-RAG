"""
User model
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class User(BaseModel):
    """User model"""
    id: str
    email: EmailStr
    full_name: str
    organization: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

