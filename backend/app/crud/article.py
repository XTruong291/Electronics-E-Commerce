from typing import List, Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.utils import generate_slug
from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleUpdate


def generate_unique_article_slug(
    db: Session,
    title: str,
    custom_slug: Optional[str] = None,
    exclude_id: Optional[int] = None,
) -> str:
    """Generate a unique URL slug from title or custom_slug with collision handling."""
    base_slug = generate_slug(custom_slug) if custom_slug and custom_slug.strip() else generate_slug(title)
    if not base_slug:
        base_slug = "bai-viet-cong-nghe"

    slug = base_slug
    counter = 1

    while True:
        query = db.query(Article).filter(Article.slug == slug)
        if exclude_id is not None:
            query = query.filter(Article.id != exclude_id)
        existing = query.first()
        if not existing:
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"


def get_article_by_id(db: Session, article_id: int) -> Optional[Article]:
    return (
        db.query(Article)
        .options(joinedload(Article.author))
        .filter(Article.id == article_id)
        .first()
    )


def get_article_by_slug(db: Session, slug: str) -> Optional[Article]:
    return (
        db.query(Article)
        .options(joinedload(Article.author))
        .filter(Article.slug == slug.strip().lower())
        .first()
    )


def get_article_detail(
    db: Session,
    id_or_slug: str,
    increment_view: bool = False,
    is_staff_or_admin: bool = False,
) -> Optional[Article]:
    """Retrieve an article by numeric ID or slug.
    If is_staff_or_admin is False, only return published articles.
    If increment_view is True, increments view_count by 1.
    """
    clean_val = id_or_slug.strip()
    query = db.query(Article).options(joinedload(Article.author))

    if clean_val.isdigit():
        query = query.filter(Article.id == int(clean_val))
    else:
        query = query.filter(Article.slug == clean_val.lower())

    if not is_staff_or_admin:
        query = query.filter(Article.is_published == True)  # noqa: E712

    article = query.first()
    if not article:
        return None

    if increment_view and not is_staff_or_admin:
        article.view_count += 1
        db.commit()
        db.refresh(article)

    return article


def list_articles(
    db: Session,
    search: Optional[str] = None,
    topic: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_published: Optional[bool] = None,
    include_unpublished: bool = False,
    page: int = 1,
    page_size: int = 10,
) -> Tuple[List[Article], int]:
    """List articles with filtering, search and pagination."""
    query = db.query(Article).options(joinedload(Article.author))

    # Permissions constraint: regular users only see published articles
    if not include_unpublished:
        query = query.filter(Article.is_published == True)  # noqa: E712
    elif is_published is not None:
        query = query.filter(Article.is_published == is_published)

    if topic and topic.strip():
        query = query.filter(Article.topic == topic.strip())

    if is_featured is not None:
        query = query.filter(Article.is_featured == is_featured)

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Article.title.ilike(s),
                Article.summary.ilike(s),
                Article.topic.ilike(s),
            )
        )

    total = query.count()
    items = (
        query.order_by(Article.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def create_article(
    db: Session,
    obj_in: ArticleCreate,
    author_id: Optional[int] = None,
) -> Article:
    """Create a new article with an auto-generated unique slug."""
    slug = generate_unique_article_slug(db, title=obj_in.title, custom_slug=obj_in.slug)
    db_article = Article(
        title=obj_in.title.strip(),
        slug=slug,
        topic=obj_in.topic.strip(),
        summary=obj_in.summary.strip(),
        content=obj_in.content.strip(),
        thumbnail_url=obj_in.thumbnail_url.strip() if obj_in.thumbnail_url else None,
        author_id=author_id,
        is_featured=obj_in.is_featured,
        is_published=obj_in.is_published,
        view_count=0,
    )
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article


def update_article(
    db: Session,
    article: Article,
    obj_in: ArticleUpdate,
) -> Article:
    """Update an existing article.
    CRITICAL RULE: Does NOT change existing slug when only title changes,
    unless `obj_in.slug` is explicitly provided and non-empty.
    """
    if obj_in.title is not None:
        article.title = obj_in.title.strip()

    # Only update slug if explicitly specified
    if obj_in.slug is not None and obj_in.slug.strip():
        new_slug = generate_unique_article_slug(
            db,
            title=article.title,
            custom_slug=obj_in.slug.strip(),
            exclude_id=article.id,
        )
        article.slug = new_slug

    if obj_in.topic is not None:
        article.topic = obj_in.topic.strip()

    if obj_in.summary is not None:
        article.summary = obj_in.summary.strip()

    if obj_in.content is not None:
        article.content = obj_in.content.strip()

    if obj_in.thumbnail_url is not None:
        article.thumbnail_url = obj_in.thumbnail_url.strip() if obj_in.thumbnail_url else None

    if obj_in.is_featured is not None:
        article.is_featured = obj_in.is_featured

    if obj_in.is_published is not None:
        article.is_published = obj_in.is_published

    db.commit()
    db.refresh(article)
    return article


def delete_article(db: Session, article: Article) -> None:
    """Delete an article."""
    db.delete(article)
    db.commit()

