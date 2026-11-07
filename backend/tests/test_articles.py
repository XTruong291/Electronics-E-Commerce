import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.article import Article
from app.models.user import User


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


def test_list_articles_public_and_filter(client: TestClient):
    """Test public article listing and filters."""
    res = client.get("/api/v1/articles")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 8

    # Filter by topic
    res_topic = client.get("/api/v1/articles", params={"topic": "AI & Robotics"})
    assert res_topic.status_code == 200
    for a in res_topic.json()["items"]:
        assert a["topic"] == "AI & Robotics"

    # Filter by featured
    res_featured = client.get("/api/v1/articles", params={"is_featured": True})
    assert res_featured.status_code == 200
    assert any(a["is_featured"] for a in res_featured.json()["items"])

    # Search keyword
    res_search = client.get("/api/v1/articles", params={"search": "NPU"})
    assert res_search.status_code == 200
    assert res_search.json()["total"] >= 1


def test_get_article_detail_and_view_increment(client: TestClient, admin_headers):
    """Test reading article detail increments view for guests, but not for staff/admin."""
    # 1. Get an existing article
    list_res = client.get("/api/v1/articles", params={"page_size": 1})
    article_slug = list_res.json()["items"][0]["slug"]
    initial_views = list_res.json()["items"][0]["view_count"]

    # 2. Guest visits -> view count increments by 1
    guest_res = client.get(f"/api/v1/articles/{article_slug}")
    assert guest_res.status_code == 200
    assert guest_res.json()["view_count"] == initial_views + 1

    # 3. Admin visits -> view count does NOT increment
    admin_res = client.get(
        f"/api/v1/articles/{article_slug}", headers=admin_headers
    )
    assert admin_res.status_code == 200
    assert admin_res.json()["view_count"] == initial_views + 1


def test_draft_protection_for_guest_vs_admin(
    client: TestClient, admin_headers, customer_headers
):
    """Test that unpublished draft articles are hidden from guests/customers, visible to staff/admin."""
    # 1. Admin creates a draft article
    draft_payload = {
        "title": "Bản Nháp Nghiên Cứu Lượng Tử 2030",
        "topic": "Bán dẫn & Phần cứng",
        "summary": "Tóm tắt nghiên cứu máy tính lượng tử chưa hoàn thiện",
        "content": "Nội dung đang viết dở dang, chưa sẵn sàng xuất bản ra công chúng.",
        "is_published": False,
    }
    create_res = client.post(
        "/api/v1/articles", json=draft_payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    draft_slug = create_res.json()["slug"]
    draft_id = create_res.json()["id"]

    # 2. Guest cannot see draft in public list
    public_list = client.get("/api/v1/articles").json()["items"]
    assert all(a["id"] != draft_id for a in public_list)

    # 3. Guest receives 404 when directly requesting draft slug
    guest_detail = client.get(f"/api/v1/articles/{draft_slug}")
    assert guest_detail.status_code == 404

    # 4. Customer receives 404 when directly requesting draft slug
    cust_detail = client.get(
        f"/api/v1/articles/{draft_slug}", headers=customer_headers
    )
    assert cust_detail.status_code == 404

    # 5. Admin CAN view draft detail
    admin_detail = client.get(
        f"/api/v1/articles/{draft_slug}", headers=admin_headers
    )
    assert admin_detail.status_code == 200
    assert admin_detail.json()["id"] == draft_id
    assert admin_detail.json()["is_published"] is False

    # 6. Admin can see draft in list with include_unpublished=True
    admin_list = client.get(
        "/api/v1/articles",
        params={"include_unpublished": True},
        headers=admin_headers,
    )
    assert admin_list.status_code == 200
    assert any(a["id"] == draft_id for a in admin_list.json()["items"])


def test_customer_cannot_modify_articles(client: TestClient, customer_headers):
    """Test RBAC: Customer cannot create, update, or delete articles."""
    payload = {
        "title": "Hack Article by Customer",
        "topic": "AI & Robotics",
        "summary": "Fake summary",
        "content": "Fake content text for testing",
    }
    # Customer POST -> 403
    post_res = client.post(
        "/api/v1/articles", json=payload, headers=customer_headers
    )
    assert post_res.status_code == 403

    # Customer PUT -> 403
    put_res = client.put(
        "/api/v1/articles/1", json={"title": "Updated Title"}, headers=customer_headers
    )
    assert put_res.status_code == 403

    # Customer DELETE -> 403
    del_res = client.delete("/api/v1/articles/1", headers=customer_headers)
    assert del_res.status_code == 403


def test_article_crud_and_slug_stability_on_update(client: TestClient, admin_headers):
    """Test full CRUD and verify slug stability when updating title (User Rule 2)."""
    # 1. Create article
    title = f"Test Tech Article {uuid.uuid4().hex[:6]}"
    payload = {
        "title": title,
        "topic": "Thiết bị tương lai",
        "summary": "Tóm tắt bài viết test thử nghiệm",
        "content": "Nội dung bài viết chi tiết phục vụ kiểm thử hệ thống.",
        "thumbnail_url": "https://example.com/thumb.jpg",
        "is_featured": True,
        "is_published": True,
    }
    create_res = client.post(
        "/api/v1/articles", json=payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    orig_slug = created["slug"]
    art_id = created["id"]
    assert orig_slug is not None

    # 2. Update title only -> SLUG MUST REMAIN THE SAME (User Rule 2)
    new_title = f"{title} - Updated Title"
    update_res = client.put(
        f"/api/v1/articles/{art_id}",
        json={"title": new_title},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == new_title
    assert update_res.json()["slug"] == orig_slug  # Slug preserved!

    # 3. Update slug explicitly -> SLUG CHANGES
    custom_slug = f"custom-slug-{uuid.uuid4().hex[:6]}"
    slug_update_res = client.put(
        f"/api/v1/articles/{art_id}",
        json={"slug": custom_slug},
        headers=admin_headers,
    )
    assert slug_update_res.status_code == 200
    assert slug_update_res.json()["slug"] == custom_slug

    # 4. Delete article
    del_res = client.delete(f"/api/v1/articles/{art_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert "Đã xóa bài viết" in del_res.json()["message"]

    # Verify 404
    get_del = client.get(f"/api/v1/articles/{art_id}")
    assert get_del.status_code == 404

