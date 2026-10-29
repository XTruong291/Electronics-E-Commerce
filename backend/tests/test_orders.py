import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.order import Order, OrderStatus
from app.models.product import Product
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


def test_create_order_guest_and_stock_deduction(client: TestClient, db_session):
    """Test guest order placement: validates stock deduction, snapshotting, and calculation."""
    db_session.rollback()
    product = db_session.query(Product).filter(Product.sku == "LAP-APPLE-MBA-M2").first()
    assert product is not None
    initial_stock = product.stock
    expected_unit_price = product.sale_price if product.sale_price else product.price

    payload = {
        "recipient_name": "Tran Van B",
        "recipient_phone": "0911223344",
        "shipping_address": "123 Cau Giay, Ha Noi",
        "note": "Giao gio hanh chinh",
        "payment_method": "COD",
        "items": [
            {
                "product_id": product.id,
                "quantity": 2,
            }
        ],
    }

    res = client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201
    order_data = res.json()

    assert order_data["user_id"] is None  # Guest
    assert order_data["status"] == "PENDING"
    assert order_data["total_amount"] == expected_unit_price * 2
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["product_id"] == product.id
    assert order_data["items"][0]["unit_price"] == expected_unit_price
    assert order_data["items"][0]["quantity"] == 2

    # Check inventory deducted (commit/rollback test session to read latest DB state)
    db_session.rollback()
    refreshed_prod = db_session.query(Product).filter(Product.id == product.id).first()
    assert refreshed_prod.stock == initial_stock - 2


def test_create_order_insufficient_stock_fails(client: TestClient, db_session):
    """Test that ordering more than available stock is rejected."""
    db_session.rollback()
    product = db_session.query(Product).filter(Product.sku == "LAP-ASUS-ROG-G16").first()
    assert product is not None

    payload = {
        "recipient_name": "Test User",
        "recipient_phone": "0988776655",
        "shipping_address": "456 Hoan Kiem, Ha Noi",
        "payment_method": "COD",
        "items": [
            {
                "product_id": product.id,
                "quantity": product.stock + 10,
            }
        ],
    }

    res = client.post("/api/v1/orders", json=payload)
    assert res.status_code == 400
    assert "không đủ số lượng đặt" in res.json()["detail"]


def test_customer_order_and_my_orders_list(
    client: TestClient, customer_headers, db_session
):
    """Test customer order placement and retrieval in /orders/me."""
    db_session.rollback()
    product = db_session.query(Product).filter(Product.sku == "ACC-LOGI-MX3S").first()
    assert product is not None

    payload = {
        "recipient_name": "Nguyen Van A",
        "recipient_phone": "0903456789",
        "shipping_address": "789 Ba Dinh, Ha Noi",
        "payment_method": "BANK_TRANSFER",
        "items": [{"product_id": product.id, "quantity": 1}],
    }

    # 1. Place order as logged-in customer
    res = client.post("/api/v1/orders", json=payload, headers=customer_headers)
    assert res.status_code == 201
    order = res.json()
    assert order["user_id"] is not None

    # 2. Check /orders/me
    my_res = client.get("/api/v1/orders/me", headers=customer_headers)
    assert my_res.status_code == 200
    my_orders = my_res.json()["items"]
    assert any(o["id"] == order["id"] for o in my_orders)


def test_admin_update_order_status_and_cancellation_restock(
    client: TestClient, admin_headers, customer_headers, db_session
):
    """Test admin order listing, status transitions, and inventory restoration on cancellation."""
    db_session.rollback()
    product = db_session.query(Product).filter(Product.sku == "MON-LG-27GR75Q").first()
    stock_before = product.stock

    # Create order of 2 items
    payload = {
        "recipient_name": "Hoan Kho Test",
        "recipient_phone": "0912345678",
        "shipping_address": "Test Dia Chi",
        "payment_method": "COD",
        "items": [{"product_id": product.id, "quantity": 2}],
    }
    create_res = client.post("/api/v1/orders", json=payload, headers=customer_headers)
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    db_session.rollback()
    refreshed_prod = db_session.query(Product).filter(Product.id == product.id).first()
    assert refreshed_prod.stock == stock_before - 2

    # Admin list orders
    list_res = client.get("/api/v1/admin/orders", headers=admin_headers)
    assert list_res.status_code == 200
    assert any(o["id"] == order_id for o in list_res.json()["items"])

    # Update to CONFIRMED
    patch_res = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "CONFIRMED"},
        headers=admin_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "CONFIRMED"

    # Cancel order -> should restore stock
    cancel_res = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "CANCELLED"},
        headers=admin_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    db_session.rollback()
    restored_prod = db_session.query(Product).filter(Product.id == product.id).first()
    assert restored_prod.stock == stock_before  # Restored!

    # Cannot update cancelled order anymore
    retry_res = client.patch(
        f"/api/v1/admin/orders/{order_id}/status",
        json={"status": "SHIPPING"},
        headers=admin_headers,
    )
    assert retry_res.status_code == 400
    assert "Không thể thay đổi trạng thái" in retry_res.json()["detail"]
