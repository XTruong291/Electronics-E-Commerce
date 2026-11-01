from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import require_roles
from app.models.user import User, UserRole
from app.services.cloudinary import upload_image

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class UploadResponse(BaseModel):
    url: str


@router.post("/image", response_model=UploadResponse)
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Tải lên hình ảnh sản phẩm (Cloudinary). Yêu cầu Staff hoặc Admin (Tối đa 5MB, JPG/PNG/WebP)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng ảnh không hợp lệ. Chỉ chấp nhận định dạng JPG, PNG hoặc WebP",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kích thước tệp vượt quá giới hạn cho phép (tối đa 5MB)",
        )

    try:
        url = upload_image(file_bytes=content, folder="products")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải ảnh lên dịch vụ Cloudinary: {str(exc)}",
        )

    return UploadResponse(url=url)

