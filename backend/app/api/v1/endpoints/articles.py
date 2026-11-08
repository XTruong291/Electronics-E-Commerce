from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user, require_roles
from app.crud.article import (
    create_article,
    delete_article,
    get_article_by_id,
    get_article_detail,
    list_articles,
    update_article,
)
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.article import (
    ArticleCreate,
    ArticleListResponse,
    ArticleResponse,
    ArticleUpdate,
)
from app.schemas.auth import MessageResponse

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.get("", response_model=ArticleListResponse)
def get_articles(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tiêu đề, chủ đề hoặc tóm tắt"),
    topic: Optional[str] = Query(None, description="Lọc theo chủ đề"),
    is_featured: Optional[bool] = Query(None, description="Lọc bài viết tâm điểm"),
    is_published: Optional[bool] = Query(None, description="Lọc bài viết theo trạng thái xuất bản (chỉ Staff/Admin)"),
    include_unpublished: bool = Query(False, description="Bao gồm cả bản nháp (chỉ Staff/Admin)"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(10, ge=1, le=100, description="Kích thước trang"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Lấy danh sách bài viết công nghệ.
    Khách thường chỉ xem được bài đã xuất bản (is_published=True).
    Chỉ khi đăng nhập quyền STAFF hoặc ADMIN mới được phép xem bản nháp.
    """
    is_staff_or_admin = (
        current_user is not None
        and str(getattr(current_user, "role", "")).upper() in ("STAFF", "ADMIN", "USERROLE.STAFF", "USERROLE.ADMIN")
    )

    can_see_unpublished = is_staff_or_admin and (include_unpublished or is_published is not None)

    items, total = list_articles(
        db=db,
        search=search,
        topic=topic,
        is_featured=is_featured,
        is_published=is_published if is_staff_or_admin else True,
        include_unpublished=can_see_unpublished,
        page=page,
        page_size=page_size,
    )

    return ArticleListResponse(
        items=[ArticleResponse.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id_or_slug}", response_model=ArticleResponse)
def get_article_by_id_or_slug(
    id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Xem chi tiết bài viết theo Slug hoặc ID.
    Tự động tăng view_count khi khách đọc bài (không tăng khi Staff/Admin truy cập).
    Khách thường không thể xem bài viết ở dạng bản nháp (is_published=False).
    """
    is_staff_or_admin = (
        current_user is not None
        and str(getattr(current_user, "role", "")).upper() in ("STAFF", "ADMIN", "USERROLE.STAFF", "USERROLE.ADMIN")
    )

    article = get_article_detail(
        db=db,
        id_or_slug=id_or_slug,
        increment_view=True,
        is_staff_or_admin=is_staff_or_admin,
    )

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại hoặc chưa được xuất bản",
        )

    return ArticleResponse.model_validate(article)


@router.post("", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
def create_new_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Tạo bài viết công nghệ mới (Chỉ dành cho STAFF hoặc ADMIN)."""
    article = create_article(db=db, obj_in=payload, author_id=current_user.id)
    return ArticleResponse.model_validate(article)


@router.put("/{article_id}", response_model=ArticleResponse)
def update_existing_article(
    article_id: int,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Cập nhật bài viết công nghệ (Chỉ dành cho STAFF hoặc ADMIN).
    Giữ nguyên slug nếu không truyền slug mới.
    """
    article = get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    updated = update_article(db=db, article=article, obj_in=payload)
    return ArticleResponse.model_validate(updated)


@router.delete("/{article_id}", response_model=MessageResponse)
def delete_existing_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Xóa bài viết công nghệ (Chỉ dành cho STAFF hoặc ADMIN)."""
    article = get_article_by_id(db, article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    title = article.title
    delete_article(db=db, article=article)
    return MessageResponse(message=f"Đã xóa bài viết '{title}' thành công")

