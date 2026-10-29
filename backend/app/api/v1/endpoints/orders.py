from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_optional_current_user
from app.crud.order import create_order, get_order_by_id, list_user_orders
from app.database import get_db
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderResponse,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Đặt hàng mới (Hỗ trợ cả khách vãng lai và khách hàng đã đăng nhập)."""
    user_id = current_user.id if current_user else None
    order = create_order(db=db, obj_in=payload, user_id=user_id)
    return OrderResponse.model_validate(order)


@router.get("/me", response_model=OrderListResponse)
def get_my_orders(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(20, ge=1, le=100, description="Số đơn hàng mỗi trang"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Xem lịch sử đơn hàng của tôi (Yêu cầu đăng nhập)."""
    items, total = list_user_orders(
        db=db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )
    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Xem chi tiết đơn hàng theo ID."""
    order = get_order_by_id(db, order_id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại",
        )

    # If user is logged in as normal customer and order has a user_id, check ownership
    if (
        current_user
        and current_user.role == "CUSTOMER"
        and order.user_id is not None
        and order.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem đơn hàng này",
        )

    return OrderResponse.model_validate(order)

