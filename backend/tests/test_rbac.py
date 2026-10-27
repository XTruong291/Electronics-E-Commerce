import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.user import User, UserRole


def test_admin_ping_no_token(client: TestClient):
    response = client.get("/api/v1/admin/ping")
    assert response.status_code == 401
    assert "Yêu cầu xác thực không hợp lệ" in response.json()["detail"]


def test_admin_ping_customer_forbidden(client: TestClient, db_session):
    customer = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    assert customer is not None
    token = create_access_token(
        {"sub": str(customer.id), "email": customer.email, "role": customer.role.value}
    )

    response = client.get(
        "/api/v1/admin/ping",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "Bạn không có quyền truy cập chức năng này" in response.json()["detail"]


def test_admin_ping_staff_allowed(client: TestClient, db_session):
    staff = db_session.query(User).filter(User.email == "staff@example.com").first()
    assert staff is not None
    token = create_access_token(
        {"sub": str(staff.id), "email": staff.email, "role": staff.role.value}
    )

    response = client.get(
        "/api/v1/admin/ping",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "pong"
    assert data["role"] == "STAFF"


def test_admin_ping_admin_allowed(client: TestClient, db_session):
    admin = db_session.query(User).filter(User.email == "admin@example.com").first()
    assert admin is not None
    token = create_access_token(
        {"sub": str(admin.id), "email": admin.email, "role": admin.role.value}
    )

    response = client.get(
        "/api/v1/admin/ping",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "pong"
    assert data["role"] == "ADMIN"


def test_admin_orders_patch_status_customer_forbidden(client: TestClient, db_session):
    customer = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    token = create_access_token(
        {"sub": str(customer.id), "email": customer.email, "role": customer.role.value}
    )

    response = client.patch(
        "/api/v1/admin/orders/1/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "Bạn không có quyền truy cập chức năng này" in response.json()["detail"]


def test_admin_orders_patch_status_staff_allowed(client: TestClient, db_session):
    staff = db_session.query(User).filter(User.email == "staff@example.com").first()
    token = create_access_token(
        {"sub": str(staff.id), "email": staff.email, "role": staff.role.value}
    )

    response = client.patch(
        "/api/v1/admin/orders/1/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["order_id"] == 1
