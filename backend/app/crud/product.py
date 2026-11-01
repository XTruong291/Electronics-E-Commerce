from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.utils import generate_slug
from app.models.category import Category
from app.models.order import OrderItem
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


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

