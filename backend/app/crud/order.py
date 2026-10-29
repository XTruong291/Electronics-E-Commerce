from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderCreate


def create_order(
    db: Session,
    obj_in: OrderCreate,
    user_id: Optional[int] = None,
) -> Order:
    """Create an order with inventory check, stock deduction, and price snapshotting."""
    if not obj_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng phải chứa ít nhất 1 sản phẩm",
        )

    order_items: List[OrderItem] = []
    total_amount: int = 0

    for item_in in obj_in.items:
        product = (
            db.query(Product)
            .filter(Product.id == item_in.product_id)
            .with_for_update()
            .first()
        )

        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sản phẩm ID {item_in.product_id} không tồn tại hoặc đã ngừng kinh doanh",
            )

        if product.stock < item_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sản phẩm '{product.name}' chỉ còn {product.stock} trong kho, không đủ số lượng đặt ({item_in.quantity})",
            )

        # Calculate unit price based on promotions
        unit_price = (
            product.sale_price
            if (product.sale_price is not None and product.sale_price > 0)
            else product.price
        )

        # Deduct inventory
        product.stock -= item_in.quantity

        # Create OrderItem snapshot
        order_item = OrderItem(
            product_id=product.id,
            product_name=product.name,
            product_image=product.thumbnail_url,
            unit_price=unit_price,
            quantity=item_in.quantity,
        )
        order_items.append(order_item)
        total_amount += unit_price * item_in.quantity

    # Create Order
    order = Order(
        user_id=user_id,
        recipient_name=obj_in.recipient_name.strip(),
        recipient_phone=obj_in.recipient_phone.strip(),
        shipping_address=obj_in.shipping_address.strip(),
        note=obj_in.note.strip() if obj_in.note else None,
        total_amount=total_amount,
        payment_method=obj_in.payment_method.strip(),
        status=OrderStatus.PENDING,
        items=order_items,
    )

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_order_by_id(db: Session, order_id: int) -> Optional[Order]:
    """Retrieve order with eager loaded items."""
    return (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )


def list_user_orders(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Order], int]:
    """Retrieve orders placed by a specific user."""
    query = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user_id)
        .order_by(Order.id.desc())
    )
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def list_admin_orders(
    db: Session,
    order_status: Optional[OrderStatus] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Order], int]:
    """Retrieve orders for admin management with filters and search."""
    query = db.query(Order).options(joinedload(Order.items))

    if order_status:
        query = query.filter(Order.status == order_status)

    if search:
        s = f"%{search.strip()}%"
        if search.strip().isdigit():
            query = query.filter(
                or_(
                    Order.id == int(search.strip()),
                    Order.recipient_phone.ilike(s),
                    Order.recipient_name.ilike(s),
                )
            )
        else:
            query = query.filter(
                or_(
                    Order.recipient_name.ilike(s),
                    Order.recipient_phone.ilike(s),
                    Order.shipping_address.ilike(s),
                )
            )

    query = query.order_by(Order.id.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_order_status(
    db: Session,
    order: Order,
    new_status: OrderStatus,
) -> Order:
    """Update order status. Automatically restores stock when cancelling."""
    if order.status == new_status:
        return order

    # Disallow transitioning out of terminal states
    if order.status in (OrderStatus.CANCELLED, OrderStatus.DELIVERED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể thay đổi trạng thái khi đơn hàng đã ở trạng thái {order.status.value}",
        )

    # Restock inventory if cancelled
    if new_status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        for item in order.items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )
            if product:
                product.stock += item.quantity

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order

