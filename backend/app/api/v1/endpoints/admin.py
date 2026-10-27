from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.user import (
    get_user_by_id,
    list_users,
    revoke_all_user_tokens,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse
from app.schemas.user import (
    UserListResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ping")
def admin_ping(
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Sample guarded endpoint for Staff and Admin."""
    return {
        "message": "pong",
        "email": current_user.email,
        "role": current_user.role.value,
    }


@router.get("/users", response_model=UserListResponse)
def get_admin_users(
    search: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """List users for admin dashboard with search, filter, and pagination."""
    items, total = list_users(
        db=db,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )
    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Change a user's role. Revokes all active refresh tokens for that user immediately.
    Admin cannot change their own role.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự thay đổi vai trò của chính mình",
        )

    target_user = get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    # Changing role revokes all of user's refresh tokens
    revoke_all_user_tokens(db, target_user.id)

    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)
    return UserResponse.model_validate(target_user)


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def change_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Lock/unlock a user account.
    Locking sets is_active=False and revokes all refresh tokens immediately.
    Admin cannot lock themselves.
    """
    if user_id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự khóa tài khoản của chính mình",
        )

    target_user = get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    if not payload.is_active:
        # Locking user immediately revokes all of user's refresh tokens
        revoke_all_user_tokens(db, target_user.id)

    target_user.is_active = payload.is_active
    db.commit()
    db.refresh(target_user)
    return UserResponse.model_validate(target_user)
