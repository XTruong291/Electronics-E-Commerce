from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.category import (
    create_category,
    delete_category,
    get_categories,
    get_category_by_id,
    get_category_by_slug,
    update_category,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import MessageResponse
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    include_inactive: bool = Query(False, description="Bao gồm cả danh mục ẩn (dành cho Admin)"),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các danh mục hàng hóa (Public)."""
    rows = get_categories(db, include_inactive=include_inactive)
    result = []
    for category, count in rows:
        item = CategoryResponse.model_validate(category)
        item.product_count = count
        result.append(item)
    return result


@router.get("/{id_or_slug}", response_model=CategoryResponse)
def get_category_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
):
    """Lấy chi tiết 1 danh mục theo ID hoặc Slug (Public)."""
    if id_or_slug.isdigit():
        category = get_category_by_id(db, int(id_or_slug))
    else:
        category = get_category_by_slug(db, id_or_slug)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không tồn tại",
        )

    res = CategoryResponse.model_validate(category)
    res.product_count = len(category.products) if category.products else 0
    return res


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Tạo mới danh mục sản phẩm (Yêu cầu Staff hoặc Admin)."""
    category = create_category(db, payload)
    res = CategoryResponse.model_validate(category)
    res.product_count = 0
    return res


@router.put("/{category_id}", response_model=CategoryResponse)
def update_existing_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Chỉnh sửa danh mục sản phẩm (Yêu cầu Staff hoặc Admin)."""
    category = get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không tồn tại",
        )

    updated = update_category(db, category, payload)
    res = CategoryResponse.model_validate(updated)
    res.product_count = len(updated.products) if updated.products else 0
    return res


@router.delete("/{category_id}", response_model=MessageResponse)
def remove_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Xóa danh mục sản phẩm (Chỉ xóa được khi không có sản phẩm nào thuộc danh mục)."""
    category = get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không tồn tại",
        )

    delete_category(db, category)
    return MessageResponse(message=f"Đã xóa danh mục '{category.name}' thành công")

