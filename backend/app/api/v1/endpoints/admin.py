from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.models.user import User, UserRole

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
