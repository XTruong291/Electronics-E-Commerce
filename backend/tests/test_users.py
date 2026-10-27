import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, generate_refresh_token
from app.crud.user import create_refresh_token
from app.models.user import RefreshToken, User, UserAddress, UserRole


def get_token(user: User) -> str:
    return create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role.value}
    )


def test_user_profile_get_and_patch(client: TestClient, db_session: Session):
    user = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    token = get_token(user)

    # GET /users/me
    res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == user.email

    # PATCH /users/me
    patch_res = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "Nguyen Van B", "phone": "0988776655"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["full_name"] == "Nguyen Van B"
    assert patch_res.json()["phone"] == "0988776655"


def test_avatar_upload_validation_and_success(client: TestClient, db_session: Session):
    user = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    token = get_token(user)

    # Invalid mime type
    bad_file = io.BytesIO(b"fake text content")
    res_bad = client.post(
        "/api/v1/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.txt", bad_file, "text/plain")},
    )
    assert res_bad.status_code == 400
    assert "Định dạng ảnh không hợp lệ" in res_bad.json()["detail"]

    # Valid PNG image upload
    good_file = io.BytesIO(b"\x89PNG\r\n\x1a\nfakeimagebytes")
    res_good = client.post(
        "/api/v1/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", good_file, "image/png")},
    )
    assert res_good.status_code == 200
    assert "avatar_url" in res_good.json()
    assert res_good.json()["avatar_url"] is not None


def test_address_book_crud_and_single_default(client: TestClient, db_session: Session):
    user = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    token = get_token(user)

    # Clean existing test addresses
    db_session.query(UserAddress).filter(UserAddress.user_id == user.id).delete()
    db_session.commit()

    # Create address 1 (should automatically become default since it's the first)
    addr1_data = {
        "recipient": "Nguyen Van A",
        "phone": "0901112233",
        "province": "Ha Noi",
        "district": "Cau Giay",
        "ward": "Dich Vong",
        "detail": "123 Xuan Thuy",
        "is_default": False,
    }
    r1 = client.post(
        "/api/v1/users/me/addresses",
        headers={"Authorization": f"Bearer {token}"},
        json=addr1_data,
    )
    assert r1.status_code == 201
    addr1_id = r1.json()["id"]
    assert r1.json()["is_default"] is True

    # Create address 2 with is_default = True
    addr2_data = {
        "recipient": "Nguyen Van A Office",
        "phone": "0901112233",
        "province": "Ha Noi",
        "district": "Nam Tu Liem",
        "ward": "My Dinh",
        "detail": "456 Le Duc Tho",
        "is_default": True,
    }
    r2 = client.post(
        "/api/v1/users/me/addresses",
        headers={"Authorization": f"Bearer {token}"},
        json=addr2_data,
    )
    assert r2.status_code == 201
    addr2_id = r2.json()["id"]
    assert r2.json()["is_default"] is True

    # Verify address 1 is no longer default
    db_session.rollback()
    addr1_db = db_session.query(UserAddress).filter(UserAddress.id == addr1_id).first()
    assert addr1_db.is_default is False

    # List addresses
    list_res = client.get(
        "/api/v1/users/me/addresses",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2

    # Update address 1 to be default
    patch_res = client.patch(
        f"/api/v1/users/me/addresses/{addr1_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_default": True},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_default"] is True

    # Verify address 2 is now unset
    db_session.rollback()
    addr2_db = db_session.query(UserAddress).filter(UserAddress.id == addr2_id).first()
    assert addr2_db.is_default is False

    # Delete address 1
    del_res = client.delete(
        f"/api/v1/users/me/addresses/{addr1_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200


def test_admin_self_lock_and_self_demote_block(client: TestClient, db_session: Session):
    admin = db_session.query(User).filter(User.email == "admin@example.com").first()
    admin_token = get_token(admin)

    # 1. Admin tries to lock own account -> should return 400
    lock_res = client.patch(
        f"/api/v1/admin/users/{admin.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert lock_res.status_code == 400
    assert "Không thể tự khóa" in lock_res.json()["detail"]

    # 2. Admin tries to change own role -> should return 400
    demote_res = client.patch(
        f"/api/v1/admin/users/{admin.id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "CUSTOMER"},
    )
    assert demote_res.status_code == 400
    assert "Không thể tự thay đổi vai trò" in demote_res.json()["detail"]


def test_admin_lock_and_role_change_revokes_refresh_tokens(
    client: TestClient, db_session: Session
):
    admin = db_session.query(User).filter(User.email == "admin@example.com").first()
    admin_token = get_token(admin)

    # Create a fresh target user for testing
    target = User(
        email=f"target_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Target User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(target)
    db_session.commit()

    # Issue an active refresh token for target user
    raw_tok = generate_refresh_token()
    tok_obj = create_refresh_token(db_session, target.id, raw_tok)
    assert tok_obj.revoked is False

    # Action 1: Admin changes target user role -> refresh token must be revoked!
    role_res = client.patch(
        f"/api/v1/admin/users/{target.id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "STAFF"},
    )
    assert role_res.status_code == 200
    assert role_res.json()["role"] == "STAFF"

    db_session.rollback()
    t1 = db_session.query(RefreshToken).filter(RefreshToken.id == tok_obj.id).first()
    assert t1.revoked is True

    # Issue another active refresh token for target user
    raw_tok2 = generate_refresh_token()
    tok_obj2 = create_refresh_token(db_session, target.id, raw_tok2)
    assert tok_obj2.revoked is False

    # Action 2: Admin locks target user -> refresh token must be revoked immediately!
    status_res = client.patch(
        f"/api/v1/admin/users/{target.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert status_res.status_code == 200
    assert status_res.json()["is_active"] is False

    db_session.rollback()
    t2 = db_session.query(RefreshToken).filter(RefreshToken.id == tok_obj2.id).first()
    assert t2.revoked is True
