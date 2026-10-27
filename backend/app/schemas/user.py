from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole
from app.schemas.auth import UserResponse


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserAddressCreate(BaseModel):
    recipient: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str
    is_default: bool = False


class UserAddressUpdate(BaseModel):
    recipient: Optional[str] = None
    phone: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    detail: Optional[str] = None
    is_default: Optional[bool] = None


class UserAddressResponse(BaseModel):
    id: int
    user_id: int
    recipient: str
    phone: str
    province: str
    district: str
    ward: str
    detail: str
    is_default: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
