from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from app.models.analytics import UserEvent
from app.models.article import Article
from app.models.category import Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    BrandInterestItem,
    CategoryInterestItem,
    ConversionFunnelSummary,
    HighDropoffProductItem,
    SearchKeywordItem,
    SlowMovingProductItem,
    TopSellingProductItem,
    UserEventCreate,
)


def record_event(
    db: Session,
    event_in: UserEventCreate,
    user_id: Optional[int] = None,
) -> UserEvent:
    """Ghi nhận sự kiện hành vi người dùng vào cơ sở dữ liệu."""
    cat_id = event_in.category_id

    # Nếu có product_id nhưng chưa có category_id, tự động lấy từ product
    if event_in.product_id and not cat_id:
        prod = db.query(Product.category_id).filter(Product.id == event_in.product_id).first()
        if prod:
            cat_id = prod.category_id

    event = UserEvent(
        user_id=user_id,
        session_id=event_in.session_id,
        event_type=event_in.event_type.strip().upper(),
        product_id=event_in.product_id,
        category_id=cat_id,
        search_query=event_in.search_query.strip() if event_in.search_query else None,
        metadata_json=event_in.metadata_json,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_analytics_overview(db: Session, days: int = 30) -> AnalyticsOverviewResponse:
    """Truy vấn tổng hợp Phễu chuyển đổi, Sản phẩm bỏ giỏ, Danh mục & Từ khóa."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. TỔNG QUAN PHỄU CHUYỂN ĐỔI (CONVERSION FUNNEL)
    total_views = (
        db.query(func.count(UserEvent.id))
        .filter(UserEvent.event_type == "PRODUCT_VIEW", UserEvent.created_at >= start_date)
        .scalar()
        or 0
    )

    total_cart_adds = (
        db.query(func.count(UserEvent.id))
        .filter(UserEvent.event_type == "ADD_TO_CART", UserEvent.created_at >= start_date)
        .scalar()
        or 0
    )

    total_orders = (
        db.query(func.count(Order.id))
        .filter(Order.status != OrderStatus.CANCELLED, Order.created_at >= start_date)
        .scalar()
        or 0
    )

    view_to_cart_pct = round((total_cart_adds / total_views * 100), 1) if total_views > 0 else 0.0
    cart_to_order_pct = round((total_orders / total_cart_adds * 100), 1) if total_cart_adds > 0 else 0.0
    overall_conversion_pct = round((total_orders / total_views * 100), 1) if total_views > 0 else 0.0

    funnel = ConversionFunnelSummary(
        total_views=total_views,
        total_cart_adds=total_cart_adds,
        total_orders=total_orders,
        view_to_cart_pct=view_to_cart_pct,
        cart_to_order_pct=cart_to_order_pct,
        overall_conversion_pct=overall_conversion_pct,
    )

    # 2. SẢN PHẨM QUAN TÂM CAO NHƯNG TỶ LỆ BỎ GIỎ LỚN (HIGH DROPOFF PRODUCTS)
    # Lấy views và cart_adds theo từng sản phẩm
    prod_event_stats = (
        db.query(
            UserEvent.product_id,
            func.sum(case((UserEvent.event_type == "PRODUCT_VIEW", 1), else_=0)).label("views"),
            func.sum(case((UserEvent.event_type == "ADD_TO_CART", 1), else_=0)).label("cart_adds"),
        )
        .filter(
            UserEvent.product_id.isnot(None),
            UserEvent.event_type.in_(["PRODUCT_VIEW", "ADD_TO_CART"]),
            UserEvent.created_at >= start_date,
        )
        .group_by(UserEvent.product_id)
        .all()
    )

    # Lấy units_sold từ đơn hàng không hủy trong khoảng thời gian
    sold_stats = (
        db.query(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("units_sold"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.status != OrderStatus.CANCELLED,
            Order.created_at >= start_date,
        )
        .group_by(OrderItem.product_id)
        .all()
    )
    sold_dict = {item.product_id: int(item.units_sold or 0) for item in sold_stats}

    high_dropoff_list: List[HighDropoffProductItem] = []
    product_ids = [item.product_id for item in prod_event_stats]

    if product_ids:
        products = (
            db.query(Product, Category.name.label("category_name"))
            .join(Category, Product.category_id == Category.id)
            .filter(Product.id.in_(product_ids))
            .all()
        )
        prod_map = {p.Product.id: (p.Product, p.category_name) for p in products}

        for item in prod_event_stats:
            p_id = item.product_id
            if p_id not in prod_map:
                continue

            prod, cat_name = prod_map[p_id]
            views = int(item.views or 0)
            cart_adds = int(item.cart_adds or 0)
            units_sold = sold_dict.get(p_id, 0)

            # Tính dropoff rate: nếu có thêm giỏ nhưng không mua
            if cart_adds > 0:
                dropoff_rate = max(0.0, min(100.0, round(((cart_adds - units_sold) / cart_adds * 100), 1)))
            elif views > 15 and units_sold == 0:
                dropoff_rate = 100.0
            else:
                dropoff_rate = 0.0

            # Phân loại trạng thái
            if cart_adds >= 5 and units_sold <= 1 and dropoff_rate >= 75.0:
                status_flag = "HIGH_DROPOFF"
            elif cart_adds >= 2 or views >= 20:
                status_flag = "CONSIDERING"
            else:
                status_flag = "HEALTHY"

            high_dropoff_list.append(
                HighDropoffProductItem(
                    product_id=prod.id,
                    product_name=prod.name,
                    thumbnail_url=prod.thumbnail_url,
                    category_name=cat_name or "Chung",
                    brand=prod.brand or "Khác",
                    price=int(prod.price),
                    sale_price=int(prod.sale_price) if prod.sale_price else None,
                    views=views,
                    cart_adds=cart_adds,
                    units_sold=units_sold,
                    dropoff_rate_pct=dropoff_rate,
                    status_flag=status_flag,
                )
            )

        # Sắp xếp: Ưu tiên HIGH_DROPOFF trước, sau đó theo số lượt cart_adds và views giảm dần
        def sort_key(x: HighDropoffProductItem):
            flag_score = 3 if x.status_flag == "HIGH_DROPOFF" else (2 if x.status_flag == "CONSIDERING" else 1)
            return (flag_score, x.cart_adds, x.views)

        high_dropoff_list.sort(key=sort_key, reverse=True)
        high_dropoff_list = high_dropoff_list[:10]

    # 2b. TOP SẢN PHẨM BÁN CHẠY NHẤT (TOP SELLING PRODUCTS / BEST SELLERS)
    top_selling_stats = (
        db.query(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.count(func.distinct(Order.id)).label("order_count"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("gross_revenue"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.status != OrderStatus.CANCELLED,
            Order.created_at >= start_date,
        )
        .group_by(OrderItem.product_id)
        .order_by(desc("units_sold"), desc("gross_revenue"))
        .limit(10)
        .all()
    )

    top_selling_list: List[TopSellingProductItem] = []
    top_selling_pids = [item.product_id for item in top_selling_stats]
    if top_selling_pids:
        top_prods = (
            db.query(Product, Category.name.label("category_name"))
            .join(Category, Product.category_id == Category.id)
            .filter(Product.id.in_(top_selling_pids))
            .all()
        )
        top_prod_map = {p.Product.id: (p.Product, p.category_name) for p in top_prods}
        for item in top_selling_stats:
            p_id = item.product_id
            if p_id not in top_prod_map:
                continue
            prod, cat_name = top_prod_map[p_id]
            top_selling_list.append(
                TopSellingProductItem(
                    product_id=prod.id,
                    product_name=prod.name,
                    sku=prod.sku or f"SKU-{prod.id}",
                    thumbnail_url=prod.thumbnail_url,
                    category_name=cat_name or "Chung",
                    brand=prod.brand or "Khác",
                    price=int(prod.price),
                    sale_price=int(prod.sale_price) if prod.sale_price else None,
                    units_sold=int(item.units_sold or 0),
                    order_count=int(item.order_count or 0),
                    gross_revenue=int(item.gross_revenue or 0),
                    current_stock=int(prod.stock or 0),
                )
            )

    # 2c. SẢN PHẨM TỒN KHO LÂU NGÀY / CHẬM BÁN (SLOW MOVING & DEAD STOCK)
    # Lấy toàn bộ sản phẩm đang kích hoạt có tồn kho > 0
    active_stock_prods = (
        db.query(Product, Category.name.label("category_name"))
        .join(Category, Product.category_id == Category.id)
        .filter(
            Product.is_active == True,
            Product.stock > 0,
        )
        .all()
    )

    # Lấy ngày bán gần nhất (all-time) của các sản phẩm
    last_orders = (
        db.query(
            OrderItem.product_id,
            func.max(Order.created_at).label("last_sold_date"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.status != OrderStatus.CANCELLED)
        .group_by(OrderItem.product_id)
        .all()
    )
    last_sold_dict = {item.product_id: item.last_sold_date for item in last_orders}

    # Lấy số lượt xem trong kỳ của các sản phẩm
    views_period_stats = (
        db.query(
            UserEvent.product_id,
            func.count(UserEvent.id).label("views_count"),
        )
        .filter(
            UserEvent.product_id.isnot(None),
            UserEvent.event_type == "PRODUCT_VIEW",
            UserEvent.created_at >= start_date,
        )
        .group_by(UserEvent.product_id)
        .all()
    )
    views_period_dict = {item.product_id: int(item.views_count or 0) for item in views_period_stats}

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    slow_moving_list: List[SlowMovingProductItem] = []

    for p_tuple in active_stock_prods:
        prod, cat_name = p_tuple.Product, p_tuple.category_name
        current_stock = int(prod.stock or 0)
        unit_val = int(prod.sale_price if prod.sale_price else prod.price)
        inventory_val = current_stock * unit_val

        units_sold_period = sold_dict.get(prod.id, 0)
        views_period = views_period_dict.get(prod.id, 0)

        # Tính days_in_stock với chuẩn hóa Timezone tuyệt đối an toàn
        last_sold = last_sold_dict.get(prod.id)
        ref_date = last_sold if last_sold else prod.created_at
        if ref_date:
            ref_naive = ref_date.replace(tzinfo=None) if hasattr(ref_date, "replace") else ref_date
            days_in_stock = max(0, (now_naive - ref_naive).days)
        else:
            days_in_stock = 0

        # Phân loại trạng thái
        if units_sold_period == 0 and (days_in_stock >= 30 or current_stock >= 10):
            aging_status = "DEAD_STOCK"
        else:
            aging_status = "SLOW_MOVING"

        slow_moving_list.append(
            SlowMovingProductItem(
                product_id=prod.id,
                product_name=prod.name,
                sku=prod.sku or f"SKU-{prod.id}",
                thumbnail_url=prod.thumbnail_url,
                category_name=cat_name or "Chung",
                brand=prod.brand or "Khác",
                price=int(prod.price),
                sale_price=int(prod.sale_price) if prod.sale_price else None,
                current_stock=current_stock,
                inventory_value=inventory_val,
                units_sold_period=units_sold_period,
                views_period=views_period,
                days_in_stock=days_in_stock,
                aging_status=aging_status,
            )
        )

    # Sắp xếp: Ưu tiên units_sold_period == 0 lên trước, sau đó đến days_in_stock giảm dần, inventory_value giảm dần
    def slow_sort_key(x: SlowMovingProductItem):
        return (1 if x.units_sold_period == 0 else 0, x.days_in_stock, x.inventory_value)

    slow_moving_list.sort(key=slow_sort_key, reverse=True)
    slow_moving_list = slow_moving_list[:10]

    # 3. MỨC ĐỘ QUAN TÂM THEO DANH MỤC (CATEGORY INTEREST)
    cat_query = (
        db.query(
            UserEvent.category_id,
            Category.name.label("category_name"),
            func.count(UserEvent.id).label("total_interactions"),
        )
        .join(Category, UserEvent.category_id == Category.id)
        .filter(
            UserEvent.category_id.isnot(None),
            UserEvent.created_at >= start_date,
        )
        .group_by(UserEvent.category_id, Category.name)
        .order_by(desc("total_interactions"))
        .limit(6)
        .all()
    )

    total_cat_interactions = sum(int(c.total_interactions or 0) for c in cat_query) or 1
    category_interest = [
        CategoryInterestItem(
            category_id=c.category_id,
            category_name=c.category_name,
            total_interactions=int(c.total_interactions or 0),
            percentage=round((int(c.total_interactions or 0) / total_cat_interactions * 100), 1),
        )
        for c in cat_query
    ]

    # 4. MỨC ĐỘ QUAN TÂM THEO THƯƠNG HIỆU (BRAND INTEREST)
    brand_query = (
        db.query(
            Product.brand,
            func.count(UserEvent.id).label("total_interactions"),
        )
        .join(Product, UserEvent.product_id == Product.id)
        .filter(
            Product.brand.isnot(None),
            UserEvent.created_at >= start_date,
        )
        .group_by(Product.brand)
        .order_by(desc("total_interactions"))
        .limit(6)
        .all()
    )

    total_brand_interactions = sum(int(b.total_interactions or 0) for b in brand_query) or 1
    brand_interest = [
        BrandInterestItem(
            brand=b.brand,
            total_interactions=int(b.total_interactions or 0),
            percentage=round((int(b.total_interactions or 0) / total_brand_interactions * 100), 1),
        )
        for b in brand_query
    ]

    # 5. TOP TỪ KHÓA TÌM KIẾM (TOP SEARCH KEYWORDS)
    search_query = (
        db.query(
            func.lower(func.trim(UserEvent.search_query)).label("keyword"),
            func.count(UserEvent.id).label("search_count"),
        )
        .filter(
            UserEvent.event_type == "SEARCH",
            UserEvent.search_query.isnot(None),
            UserEvent.search_query != "",
            UserEvent.created_at >= start_date,
        )
        .group_by(func.lower(func.trim(UserEvent.search_query)))
        .order_by(desc("search_count"))
        .limit(10)
        .all()
    )

    top_search_keywords = [
        SearchKeywordItem(
            keyword=s.keyword.capitalize(),
            search_count=int(s.search_count or 0),
        )
        for s in search_query
    ]

    # Tổng số events ghi nhận trong kỳ
    total_events_recorded = (
        db.query(func.count(UserEvent.id))
        .filter(UserEvent.created_at >= start_date)
        .scalar()
        or 0
    )

    return AnalyticsOverviewResponse(
        days=days,
        funnel=funnel,
        high_dropoff_products=high_dropoff_list,
        top_selling_products=top_selling_list,
        slow_moving_products=slow_moving_list,
        category_interest=category_interest,
        brand_interest=brand_interest,
        top_search_keywords=top_search_keywords,
        total_events_recorded=total_events_recorded,
    )


def build_store_grounding_context(
    db: Session,
    days: int = 30,
    user_question: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Xây dựng kho tri thức Grounding trích xuất trực tiếp từ cơ sở dữ liệu MySQL (Hybrid SQL Grounding):
    1. Base Snapshot:
       - Phân tách rõ ràng:
         * delivered_revenue (đơn đã giao DELIVERED thành công)
         * total_valid_order_revenue (tất cả đơn hợp lệ status != CANCELLED)
       - Số lượng đơn theo từng trạng thái (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED) & tỷ lệ hủy
       - Funnel: total_views, total_cart_adds, total_orders, conversion rates
       - Top 10 Bán chạy nhất (Best Sellers)
       - Top 10 Bỏ giỏ cao (High Drop-off)
       - Top 10 Tồn kho đọng vốn (Dead Stock / Slow Moving)
       - Tóm tắt danh mục toàn bộ sản phẩm trong kho (id, name, sku, brand, category, price, sale_price, stock, units_sold, views, days_in_stock)
    2. Dynamic Retrieval:
       - Khớp từ khóa trong user_question để nạp sâu:
         * Specs & 5 đơn hàng gần nhất của sản phẩm/thương hiệu khớp tên
         * 15 đơn hàng gần nhất nếu hỏi về đơn hàng/khách hàng/hủy đơn
         * Danh sách bài viết tin tức nếu hỏi về blog/bài viết
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    data_sources_used = ["products", "orders", "user_events"]

    # 1. Doanh thu & Trạng thái Đơn hàng
    delivered_revenue = (
        db.query(func.sum(Order.total_amount))
        .filter(Order.status == OrderStatus.DELIVERED, Order.created_at >= start_date)
        .scalar()
        or 0
    )

    total_valid_order_revenue = (
        db.query(func.sum(Order.total_amount))
        .filter(Order.status != OrderStatus.CANCELLED, Order.created_at >= start_date)
        .scalar()
        or 0
    )

    order_status_counts_raw = (
        db.query(Order.status, func.count(Order.id))
        .filter(Order.created_at >= start_date)
        .group_by(Order.status)
        .all()
    )
    order_status_counts = {
        st.value if hasattr(st, "value") else str(st): int(count or 0)
        for st, count in order_status_counts_raw
    }
    total_orders_all_statuses = sum(order_status_counts.values()) or 0
    cancelled_orders = order_status_counts.get("CANCELLED", 0)
    cancelled_rate_pct = (
        round((cancelled_orders / total_orders_all_statuses * 100), 1)
        if total_orders_all_statuses > 0
        else 0.0
    )

    # 2. Lấy Overview tổng hợp (Phễu, Top lists, Tồn đọng)
    overview = get_analytics_overview(db=db, days=days)

    # 3. Tóm tắt toàn bộ danh mục sản phẩm đang kinh doanh
    sold_dict = {p.product_id: p.units_sold for p in overview.top_selling_products}
    dropoff_sold_dict = {p.product_id: p.units_sold for p in overview.high_dropoff_products}
    slow_sold_dict = {p.product_id: p.units_sold_period for p in overview.slow_moving_products}
    all_sold_dict = {**dropoff_sold_dict, **slow_sold_dict, **sold_dict}

    views_dict = {p.product_id: p.views for p in overview.high_dropoff_products}
    slow_views_dict = {p.product_id: p.views_period for p in overview.slow_moving_products}
    all_views_dict = {**slow_views_dict, **views_dict}

    days_in_stock_dict = {p.product_id: p.days_in_stock for p in overview.slow_moving_products}

    all_prods = (
        db.query(Product, Category.name.label("category_name"))
        .join(Category, Product.category_id == Category.id)
        .filter(Product.is_active == True)
        .all()
    )

    product_catalog_summary = []
    for p_tuple in all_prods:
        p, c_name = p_tuple.Product, p_tuple.category_name
        p_id = p.id
        days_in_stock = days_in_stock_dict.get(p_id)
        if days_in_stock is None:
            if p.created_at:
                p_created = (
                    p.created_at.replace(tzinfo=None)
                    if hasattr(p.created_at, "replace")
                    else p.created_at
                )
                days_in_stock = max(0, (now_naive - p_created).days)
            else:
                days_in_stock = 0

        product_catalog_summary.append({
            "id": p_id,
            "name": p.name,
            "sku": p.sku,
            "brand": p.brand,
            "category": c_name,
            "price": int(p.price),
            "sale_price": int(p.sale_price) if p.sale_price else None,
            "stock": int(p.stock or 0),
            "units_sold": all_sold_dict.get(p_id, 0),
            "views": all_views_dict.get(p_id, 0),
            "days_in_stock": days_in_stock,
        })

    # 4. TẦNG DYNAMIC QUERY RETRIEVAL THEO USER QUESTION
    matched_products = []
    recent_orders = []
    articles_summary = []
    matched_entities = []

    if user_question:
        q_clean = user_question.lower()

        # A. Kiểm tra nhắc tới sản phẩm, SKU hoặc thương hiệu cụ thể
        for p_tuple in all_prods:
            p, c_name = p_tuple.Product, p_tuple.category_name
            p_name_lower = p.name.lower()
            p_sku_lower = (p.sku or "").lower()
            p_brand_lower = (p.brand or "").lower()

            is_match = False
            if p_sku_lower and p_sku_lower in q_clean:
                is_match = True
            elif p_name_lower in q_clean:
                is_match = True
            elif p_brand_lower and len(p_brand_lower) >= 3 and p_brand_lower in q_clean:
                is_match = True
            else:
                # Kiểm tra các từ khóa nhận dạng tiêu biểu
                for part in p_name_lower.split():
                    if len(part) >= 4 and part in q_clean:
                        is_match = True
                        break

            if is_match and len(matched_products) < 5:
                matched_entities.append(p.name)
                # Lấy 5 đơn hàng gần nhất chứa sản phẩm này
                recent_sales_raw = (
                    db.query(OrderItem, Order.created_at, Order.status)
                    .join(Order, OrderItem.order_id == Order.id)
                    .filter(OrderItem.product_id == p.id)
                    .order_by(desc(Order.created_at))
                    .limit(5)
                    .all()
                )
                recent_sales = [
                    {
                        "order_id": itm.OrderItem.order_id,
                        "quantity": itm.OrderItem.quantity,
                        "unit_price": int(itm.OrderItem.unit_price),
                        "status": (
                            itm.status.value
                            if hasattr(itm.status, "value")
                            else str(itm.status)
                        ),
                        "created_at": str(itm.created_at)[:19] if itm.created_at else None,
                    }
                    for itm in recent_sales_raw
                ]

                matched_products.append({
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "brand": p.brand,
                    "category": c_name,
                    "price": int(p.price),
                    "sale_price": int(p.sale_price) if p.sale_price else None,
                    "stock": int(p.stock or 0),
                    "specifications": p.specifications or {},
                    "description": (p.description or "")[:200],
                    "recent_orders_sample": recent_sales,
                })

        # B. Kiểm tra nhắc tới Đơn hàng, Hủy đơn, Vận chuyển, Khách hàng
        order_triggers = [
            "đơn hàng", "don hang", "hủy", "huy", "order", "cancel",
            "khách hàng", "khach hang", "giao hàng", "giao hang", "ship",
            "thanh toán", "thanh toan"
        ]
        if any(trig in q_clean for trig in order_triggers):
            orders_raw = (
                db.query(Order)
                .order_by(desc(Order.created_at))
                .limit(15)
                .all()
            )
            for o in orders_raw:
                items_summary = [
                    {
                        "name": it.product_name,
                        "quantity": it.quantity,
                        "price": int(it.unit_price),
                    }
                    for it in o.items
                ]
                recent_orders.append({
                    "order_id": o.id,
                    "recipient_name": o.recipient_name,
                    "status": (
                        o.status.value
                        if hasattr(o.status, "value")
                        else str(o.status)
                    ),
                    "total_amount": int(o.total_amount),
                    "payment_method": o.payment_method,
                    "created_at": str(o.created_at)[:19] if o.created_at else None,
                    "items": items_summary,
                })

        # C. Kiểm tra nhắc tới Bài viết công nghệ, Blog, Tin tức
        article_triggers = [
            "bài viết", "bai viet", "tin tức", "tin tuc", "blog",
            "công nghệ", "cong nghe", "sforum", "tin tức công nghệ"
        ]
        if any(trig in q_clean for trig in article_triggers):
            if "articles" not in data_sources_used:
                data_sources_used.append("articles")
            arts_raw = db.query(Article).order_by(desc(Article.view_count)).limit(10).all()
            articles_summary = [
                {
                    "id": a.id,
                    "title": a.title,
                    "topic": a.topic,
                    "view_count": a.view_count,
                    "is_published": a.is_published,
                    "created_at": str(a.created_at)[:10] if a.created_at else None,
                }
                for a in arts_raw
            ]

    return {
        "metadata": {
            "days": days,
            "data_sources_used": data_sources_used,
            "matched_entities": matched_entities,
        },
        "revenue_and_orders": {
            "delivered_revenue": int(delivered_revenue),
            "total_valid_order_revenue": int(total_valid_order_revenue),
            "order_status_counts": order_status_counts,
            "total_orders_in_period": total_orders_all_statuses,
            "cancelled_orders": cancelled_orders,
            "cancelled_rate_pct": cancelled_rate_pct,
        },
        "conversion_funnel": {
            "total_views": overview.funnel.total_views,
            "total_cart_adds": overview.funnel.total_cart_adds,
            "total_orders": overview.funnel.total_orders,
            "view_to_cart_pct": overview.funnel.view_to_cart_pct,
            "cart_to_order_pct": overview.funnel.cart_to_order_pct,
            "overall_conversion_pct": overview.funnel.overall_conversion_pct,
        },
        "top_selling_products": [
            {
                "id": p.product_id,
                "name": p.product_name,
                "sku": p.sku,
                "brand": p.brand,
                "category": p.category_name,
                "units_sold": p.units_sold,
                "order_count": p.order_count,
                "gross_revenue": p.gross_revenue,
                "current_stock": p.current_stock,
            }
            for p in overview.top_selling_products[:10]
        ],
        "high_dropoff_products": [
            {
                "id": p.product_id,
                "name": p.product_name,
                "brand": p.brand,
                "category": p.category_name,
                "price": p.price,
                "views": p.views,
                "cart_adds": p.cart_adds,
                "units_sold": p.units_sold,
                "dropoff_rate_pct": p.dropoff_rate_pct,
                "status": p.status_flag,
            }
            for p in overview.high_dropoff_products[:10]
        ],
        "slow_moving_and_dead_stock": [
            {
                "id": p.product_id,
                "name": p.product_name,
                "sku": p.sku,
                "brand": p.brand,
                "category": p.category_name,
                "current_stock": p.current_stock,
                "inventory_value": p.inventory_value,
                "days_in_stock": p.days_in_stock,
                "units_sold_period": p.units_sold_period,
                "aging_status": p.aging_status,
            }
            for p in overview.slow_moving_products[:10]
        ],
        "category_interest": [
            {"category": c.category_name, "percentage": c.percentage}
            for c in overview.category_interest
        ],
        "brand_interest": [
            {"brand": b.brand, "percentage": b.percentage}
            for b in overview.brand_interest
        ],
        "top_search_keywords": [
            {"keyword": s.keyword, "count": s.search_count}
            for s in overview.top_search_keywords
        ],
        "product_catalog_summary": product_catalog_summary,
        "dynamic_retrieval": {
            "matched_products": matched_products,
            "recent_orders": recent_orders,
            "articles_summary": articles_summary,
        },
    }

