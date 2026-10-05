from datetime import timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ConflictException, UnauthorizedException, NotFoundException
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse


class UserService:
    @staticmethod
    def register_user(db: Session, payload: UserRegister, role: str = "USER") -> User:
        # Check if email is already registered
        existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
        if existing_user:
            raise ConflictException(
                message=f"An account with email '{payload.email}' already exists",
                code="EMAIL_ALREADY_EXISTS"
            )

        hashed = hash_password(payload.password)
        user = User(
            name=payload.name.strip(),
            email=payload.email.lower().strip(),
            password_hash=hashed,
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate_user(db: Session, payload: UserLogin) -> TokenResponse:
        user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedException(
                message="Invalid email or password",
                code="INVALID_CREDENTIALS"
            )

        # Generate JWT
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        }
        token = create_access_token(token_data, expires_delta=expires_delta)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user)
        )

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException(
                message=f"User with ID {user_id} not found",
                code="USER_NOT_FOUND"
            )
        return user
