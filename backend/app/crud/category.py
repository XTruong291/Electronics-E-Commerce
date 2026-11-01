from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.utils import generate_slug
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate


def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
    return db.query(Category).filter(Category.id == category_id).first()


def get_category_by_slug(db: Session, slug: str) -> Optional[Category]:
    return db.query(Category).filter(Category.slug == slug.strip().lower()).first()


def get_categories(
    db: Session,
    include_inactive: bool = False,
) -> List[Tuple[Category, int]]:
    """List categories with product count."""
    query = (
        db.query(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, Category.id == Product.category_id)
        .group_by(Category.id)
    )

    if not include_inactive:
        query = query.filter(Category.is_active == True)  # noqa: E712

    results = query.order_by(Category.id.asc()).all()
    return [(row[0], row[1]) for row in results]


def _ensure_unique_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    """Ensure slug is unique in categories table."""
    slug = base_slug
    counter = 1
    while True:
        query = db.query(Category).filter(Category.slug == slug)
        if exclude_id:
            query = query.filter(Category.id != exclude_id)
        if not query.first():
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"


def create_category(db: Session, obj_in: CategoryCreate) -> Category:
    raw_slug = obj_in.slug.strip() if obj_in.slug else generate_slug(obj_in.name)
    if not raw_slug:
        raw_slug = "category"
    slug = _ensure_unique_slug(db, raw_slug)

    category = Category(
        name=obj_in.name.strip(),
        slug=slug,
        description=obj_in.description.strip() if obj_in.description else None,
        is_active=obj_in.is_active,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session,
    category: Category,
    obj_in: CategoryUpdate,
) -> Category:
    if obj_in.name is not None:
        category.name = obj_in.name.strip()

    if obj_in.slug is not None:
        slug_candidate = generate_slug(obj_in.slug.strip())
        category.slug = _ensure_unique_slug(db, slug_candidate, exclude_id=category.id)
    elif obj_in.name is not None and not category.slug:
        slug_candidate = generate_slug(obj_in.name.strip())
        category.slug = _ensure_unique_slug(db, slug_candidate, exclude_id=category.id)

    if obj_in.description is not None:
        category.description = obj_in.description.strip() if obj_in.description else None

    if obj_in.is_active is not None:
        category.is_active = obj_in.is_active

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    product_count = (
        db.query(Product).filter(Product.category_id == category.id).count()
    )
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa danh mục đang chứa {product_count} sản phẩm. Hãy chuyển hoặc xóa các sản phẩm trước.",
        )

    db.delete(category)
    db.commit()

