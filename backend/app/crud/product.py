from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.utils import generate_slug
from app.models.category import Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ProductView
from app.schemas.product import (
    BehaviorAnalyticsSummaryResponse,
    ProductAnalyticsItem,
    ProductCreate,
    ProductUpdate,
)


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    return (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )


def get_product_by_slug(db: Session, slug: str) -> Optional[Product]:
    return (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.slug == slug.strip().lower())
        .first()
    )


def get_product_by_id_or_slug(db: Session, id_or_slug: str) -> Optional[Product]:
    """Retrieve product either by numeric ID or by unique slug string."""
    query = db.query(Product).options(joinedload(Product.category))
    if id_or_slug.isdigit():
        prod = query.filter(Product.id == int(id_or_slug)).first()
        if prod:
            return prod
    return query.filter(Product.slug == id_or_slug.strip().lower()).first()


def get_product_by_sku(db: Session, sku: str) -> Optional[Product]:
    return db.query(Product).filter(Product.sku == sku.strip()).first()


def _ensure_unique_product_slug(
    db: Session, base_slug: str, exclude_id: Optional[int] = None
) -> str:
    slug = base_slug
    counter = 1
    while True:
        query = db.query(Product).filter(Product.slug == slug)
        if exclude_id:
            query = query.filter(Product.id != exclude_id)
        if not query.first():
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"


def list_products(
    db: Session,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    sort_by: Optional[str] = None,
    include_inactive: bool = False,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Product], int]:
    """Query products with filters, search, sorting and pagination."""
    query = db.query(Product).options(joinedload(Product.category))

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    elif not include_inactive:
        query = query.filter(Product.is_active == True)  # noqa: E712

    if category_slug:
        query = query.join(Product.category).filter(Category.slug == category_slug.strip().lower())
    elif category_id:
        query = query.filter(Product.category_id == category_id)

    if brand:
        query = query.filter(Product.brand.ilike(brand.strip()))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.sku.ilike(s),
                Product.brand.ilike(s),
                Product.description.ilike(s),
            )
        )

    # Use effective price: sale_price if present else price
    if min_price is not None:
        query = query.filter(
            or_(
                (Product.sale_price.isnot(None) & (Product.sale_price >= min_price)),
                (Product.sale_price.is_(None) & (Product.price >= min_price)),
            )
        )

    if max_price is not None:
        query = query.filter(
            or_(
                (Product.sale_price.isnot(None) & (Product.sale_price <= max_price)),
                (Product.sale_price.is_(None) & (Product.price <= max_price)),
            )
        )

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort_by == "name_asc":
        query = query.order_by(Product.name.asc())
    elif sort_by == "views_desc":
        query = query.order_by(Product.view_count.desc())
    else:  # default 'latest'
        query = query.order_by(Product.id.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_product(db: Session, obj_in: ProductCreate) -> Product:
    # 1. Validate Category exists
    category = db.query(Category).filter(Category.id == obj_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Danh mục có ID {obj_in.category_id} không tồn tại",
        )

    # 2. Validate SKU is unique
    existing_sku = get_product_by_sku(db, obj_in.sku)
    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã SKU '{obj_in.sku}' đã được sử dụng bởi sản phẩm khác",
        )

    # 3. Generate unique slug
    raw_slug = obj_in.slug.strip() if obj_in.slug else generate_slug(obj_in.name)
    if not raw_slug:
        raw_slug = "product"
    slug = _ensure_unique_product_slug(db, raw_slug)

    product = Product(
        category_id=obj_in.category_id,
        name=obj_in.name.strip(),
        slug=slug,
        sku=obj_in.sku.strip(),
        brand=obj_in.brand.strip(),
        price=obj_in.price,
        sale_price=obj_in.sale_price,
        stock=obj_in.stock,
        thumbnail_url=obj_in.thumbnail_url.strip() if obj_in.thumbnail_url else None,
        images=obj_in.images or [],
        specifications=obj_in.specifications or {},
        description=obj_in.description.strip() if obj_in.description else None,
        is_active=obj_in.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(
    db: Session,
    product: Product,
    obj_in: ProductUpdate,
) -> Product:
    if obj_in.category_id is not None and obj_in.category_id != product.category_id:
        cat = db.query(Category).filter(Category.id == obj_in.category_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Danh mục có ID {obj_in.category_id} không tồn tại",
            )
        product.category_id = obj_in.category_id

    if obj_in.sku is not None and obj_in.sku.strip() != product.sku:
        existing_sku = (
            db.query(Product)
            .filter(Product.sku == obj_in.sku.strip(), Product.id != product.id)
            .first()
        )
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã SKU '{obj_in.sku}' đã được sử dụng",
            )
        product.sku = obj_in.sku.strip()

    if obj_in.name is not None:
        product.name = obj_in.name.strip()

    if obj_in.slug is not None:
        slug_candidate = generate_slug(obj_in.slug.strip())
        product.slug = _ensure_unique_product_slug(
            db, slug_candidate, exclude_id=product.id
        )

    if obj_in.brand is not None:
        product.brand = obj_in.brand.strip()

    if obj_in.price is not None:
        product.price = obj_in.price

    if obj_in.sale_price is not None:
        product.sale_price = obj_in.sale_price

    if obj_in.stock is not None:
        product.stock = obj_in.stock

    if obj_in.thumbnail_url is not None:
        product.thumbnail_url = (
            obj_in.thumbnail_url.strip() if obj_in.thumbnail_url else None
        )

    if obj_in.images is not None:
        product.images = obj_in.images

    if obj_in.specifications is not None:
        product.specifications = obj_in.specifications

    if obj_in.description is not None:
        product.description = (
            obj_in.description.strip() if obj_in.description else None
        )

    if obj_in.is_active is not None:
        product.is_active = obj_in.is_active

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    order_items_count = (
        db.query(OrderItem).filter(OrderItem.product_id == product.id).count()
    )
    if order_items_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa sản phẩm đã có trong các đơn hàng đã đặt. Hãy chuyển trạng thái sản phẩm sang ngưng bán (is_active=False).",
        )

    db.delete(product)
    db.commit()


