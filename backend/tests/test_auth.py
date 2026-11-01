import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password, hash_token
from app.models.user import RefreshToken, User, UserRole


def unique_email(prefix: str = "test") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"


def test_register_success(client: TestClient, db_session: Session):
    email = unique_email("reg")
    payload = {
        "email": email,
        "password": "Password@123",
        "full_name": "Test User",
        "phone": "0911222333",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["role"] == "CUSTOMER"
    assert "refresh_token" in response.cookies


def test_register_duplicate_email(client: TestClient, db_session: Session):
    email = unique_email("dup")
    payload = {
        "email": email,
        "password": "Password@123",
        "full_name": "Duplicate User",
    }
    # First registration
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    # Second registration with same email
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    assert "Email đã được sử dụng" in r2.json()["detail"]


def test_register_weak_password(client: TestClient):
    email = unique_email("weak")
    # Password less than 8 chars
    r1 = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Pass1", "full_name": "User"},
    )
    assert r1.status_code == 422

    # Password without digit
    r2 = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "PasswordWithoutDigit", "full_name": "User"},
    )
    assert r2.status_code == 422

    # Password without uppercase
    r3 = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "password123", "full_name": "User"},
    )
    assert r3.status_code == 422


def test_login_success(client: TestClient, db_session: Session):
    email = unique_email("login")
    user = User(
        email=email,
        password_hash=hash_password("Login@1234"),
        full_name="Login Success",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Login@1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == email
    assert "refresh_token" in response.cookies


def test_login_wrong_password(client: TestClient, db_session: Session):
    email = unique_email("wrongpass")
    user = User(
        email=email,
        password_hash=hash_password("Correct@123"),
        full_name="Wrong Pass User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "IncorrectPassword@123"},
    )
    assert response.status_code == 401
    assert "Email hoặc mật khẩu không chính xác" in response.json()["detail"]


def test_login_locked_account(client: TestClient, db_session: Session):
    email = unique_email("locked")
    user = User(
        email=email,
        password_hash=hash_password("Locked@123"),
        full_name="Locked User",
        role=UserRole.CUSTOMER,
        is_active=False,  # Account locked
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Locked@123"},
    )
    assert response.status_code == 403
    assert "Tài khoản đã bị khóa do vi phạm chính sách" in response.json()["detail"]
    assert "access_token" not in response.json()
    assert "refresh_token" not in response.cookies


def test_get_me(client: TestClient, db_session: Session):
    email = unique_email("me")
    user = User(
        email=email,
        password_hash=hash_password("User@12345"),
        full_name="Get Me User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Login to get access token
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "User@12345"},
    )
    token = login_res.json()["access_token"]

    # Call /auth/me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == email
    assert me_data["full_name"] == "Get Me User"

    # Lock account and verify /auth/me returns 403
    user.is_active = False
    db_session.commit()

    me_locked_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_locked_res.status_code == 403
    assert "Tài khoản đã bị khóa do vi phạm chính sách" in me_locked_res.json()["detail"]


def test_refresh_rotation_and_reuse_detection(client: TestClient, db_session: Session):
    email = unique_email("rotation")
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Rotation@123",
            "full_name": "Rotation User",
        },
    )
    assert reg_res.status_code == 201
    old_refresh_token = reg_res.cookies.get("refresh_token")
    assert old_refresh_token is not None

    # Step 1: Normal refresh rotation
    # Clear client cookies and manually set the old_refresh_token cookie
    client.cookies.clear()
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh_token},
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    new_refresh_token = refresh_res.cookies.get("refresh_token")
    assert new_refresh_token is not None
    assert new_refresh_token != old_refresh_token

    # Verify in DB that old token is revoked
    old_hash = hash_token(old_refresh_token)
    old_record = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.token_hash == old_hash)
        .first()
    )
    assert old_record is not None
    assert old_record.revoked is True

    # Step 2: Token Reuse Attack Detection!
    # Attacker tries to use the old_refresh_token that was already rotated/revoked
    client.cookies.clear()
    reuse_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh_token},
    )
    assert reuse_res.status_code == 401
    assert "tái sử dụng" in reuse_res.json()["detail"]

    # Verify that ALL tokens for this user have now been revoked!
    db_session.rollback()
    new_hash = hash_token(new_refresh_token)
    new_record = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.token_hash == new_hash)
        .first()
    )
    assert new_record is not None
    assert new_record.revoked is True

    # Attempting to use the new_refresh_token now should also fail!
    client.cookies.clear()
    subsequent_res = client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": new_refresh_token},
    )
    assert subsequent_res.status_code == 401


def test_logout(client: TestClient, db_session: Session):
    email = unique_email("logout")
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Logout@1234",
            "full_name": "Logout User",
        },
    )
    token = reg_res.cookies.get("refresh_token")

    # Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        cookies={"refresh_token": token},
    )
    assert logout_res.status_code == 200
    assert "Đăng xuất thành công" in logout_res.json()["message"]

    # Check token marked revoked in DB
    h = hash_token(token)
    rec = db_session.query(RefreshToken).filter(RefreshToken.token_hash == h).first()
    assert rec.revoked is True
