import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.crud.analytics import build_store_grounding_context
from app.models.analytics import UserEvent
from app.models.product import Product
from app.models.user import User
from app.services.gemini_advisor import rule_based_fallback
from app.schemas.analytics import AnalyticsOverviewResponse, ConversionFunnelSummary


@pytest.fixture
def admin_headers(db_session):
    admin = db_session.query(User).filter(User.email == "admin@example.com").first()
    token = create_access_token(
        {"sub": str(admin.id), "email": admin.email, "role": admin.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers(db_session):
    cust = db_session.query(User).filter(User.email == "customer@example.com").first()
    token = create_access_token(
        {"sub": str(cust.id), "email": cust.email, "role": cust.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


def test_track_event_public_guest_and_user(client: TestClient, customer_headers):
    """Kiểm tra API ghi nhận sự kiện tracking hoạt động cho cả khách vãng lai và user đăng nhập."""
    # 1. Guest sends PRODUCT_VIEW event
    session_id = f"sess_test_{uuid.uuid4().hex[:8]}"
    res_guest = client.post(
        "/api/v1/analytics/events",
        json={
            "event_type": "PRODUCT_VIEW",
            "session_id": session_id,
            "product_id": 1,
            "metadata_json": {"brand": "Apple", "source": "test"},
        },
    )
    assert res_guest.status_code == 201
    guest_data = res_guest.json()
    assert guest_data["event_type"] == "PRODUCT_VIEW"
    assert guest_data["session_id"] == session_id
    assert guest_data["user_id"] is None
    assert guest_data["product_id"] == 1
    assert guest_data["category_id"] is not None  # Auto-populated from product

    # 2. Authenticated user sends ADD_TO_CART event
    res_user = client.post(
        "/api/v1/analytics/events",
        headers=customer_headers,
        json={
            "event_type": "ADD_TO_CART",
            "session_id": session_id,
            "product_id": 1,
            "metadata_json": {"quantity": 1},
        },
    )
    assert res_user.status_code == 201
    user_data = res_user.json()
    assert user_data["event_type"] == "ADD_TO_CART"
    assert user_data["user_id"] is not None

    # 3. Guest sends SEARCH event
    res_search = client.post(
        "/api/v1/analytics/events",
        json={
            "event_type": "SEARCH",
            "session_id": session_id,
            "search_query": "MacBook M3",
        },
    )
    assert res_search.status_code == 201
    search_data = res_search.json()
    assert search_data["search_query"] == "MacBook M3"


def test_admin_analytics_overview_rbac(client: TestClient, customer_headers, admin_headers):
    """Kiểm tra phân quyền: Khách và Customer bị 401/403, Staff/Admin truy cập thành công."""
    # 1. Unauthenticated -> 401
    res_anon = client.get("/api/v1/admin/analytics/overview")
    assert res_anon.status_code == 401

    # 2. Customer -> 403 Forbidden
    res_cust = client.get("/api/v1/admin/analytics/overview", headers=customer_headers)
    assert res_cust.status_code == 403

    # 3. Admin -> 200 OK
    res_admin = client.get("/api/v1/admin/analytics/overview?days=30", headers=admin_headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "funnel" in data
    assert "high_dropoff_products" in data
    assert "top_selling_products" in data
    assert "slow_moving_products" in data
    assert "category_interest" in data
    assert "brand_interest" in data
    assert "top_search_keywords" in data
    assert data["total_events_recorded"] > 0


def test_admin_analytics_overview_data_structure(client: TestClient, admin_headers):
    """Kiểm tra dữ liệu Phễu chuyển đổi và Danh sách sản phẩm Drop-off trả về đúng cấu trúc."""
    res = client.get("/api/v1/admin/analytics/overview?days=14", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    # Check funnel metrics
    funnel = data["funnel"]
    assert funnel["total_views"] >= 0
    assert funnel["total_cart_adds"] >= 0
    assert funnel["total_orders"] >= 0
    assert 0 <= funnel["view_to_cart_pct"] <= 100
    assert 0 <= funnel["cart_to_order_pct"] <= 100

    # Check high drop-off products
    assert isinstance(data["high_dropoff_products"], list)
    if data["high_dropoff_products"]:
        p = data["high_dropoff_products"][0]
        assert "product_name" in p
        assert "views" in p
        assert "cart_adds" in p
        assert "units_sold" in p
        assert "dropoff_rate_pct" in p
        assert p["status_flag"] in ["HIGH_DROPOFF", "CONSIDERING", "HEALTHY"]

    # Check top selling products
    assert isinstance(data["top_selling_products"], list)
    if data["top_selling_products"]:
        top_p = data["top_selling_products"][0]
        assert "product_name" in top_p
        assert "sku" in top_p
        assert "units_sold" in top_p
        assert "order_count" in top_p
        assert "gross_revenue" in top_p
        assert "current_stock" in top_p

    # Check slow moving & dead stock products
    assert isinstance(data["slow_moving_products"], list)
    if data["slow_moving_products"]:
        slow_p = data["slow_moving_products"][0]
        assert "product_name" in slow_p
        assert "sku" in slow_p
        assert "current_stock" in slow_p
        assert "inventory_value" in slow_p
        assert "days_in_stock" in slow_p
        assert slow_p["aging_status"] in ["DEAD_STOCK", "SLOW_MOVING"]

    # Check top search keywords
    assert isinstance(data["top_search_keywords"], list)
    if data["top_search_keywords"]:
        kw = data["top_search_keywords"][0]
        assert "keyword" in kw
        assert kw["search_count"] >= 1


def test_admin_ai_insights_endpoint(client: TestClient, customer_headers, admin_headers):
    """Kiểm tra endpoint AI Insights hoạt động trơn tru (kể cả khi chạy Fallback)."""
    # 1. Customer -> 403 Forbidden
    res_cust = client.post("/api/v1/admin/analytics/ai-insights", headers=customer_headers)
    assert res_cust.status_code == 403

    # 2. Admin -> 200 OK với đầy đủ 4 trường nhận định
    res_admin = client.post("/api/v1/admin/analytics/ai-insights?days=30", headers=admin_headers)
    assert res_admin.status_code == 200
    insights = res_admin.json()

    assert insights["source"] in ["gemini_ai", "rule_based_fallback"]
    assert len(insights["executive_summary"]) > 10
    assert len(insights["dropoff_analysis"]) > 10
    assert len(insights["trend_insights"]) > 10
    assert isinstance(insights["actionable_recommendations"], list)
    assert len(insights["actionable_recommendations"]) >= 3


def test_rule_based_fallback_logic():
    """Kiểm tra hàm rule_based_fallback sinh văn bản hợp lý từ dữ liệu mock."""
    mock_overview = AnalyticsOverviewResponse(
        days=30,
        funnel=ConversionFunnelSummary(
            total_views=500,
            total_cart_adds=150,
            total_orders=45,
            view_to_cart_pct=30.0,
            cart_to_order_pct=30.0,
            overall_conversion_pct=9.0,
        ),
        high_dropoff_products=[],
        category_interest=[],
        brand_interest=[],
        top_search_keywords=[],
        total_events_recorded=650,
    )
    insights = rule_based_fallback(mock_overview)
    assert insights.source == "rule_based_fallback"
    assert "500" in insights.executive_summary
    assert "30.0%" in insights.executive_summary
    assert len(insights.actionable_recommendations) >= 2


def test_admin_ai_chat_rbac_and_flow(client: TestClient, customer_headers, admin_headers):
    """Kiểm tra endpoint AI Chat: RBAC (khách 401, customer 403, admin 200) và trả lời theo ngữ cảnh."""
    # 1. Unauthenticated -> 401
    res_anon = client.post(
        "/api/v1/admin/analytics/ai-chat",
        json={"question": "Tổng doanh thu là bao nhiêu?", "days": 30},
    )
    assert res_anon.status_code == 401

    # 2. Customer -> 403
    res_cust = client.post(
        "/api/v1/admin/analytics/ai-chat",
        headers=customer_headers,
        json={"question": "Tổng doanh thu là bao nhiêu?", "days": 30},
    )
    assert res_cust.status_code == 403

    # 3. Admin turn 1 -> 200 OK
    res_admin = client.post(
        "/api/v1/admin/analytics/ai-chat",
        headers=admin_headers,
        json={
            "question": "Doanh thu thực nhận và tổng giá trị đơn hàng hiện tại là bao nhiêu?",
            "days": 30,
            "history": [],
        },
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert isinstance(data["suggested_followups"], list)
    assert len(data["suggested_followups"]) >= 2
    assert "products" in data["data_sources_used"]
    assert "orders" in data["data_sources_used"]
    assert data["source"] in ["gemini_ai", "rule_based_fallback"]

    # 4. Admin turn 2 with multi-turn history -> 200 OK
    res_turn2 = client.post(
        "/api/v1/admin/analytics/ai-chat",
        headers=admin_headers,
        json={
            "question": "Những mặt hàng nào đang tồn kho đọng vốn nhiều nhất cần xả hàng?",
            "days": 30,
            "history": [
                {"role": "user", "content": "Doanh thu thực nhận là bao nhiêu?"},
                {"role": "assistant", "content": data["answer"]},
            ],
        },
    )
    assert res_turn2.status_code == 200
    data2 = res_turn2.json()
    assert "answer" in data2
    assert len(data2["answer"]) > 20
    assert len(data2["suggested_followups"]) >= 2


def test_build_store_grounding_context(db_session):
    """Kiểm tra hàm build_store_grounding_context trả về đúng các trường Base Snapshot và Dynamic Retrieval."""
    context = build_store_grounding_context(db_session, days=30, user_question="iPhone 16 Pro Max giá bao nhiêu?")

    # Check Base Snapshot
    assert "revenue_and_orders" in context
    assert "delivered_revenue" in context["revenue_and_orders"]
    assert "total_valid_order_revenue" in context["revenue_and_orders"]
    assert isinstance(context["revenue_and_orders"]["delivered_revenue"], int)
    assert isinstance(context["revenue_and_orders"]["total_valid_order_revenue"], int)

    assert "conversion_funnel" in context
    assert "product_catalog_summary" in context
    assert len(context["product_catalog_summary"]) > 0

    # Check Dynamic Retrieval for product
    assert "dynamic_retrieval" in context
    matched = context["dynamic_retrieval"]["matched_products"]
    assert isinstance(matched, list)
    if matched:
        assert "iPhone" in matched[0]["name"] or "16" in matched[0]["name"]

