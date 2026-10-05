from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import require_authenticated_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and email uniqueness check."""
    user = UserService.register_user(db=db, payload=payload)
    return {
        "success": True,
        "data": UserResponse.model_validate(user)
    }


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive JWT token"
)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate credentials and generate a signed JWT bearer token."""
    token_response = UserService.authenticate_user(db=db, payload=payload)
    return {
        "success": True,
        "data": token_response.model_dump()
    }


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Retrieve current user profile"
)
def get_current_user_profile(
    current_user: User = Depends(require_authenticated_user)
):
    """Retrieve profile of currently authenticated user via validated JWT."""
    return {
        "success": True,
        "data": UserResponse.model_validate(current_user)
    }
