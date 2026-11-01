from unittest.mock import AsyncMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_oauth_state
from app.crud.user import resolve_identity
from app.models.user import OAuthAccount, User, UserRole
from app.services.oauth import OAuthUserInfo


def test_resolve_identity_case_c_new_user(db_session: Session):
    oauth_info = OAuthUserInfo(
        provider="google",
        provider_user_id="goog_new_001",
        email="new_sso_user@example.com",
        email_verified=True,
        full_name="New SSO User",
        avatar_url="https://example.com/avatar.jpg",
    )
    user = resolve_identity(db_session, oauth_info)
    assert user is not None
    assert user.email == "new_sso_user@example.com"
    assert user.password_hash is None
    assert user.role == UserRole.CUSTOMER
    assert user.is_active is True

    # Check OAuthAccount row
    oauth_acc = (
        db_session.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == "goog_new_001",
        )
        .first()
    )
    assert oauth_acc is not None
    assert oauth_acc.user_id == user.id


def test_resolve_identity_case_b_account_linking_verified(db_session: Session):
    # Existing customer account
    customer = (
        db_session.query(User).filter(User.email == "customer@example.com").first()
    )
    assert customer is not None

    oauth_info = OAuthUserInfo(
        provider="github",
        provider_user_id="gh_link_001",
        email="customer@example.com",
        email_verified=True,
        full_name="Customer Via GitHub",
    )
    user = resolve_identity(db_session, oauth_info)
    assert user.id == customer.id

    # Check linked oauth_accounts row
    oauth_acc = (
        db_session.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == "github",
            OAuthAccount.provider_user_id == "gh_link_001",
        )
        .first()
    )
    assert oauth_acc is not None
    assert oauth_acc.user_id == customer.id


def test_resolve_identity_case_b_reject_unverified_email(db_session: Session):
    oauth_info = OAuthUserInfo(
        provider="google",
        provider_user_id="goog_attacker_001",
        email="customer@example.com",
        email_verified=False,  # Unverified email must be rejected!
        full_name="Attacker",
    )
    with pytest.raises(HTTPException) as exc_info:
        resolve_identity(db_session, oauth_info)

    assert exc_info.value.status_code == 400
    assert "chưa được xác thực" in exc_info.value.detail


def test_resolve_identity_case_a_existing_provider_login(db_session: Session):
    # Retrieve user previously linked with goog_new_001
    oauth_info = OAuthUserInfo(
        provider="google",
        provider_user_id="goog_new_001",
        email="different_email_ignored@example.com",
        email_verified=True,
        full_name="Ignored",
    )
    user = resolve_identity(db_session, oauth_info)
    assert user.email == "new_sso_user@example.com"


def test_sso_authorize_endpoint(client: TestClient):
    # Google
    res_google = client.get(
        "/api/v1/auth/sso/google/authorize?redirect=/profile",
        follow_redirects=False,
    )
    assert res_google.status_code == 307
    location_google = res_google.headers["location"]
    assert "accounts.google.com" in location_google
    assert "state=" in location_google

    # GitHub
    res_github = client.get(
        "/api/v1/auth/sso/github/authorize",
        follow_redirects=False,
    )
    assert res_github.status_code == 307
    assert "github.com/login/oauth/authorize" in res_github.headers["location"]

    # Unsupported provider
    res_unsupported = client.get("/api/v1/auth/sso/facebook/authorize")
    assert res_unsupported.status_code == 400


def test_sso_callback_missing_and_bad_state(client: TestClient):
    # Missing state
    r1 = client.get("/api/v1/auth/sso/google/callback?code=mock_code")
    assert r1.status_code == 400
    assert "Thiếu tham số state" in r1.json()["detail"]

    # Bad / forged state
    r2 = client.get(
        "/api/v1/auth/sso/google/callback?code=mock_code&state=forged_state"
    )
    assert r2.status_code == 400
    assert "State xác thực không hợp lệ" in r2.json()["detail"]


@patch("app.api.v1.endpoints.auth.exchange_google_code")
def test_sso_callback_mocked_success(mock_exchange, client: TestClient):
    mock_exchange.return_value = OAuthUserInfo(
        provider="google",
        provider_user_id="google_mock_user_888",
        email="mocked_sso_login@example.com",
        email_verified=True,
        full_name="Mocked User",
    )

    state = create_oauth_state(provider="google", redirect_target="/profile")
    response = client.get(
        f"/api/v1/auth/sso/google/callback?code=valid_mock_code&state={state}",
        follow_redirects=False,
    )

    assert response.status_code == 302
    location = response.headers["location"]
    assert "/auth/sso/callback" in location
    assert "access_token=" in location
    assert "redirect=%2Fprofile" in location
    assert "refresh_token" in response.cookies
