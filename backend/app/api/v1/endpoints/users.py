from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.crud.user import (
    create_user_address,
    delete_user_address,
    get_user_address_by_id,
    get_user_addresses,
    update_user_address,
    update_user_profile,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse, UserResponse
from app.schemas.user import (
    UserAddressCreate,
    UserAddressResponse,
    UserAddressUpdate,
    UserProfileUpdate,
)
from app.services.cloudinary import upload_image

router = APIRouter(prefix="/users", tags=["Users"])

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update user personal information (name, phone)."""
    user = update_user_profile(
        db,
        current_user,
        full_name=payload.full_name,
        phone=payload.phone,
    )
    return UserResponse.model_validate(user)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload user avatar to Cloudinary (max 5MB, JPG/PNG/WebP)."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP",
        )

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước tệp vượt quá giới hạn cho phép (tối đa 5MB)",
        )

    try:
        avatar_url = upload_image(
            file_bytes=content,
            folder="avatars",
            public_id=f"user_{current_user.id}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải ảnh lên: {str(exc)}",
        )

    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ------------ Address Book Endpoints ------------


@router.get("/me/addresses", response_model=List[UserAddressResponse])
def list_my_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all saved addresses of current user."""
    addresses = get_user_addresses(db, current_user.id)
    return [UserAddressResponse.model_validate(a) for a in addresses]


@router.post(
    "/me/addresses",
    response_model=UserAddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_address(
    payload: UserAddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new delivery address."""
    addr = create_user_address(
        db=db,
        user_id=current_user.id,
        recipient=payload.recipient,
        phone=payload.phone,
        province=payload.province,
        district=payload.district,
        ward=payload.ward,
        detail=payload.detail,
        is_default=payload.is_default,
    )
    return UserAddressResponse.model_validate(addr)


@router.patch("/me/addresses/{address_id}", response_model=UserAddressResponse)
def update_address(
    address_id: int,
    payload: UserAddressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update existing delivery address."""
    address = get_user_address_by_id(db, address_id, current_user.id)
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Địa chỉ không tồn tại",
        )

    updated = update_user_address(
        db=db,
        address=address,
        recipient=payload.recipient,
        phone=payload.phone,
        province=payload.province,
        district=payload.district,
        ward=payload.ward,
        detail=payload.detail,
        is_default=payload.is_default,
    )
    return UserAddressResponse.model_validate(updated)


@router.delete("/me/addresses/{address_id}", response_model=MessageResponse)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a delivery address."""
    address = get_user_address_by_id(db, address_id, current_user.id)
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Địa chỉ không tồn tại",
        )

    delete_user_address(db, address)
    return MessageResponse(message="Xóa địa chỉ thành công")
