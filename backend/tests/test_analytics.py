import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User


@pytest.fixture
def admin_headers(db_session: Session):
    admin = db_session.query(User).filter(User.email == "admin@example.com").first()
    token = create_access_token(
        {"sub": str(admin.id), "email": admin.email, "role": admin.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_headers(db_session: Session):
    cust = db_session.query(User).filter(User.email == "customer@example.com").first()
    token = create_access_token(
        {"sub": str(cust.id), "email": cust.email, "role": cust.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


def test_record_product_view_endpoint(client: TestClient, db_session: Session):
    """Test public and authenticated view increment endpoint."""
    prod = db_session.query(Product).first()
    assert prod is not None
    initial_views = prod.view_count or 0

    # 1. Unauthenticated view
    res1 = client.post(f"/api/v1/products/{prod.slug}/view")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["view_count"] == initial_views + 1
    assert data1["product_id"] == prod.id

    # 2. View by numeric ID
    res2 = client.post(f"/api/v1/products/{prod.id}/view")
    assert res2.status_code == 200
    assert res2.json()["view_count"] == initial_views + 2

    # 3. View non-existent product
    res_404 = client.post("/api/v1/products/non-existent-product-slug/view")
    assert res_404.status_code == 404


def test_behavior_analytics_rbac(client: TestClient, admin_headers, customer_headers):
    """Test behavior analytics endpoint access control."""
    # Anonymous -> 401
    anon_res = client.get("/api/v1/admin/analytics/behavior")
    assert anon_res.status_code in (401, 403)

    # Customer -> 403
    cust_res = client.get("/api/v1/admin/analytics/behavior", headers=customer_headers)
    assert cust_res.status_code == 403

    # Admin -> 200
    admin_res = client.get("/api/v1/admin/analytics/behavior", headers=admin_headers)
    assert admin_res.status_code == 200
    data = admin_res.json()
    assert "total_products" in data
    assert "total_views" in data
    assert "high_view_low_purchase_items" in data
    assert "top_viewed_items" in data
    assert "top_converted_items" in data


def test_behavior_analytics_calculation(client: TestClient, db_session: Session, admin_headers):
    """Test conversion rate calculation and diagnostic hints."""
    # Find or create a test product with known views and orders
    prod = db_session.query(Product).filter(Product.sku == "TEST-CONV-PROD").first()
    if not prod:
        prod = Product(
            category_id=1,
            name="Sản phẩm thử nghiệm chuyển đổi",
            slug="san-pham-thu-nghiem-chuyen-doi",
            sku="TEST-CONV-PROD",
            brand="TestBrand",
            price=10000000,
            sale_price=None,
            stock=10,
            is_active=True,
            view_count=50,
        )
        db_session.add(prod)
        db_session.commit()
        db_session.refresh(prod)
    else:
        prod.view_count = 9999
        db_session.commit()

    prod.view_count = 9999
    db_session.commit()

    # Create 1 valid order with 2 units of this product
    order = Order(
        recipient_name="Test Buyer",
        recipient_phone="0999999999",
        shipping_address="123 Test Street",
        total_amount=20000000,
        payment_method="COD",
        status=OrderStatus.CONFIRMED,
        items=[
            OrderItem(
                product_id=prod.id,
                product_name=prod.name,
                unit_price=10000000,
                quantity=2,
            )
        ],
    )
    db_session.add(order)
    db_session.commit()

    # Call analytics endpoint with min_views=10, max_conversion_rate=10.0, limit=100
    res = client.get(
        "/api/v1/admin/analytics/behavior?min_views=10&max_conversion_rate=10.0&limit=100",
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()

    # With 50 views and 1 order, CR = (1 / 50) * 100 = 2.0%
    # 2.0% <= 10.0%, so it should be in high_view_low_purchase_items
    matching = [item for item in data["high_view_low_purchase_items"] if item["id"] == prod.id]
    assert len(matching) == 1
    analyzed_prod = matching[0]
    assert analyzed_prod["view_count"] >= 50
    assert analyzed_prod["order_count"] >= 1
    assert analyzed_prod["units_sold"] >= 2
    assert analyzed_prod["conversion_rate"] <= 10.0
    assert analyzed_prod["diagnostic_hint"] is not None

    # Clean up test records
    db_session.query(OrderItem).filter(OrderItem.order_id == order.id).delete(synchronize_session=False)
    db_session.query(Order).filter(Order.id == order.id).delete(synchronize_session=False)
    db_session.commit()

    db_session.query(Product).filter(Product.id == prod.id).delete(synchronize_session=False)
    db_session.commit()


def test_sync_views_endpoint(client: TestClient, admin_headers):
    """Test admin endpoint to sync genuine view counts from product_views table."""
    res = client.post("/api/v1/admin/analytics/sync-views", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "message" in data
    assert "updated_products" in data
