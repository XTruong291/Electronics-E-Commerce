from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import Date, case, cast, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.category import Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
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


def cancel_customer_order(
    db: Session,
    order_id: int,
    user_id: int,
    is_admin_or_staff: bool = False,
) -> Order:
    """Allow customer to cancel their own order if it is in PENDING status. Restocks products."""
    order = get_order_by_id(db, order_id=order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại",
        )

    if order.user_id != user_id and not is_admin_or_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền hủy đơn hàng này",
        )

    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xác nhận",
        )

    return update_order_status(db, order, OrderStatus.CANCELLED)


def get_dashboard_stats(db: Session, days: int = 7) -> dict:
    """Aggregate revenue, orders, daily timeline and counts for Admin Dashboard."""
    # 1. Total delivered revenue
    delivered_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status == OrderStatus.DELIVERED)
        .scalar()
    ) or 0

    # 2. In-flight / pending revenue (orders being fulfilled, not cancelled)
    pending_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(
            Order.status.in_(
                [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPING]
            )
        )
        .scalar()
    ) or 0

    # 3. Total orders and breakdown by status
    total_orders = db.query(Order).count()
    status_counts_raw = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    status_counts = {
        "PENDING": 0,
        "CONFIRMED": 0,
        "SHIPPING": 0,
        "DELIVERED": 0,
        "CANCELLED": 0,
    }
    for st, count in status_counts_raw:
        st_val = st.value if hasattr(st, "value") else str(st)
        if st_val in status_counts:
            status_counts[st_val] = count

    # 4. Daily timeline for recent `days`
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days - 1)).date()

    daily_rows = (
        db.query(
            cast(Order.created_at, Date).label("order_date"),
            func.coalesce(
                func.sum(
                    case(
                        (Order.status != OrderStatus.CANCELLED, Order.total_amount),
                        else_=0,
                    )
                ),
                0,
            ).label("revenue"),
            func.count(Order.id).label("order_count"),
        )
        .filter(cast(Order.created_at, Date) >= start_date)
        .group_by(cast(Order.created_at, Date))
        .all()
    )

    daily_dict = {
        row.order_date: (int(row.revenue), int(row.order_count))
        for row in daily_rows
    }

    daily_stats = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        rev, cnt = daily_dict.get(d, (0, 0))
        daily_stats.append({
            "date": d.strftime("%d/%m"),
            "revenue": rev,
            "order_count": cnt,
        })

    # 5. Recent 5 orders
    recent_orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.id.desc())
        .limit(5)
        .all()
    )

    # 6. Entity totals
    total_products = db.query(Product).count()
    total_categories = db.query(Category).count()
    total_users = db.query(User).count()

    return {
        "total_revenue": int(delivered_revenue),
        "pending_revenue": int(pending_revenue),
        "total_orders": total_orders,
        "orders_by_status": status_counts,
        "daily_stats": daily_stats,
        "recent_orders": recent_orders,
        "total_products": total_products,
        "total_categories": total_categories,
        "total_users": total_users,
    }
