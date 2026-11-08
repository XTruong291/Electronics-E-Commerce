from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user, require_roles
from app.crud.analytics import get_analytics_overview, record_event
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AdminAIChatRequest,
    AdminAIChatResponse,
    AnalyticsOverviewResponse,
    GeminiInsightsResponse,
    UserEventCreate,
    UserEventResponse,
)
from app.services.gemini_advisor import chat_with_store_advisor, generate_gemini_insights

router = APIRouter(tags=["Analytics & Behavior"])


@router.post(
    "/analytics/events",
    response_model=UserEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ghi nhận sự kiện hành vi người dùng (Public)",
)
def track_user_event(
    event_in: UserEventCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Ghi nhận sự kiện tracking từ Frontend (cho cả khách vãng lai và khách đã login)."""
    user_id = current_user.id if current_user else None
    return record_event(db=db, event_in=event_in, user_id=user_id)


@router.get(
    "/admin/analytics/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Lấy tổng quan phân tích hành vi & phễu chuyển đổi (Staff/Admin)",
)
def get_admin_analytics_overview(
    days: int = Query(30, ge=1, le=90, description="Khoảng thời gian thống kê (ngày)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Truy vấn tổng hợp Phễu chuyển đổi, Sản phẩm tỷ lệ bỏ giỏ cao, Danh mục, Từ khóa."""
    return get_analytics_overview(db=db, days=days)


@router.post(
    "/admin/analytics/ai-insights",
    response_model=GeminiInsightsResponse,
    summary="Sinh nhận định chiến lược kinh doanh qua Gemini AI hoặc Fallback (Staff/Admin)",
)
def get_admin_ai_insights(
    days: int = Query(30, ge=1, le=90, description="Khoảng thời gian thống kê (ngày)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Gọi Gemini 2.5 Flash để nhận định sâu về số liệu và đưa ra khuyến nghị hành động."""
    overview = get_analytics_overview(db=db, days=days)
    return generate_gemini_insights(overview=overview)


@router.post(
    "/admin/analytics/ai-chat",
    response_model=AdminAIChatResponse,
    summary="Hỏi đáp tương tác đa lượt với Gemini Store Copilot (Staff/Admin)",
)
def admin_ai_chat(
    payload: AdminAIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STAFF, UserRole.ADMIN])),
):
    """Truy xuất dữ liệu MySQL theo ngữ cảnh và trao đổi đa lượt với Gemini Store Copilot."""
    return chat_with_store_advisor(db=db, request=payload)

