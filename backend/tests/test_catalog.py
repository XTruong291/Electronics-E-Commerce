import io
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.category import Category
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


def test_list_categories_public(client: TestClient):
    """Test public category listing."""
    res = client.get("/api/v1/categories")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    # Check that categories have product_count
    slugs = [c["slug"] for c in data]
    assert "laptop" in slugs
    assert "dien-thoai" in slugs
    assert all("product_count" in c for c in data)


def test_get_category_by_slug(client: TestClient):
    """Test getting a category by slug."""
    res = client.get("/api/v1/categories/laptop")
    assert res.status_code == 200
    data = res.json()
    assert data["slug"] == "laptop"
    assert data["name"] == "Laptop"
    assert data["product_count"] >= 2


def test_create_category_admin_and_customer_forbidden(
    client: TestClient, admin_headers, customer_headers
):
    """Test creating category requires Staff/Admin role."""
    payload = {
        "name": "Thiết bị mạng Test",
        "description": "Router, switch và modem",
    }

    # Customer is forbidden
    res_cust = client.post(
        "/api/v1/categories", json=payload, headers=customer_headers
    )
    assert res_cust.status_code == 403

    # Admin is allowed
    res_admin = client.post(
        "/api/v1/categories", json=payload, headers=admin_headers
    )
    assert res_admin.status_code == 201
    created = res_admin.json()
    assert created["name"] == "Thiết bị mạng Test"
    assert created["slug"] == "thiet-bi-mang-test"

    # Clean up
    del_res = client.delete(
        f"/api/v1/categories/{created['id']}", headers=admin_headers
    )
    assert del_res.status_code == 200


def test_delete_category_with_products_rejected(client: TestClient, admin_headers):
    """Test cannot delete a category that has products."""
    cat_res = client.get("/api/v1/categories/laptop")
    assert cat_res.status_code == 200
    cat_id = cat_res.json()["id"]

    del_res = client.delete(f"/api/v1/categories/{cat_id}", headers=admin_headers)
    assert del_res.status_code == 400
    assert "Không thể xóa danh mục đang chứa" in del_res.json()["detail"]


def test_list_products_public_and_filter(client: TestClient):
    """Test public product catalog, pagination, and filtering."""
    # 1. Default list
    res = client.get("/api/v1/products?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 8

    # 2. Filter by brand
    res_apple = client.get("/api/v1/products?brand=Apple")
    assert res_apple.status_code == 200
    apple_prods = res_apple.json()["items"]
    assert len(apple_prods) >= 2
    assert all(p["brand"] == "Apple" for p in apple_prods)

    # 3. Filter by price range
    res_price = client.get("/api/v1/products?min_price=20000000&max_price=30000000")
    assert res_price.status_code == 200
    for p in res_price.json()["items"]:
        eff_price = p["sale_price"] or p["price"]
        assert 20000000 <= eff_price <= 30000000

    # 4. Search
    res_search = client.get("/api/v1/products?search=MacBook")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) >= 1
    assert "MacBook" in res_search.json()["items"][0]["name"]

    # 5. Filter by is_active status
    res_active = client.get("/api/v1/products?is_active=true")
    assert res_active.status_code == 200
    assert all(p["is_active"] is True for p in res_active.json()["items"])

    res_inactive = client.get("/api/v1/products?is_active=false&include_inactive=true")
    assert res_inactive.status_code == 200
    assert all(p["is_active"] is False for p in res_inactive.json()["items"])


def test_get_product_detail_by_id_and_slug(client: TestClient):
    """Test retrieving product detail by slug and numeric id."""
    slug_res = client.get("/api/v1/products/macbook-air-m2-13-6-inch-8gb-256gb")
    assert slug_res.status_code == 200
    prod = slug_res.json()
    assert prod["sku"] == "LAP-APPLE-MBA-M2"
    assert prod["category"]["slug"] == "laptop"
    assert "CPU" in prod["specifications"]

    # Retrieve by numeric ID
    id_res = client.get(f"/api/v1/products/{prod['id']}")
    assert id_res.status_code == 200
    assert id_res.json()["sku"] == prod["sku"]


def test_create_and_update_product_admin(client: TestClient, admin_headers):
    """Test creating, updating and deleting product by admin."""
    cat_res = client.get("/api/v1/categories/laptop")
    cat_id = cat_res.json()["id"]

    new_prod_payload = {
        "category_id": cat_id,
        "name": "Laptop Lenovo ThinkPad X1 Carbon Gen 11",
        "sku": "LAP-LENOVO-X1C11-TEST",
        "brand": "Lenovo",
        "price": 45000000,
        "sale_price": 42000000,
        "stock": 5,
        "thumbnail_url": "https://example.com/thinkpad.jpg",
        "specifications": {
            "CPU": "Intel Core i7-1355U",
            "RAM": "32GB LPDDR5",
            "SSD": "1TB PCIe Gen4",
        },
        "description": "Dòng laptop doanh nhân siêu bền nhẹ.",
        "is_active": True,
    }

    # 1. Create product
    create_res = client.post(
        "/api/v1/products", json=new_prod_payload, headers=admin_headers
    )
    assert create_res.status_code == 201
    created_prod = create_res.json()
    prod_id = created_prod["id"]
    assert created_prod["slug"] == "laptop-lenovo-thinkpad-x1-carbon-gen-11"
    assert created_prod["price"] == 45000000

    # 2. Duplicate SKU rejected
    dup_res = client.post(
        "/api/v1/products", json=new_prod_payload, headers=admin_headers
    )
    assert dup_res.status_code == 400
    assert "Mã SKU" in dup_res.json()["detail"]

    # 3. Update product
    update_res = client.put(
        f"/api/v1/products/{prod_id}",
        json={"price": 43500000, "stock": 8},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["price"] == 43500000
    assert update_res.json()["stock"] == 8

    # 4. Delete product
    del_res = client.delete(f"/api/v1/products/{prod_id}", headers=admin_headers)
    assert del_res.status_code == 200

    # Verify deleted
    get_res = client.get(f"/api/v1/products/{prod_id}")
    assert get_res.status_code == 404


def test_upload_product_image_endpoint(
    client: TestClient, admin_headers, customer_headers
):
    """Test product image upload permissions and file validation."""
    # Customer forbidden
    res_cust = client.post(
        "/api/v1/upload/image",
        files={"file": ("test.png", b"dummy image bytes", "image/png")},
        headers=customer_headers,
    )
    assert res_cust.status_code == 403

    # Invalid MIME type rejected
    res_bad_type = client.post(
        "/api/v1/upload/image",
        files={"file": ("test.pdf", b"pdf content", "application/pdf")},
        headers=admin_headers,
    )
    assert res_bad_type.status_code == 400
    assert "Định dạng ảnh không hợp lệ" in res_bad_type.json()["detail"]

    # Admin valid upload (uses Cloudinary service fallback in test env)
    res_valid = client.post(
        "/api/v1/upload/image",
        files={"file": ("product.jpg", b"\xff\xd8\xffdummy jpeg bytes", "image/jpeg")},
        headers=admin_headers,
    )
    assert res_valid.status_code == 200
    assert "url" in res_valid.json()
    assert "cloudinary.com" in res_valid.json()["url"]
