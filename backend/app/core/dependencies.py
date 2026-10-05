from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import decode_access_token
from app.core.errors import UnauthorizedException, ForbiddenException
from app.models.user import User

# Optional bearer scheme so missing header can be explicitly handled with custom error code
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate bearer token from Authorization header and retrieve User from DB."""
    if credentials is None or not credentials.credentials:
        raise UnauthorizedException(
            message="Authentication credentials were not provided",
            code="MISSING_TOKEN"
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(
            message="Invalid token payload: missing subject",
            code="INVALID_TOKEN"
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise UnauthorizedException(
            message="Invalid token subject identifier",
            code="INVALID_TOKEN"
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise UnauthorizedException(
            message="User associated with token no longer exists",
            code="USER_NOT_FOUND"
        )

    return user


def require_authenticated_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the request is made by a verified, authenticated user."""
    return current_user


def require_admin(current_user: User = Depends(require_authenticated_user)) -> User:
    """Ensure the authenticated user holds the ADMIN role."""
    if current_user.role != "ADMIN":
        raise ForbiddenException(
            message="Administrative privileges required to perform this action",
            code="FORBIDDEN"
        )
    return current_user