def increment_product_view(
    db: Session,
    product: Product,
    user_id: Optional[int] = None,
) -> int:
    product.view_count = (product.view_count or 0) + 1
    view_entry = ProductView(
        product_id=product.id,
        user_id=user_id,
    )
    db.add(view_entry)
    db.commit()
    db.refresh(product)
    return product.view_count


def get_product_behavior_analytics(
    db: Session,
    days: Optional[int] = None,
    min_views: int = 5,
    max_conversion_rate: float = 10.0,
    limit: int = 10,
) -> BehaviorAnalyticsSummaryResponse:
    since_date = None
    if days is not None and days > 0:
        since_date = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. Fetch all products with category
    products = db.query(Product).options(joinedload(Product.category)).all()
    if not products:
        return BehaviorAnalyticsSummaryResponse(
            total_products=0,
            total_views=0,
            total_orders_with_items=0,
            total_units_sold=0,
            overall_conversion_rate=0.0,
            high_view_low_purchase_items=[],
            top_viewed_items=[],
            top_converted_items=[],
        )

    # 2. Query views per product
    views_map: dict[int, int] = {}
    if since_date is not None:
        view_counts = (
            db.query(ProductView.product_id, func.count(ProductView.id))
            .filter(ProductView.viewed_at >= since_date)
            .group_by(ProductView.product_id)
            .all()
        )
        for pid, cnt in view_counts:
            views_map[pid] = cnt
    else:
        for p in products:
            views_map[p.id] = p.view_count or 0

    # 3. Query order purchases per product (status != CANCELLED)
    order_query = (
        db.query(
            OrderItem.product_id,
            func.count(func.distinct(Order.id)).label("order_count"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(OrderItem.unit_price * OrderItem.quantity), 0).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != OrderStatus.CANCELLED)
    )
    if since_date is not None:
        order_query = order_query.filter(Order.created_at >= since_date)
    order_stats = order_query.group_by(OrderItem.product_id).all()

    orders_map: dict[int, dict] = {}
    for pid, ord_cnt, units, rev in order_stats:
        orders_map[pid] = {
            "order_count": int(ord_cnt or 0),
            "units_sold": int(units or 0),
            "revenue": int(rev or 0),
        }

    # 4. Build items list
    items: List[ProductAnalyticsItem] = []
    total_views = 0
    total_units_sold = 0
    distinct_order_ids_query = (
        db.query(func.count(func.distinct(Order.id)))
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(Order.status != OrderStatus.CANCELLED)
    )
    if since_date is not None:
        distinct_order_ids_query = distinct_order_ids_query.filter(Order.created_at >= since_date)
    total_orders_with_items = distinct_order_ids_query.scalar() or 0

    for p in products:
        v_count = views_map.get(p.id, 0)
        total_views += v_count

        ord_info = orders_map.get(p.id, {"order_count": 0, "units_sold": 0, "revenue": 0})
        o_count = ord_info["order_count"]
        u_sold = ord_info["units_sold"]
        rev = ord_info["revenue"]
        total_units_sold += u_sold

        if v_count > 0:
            cr = round(min(100.0, (o_count / v_count) * 100), 2)
        else:
            cr = 0.0

        hint = None
        if v_count >= min_views and cr <= max_conversion_rate:
            if p.stock <= 0:
                hint = "Hết hàng tồn kho"
            elif not p.sale_price or p.sale_price >= p.price:
                hint = "Chưa có giá khuyến mãi"
            else:
                hint = "Cần tối ưu giá / mô tả"

        category_name = p.category.name if p.category else None
        item = ProductAnalyticsItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            sku=p.sku,
            brand=p.brand,
            category_name=category_name,
            price=p.price,
            sale_price=p.sale_price,
            stock=p.stock,
            thumbnail_url=p.thumbnail_url,
            is_active=p.is_active,
            view_count=v_count,
            order_count=o_count,
            units_sold=u_sold,
            revenue=rev,
            conversion_rate=cr,
            diagnostic_hint=hint,
        )
        items.append(item)

    overall_conversion_rate = 0.0
    if total_views > 0:
        overall_conversion_rate = round(min(100.0, (total_orders_with_items / total_views) * 100), 2)

    # 5. Extract segments
    high_view_low_purchase_candidates = [
        it for it in items
        if it.view_count >= min_views and it.conversion_rate <= max_conversion_rate
    ]
    high_view_low_purchase_candidates.sort(
        key=lambda x: (-x.view_count, x.conversion_rate, x.units_sold)
    )
    high_view_low_purchase_items = high_view_low_purchase_candidates[:limit]

    top_viewed_candidates = sorted(items, key=lambda x: -x.view_count)
    top_viewed_items = top_viewed_candidates[:limit]

    top_converted_candidates = [it for it in items if it.view_count >= 1]
    top_converted_candidates.sort(key=lambda x: (-x.conversion_rate, -x.units_sold, -x.view_count))
    top_converted_items = top_converted_candidates[:limit]

    return BehaviorAnalyticsSummaryResponse(
        total_products=len(products),
        total_views=total_views,
        total_orders_with_items=total_orders_with_items,
        total_units_sold=total_units_sold,
        overall_conversion_rate=overall_conversion_rate,
        high_view_low_purchase_items=high_view_low_purchase_items,
        top_viewed_items=top_viewed_items,
        top_converted_items=top_converted_items,
    )

