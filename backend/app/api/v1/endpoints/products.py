from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.crud.product import (
    create_product,
    delete_product,
    get_product_by_id,
    get_product_by_id_or_slug,
    list_products,
    update_product,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import MessageResponse
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
def get_products(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên, SKU, thương hiệu"),
    category_id: Optional[int] = Query(None, description="Lọc theo danh mục"),
    category_slug: Optional[str] = Query(None, description="Lọc theo slug danh mục (laptop, dien-thoai, ...)"),
    brand: Optional[str] = Query(None, description="Lọc theo thương hiệu (Apple, Dell, Asus, ...)"),
    min_price: Optional[int] = Query(None, ge=0, description="Giá thấp nhất (VNĐ)"),
    max_price: Optional[int] = Query(None, ge=0, description="Giá cao nhất (VNĐ)"),
    sort_by: Optional[str] = Query(
        "latest",
        description="Sắp xếp: latest (mới nhất), price_asc (giá tăng), price_desc (giá giảm), name_asc (tên A-Z)",
    ),
    include_inactive: bool = Query(False, description="Bao gồm cả sản phẩm ngừng bán (dành cho Admin)"),
    is_active: Optional[bool] = Query(None, description="Lọc chính xác theo trạng thái hoạt động (True/False)"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    page_size: int = Query(20, ge=1, le=100, description="Số sản phẩm trên 1 trang"),
    db: Session = Depends(get_db),
):
    """Lấy danh sách sản phẩm phục vụ Storefront & Admin Portal (Public)."""
    items, total = list_products(
        db=db,
        search=search,
        category_id=category_id,
        category_slug=category_slug,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort_by,
        include_inactive=include_inactive,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_or_slug}", response_model=ProductResponse)
def get_product_detail(
    id_or_slug: str,
    db: Session = Depends(get_db),
):
    """Xem chi tiết sản phẩm theo ID hoặc Slug (Public)."""
    product = get_product_by_id_or_slug(db, id_or_slug)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sản phẩm không tồn tại",
        )
    return ProductResponse.model_validate(product)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Tạo mới sản phẩm (Yêu cầu Staff hoặc Admin)."""
    product = create_product(db, payload)
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_existing_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Cập nhật thông tin sản phẩm (Yêu cầu Staff hoặc Admin)."""
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sản phẩm không tồn tại",
        )

    updated = update_product(db, product, payload)
    return ProductResponse.model_validate(updated)


@router.delete("/{product_id}", response_model=MessageResponse)
def remove_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Xóa sản phẩm (Chỉ xóa được khi chưa phát sinh trong đơn hàng)."""
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sản phẩm không tồn tại",
        )

    delete_product(db, product)
    return MessageResponse(message=f"Đã xóa sản phẩm '{product.name}' thành công")

