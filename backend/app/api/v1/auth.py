from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any
from pydantic import BaseModel
import logging

from app.db.base import get_db
from app.models.user import User
from app.core import security
from app.api.v1 import deps

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# ─── Schemas ──────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
async def login(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    token = security.create_access_token(subject=user.id)
    logger.info(f"User logged in: {user.email} (role={user.role.value})")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role.value,
        "full_name": user.full_name or user.email,
    }

@router.post("/logout")
async def logout(current_user: User = Depends(deps.get_current_user)):
    """
    Stateless JWT logout.
    """
    logger.info(f"User {current_user.email} logged out")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=Any)
async def get_current_user_info(current_user: User = Depends(deps.get_current_user)):
    """
    Returns the currently authenticated user's profile.
    """
    return current_user
