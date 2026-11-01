from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote_plus

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.rate_limit import rate_limit_auth
from app.core.security import (
    create_access_token,
    create_oauth_state,
    generate_refresh_token,
    hash_token,
    verify_oauth_state,
)
from app.crud.user import (
    authenticate_user,
    create_refresh_token,
    create_user,
    get_refresh_token_by_hash,
    get_user_by_email,
    get_user_by_id,
    resolve_identity,
    revoke_all_user_tokens,
    revoke_refresh_token,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    MessageResponse,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.oauth import (
    exchange_github_code,
    exchange_google_code,
    get_oauth_authorize_url,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/"


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Set HttpOnly cookie for refresh token."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in HTTPS production
        path=REFRESH_COOKIE_PATH,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Remove refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_auth)],
)
def register(
    request: Request,
    response: Response,
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new customer account."""
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        )

    user = create_user(db, payload)

    # Issue tokens
    raw_refresh = generate_refresh_token()
    create_refresh_token(
        db,
        user_id=user.id,
        raw_token=raw_refresh,
        user_agent=request.headers.get("user-agent"),
    )
    set_refresh_cookie(response, raw_refresh)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth)],
)
def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate with email and password."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        # Check if user exists but is locked
        candidate = get_user_by_email(db, payload.email)
        if candidate and not candidate.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa do vi phạm chính sách",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa do vi phạm chính sách",
        )

    # Issue tokens
    raw_refresh = generate_refresh_token()
    create_refresh_token(
        db,
        user_id=user.id,
        raw_token=raw_refresh,
        user_agent=request.headers.get("user-agent"),
    )
    set_refresh_cookie(response, raw_refresh)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME),
):
    """Issue a new access token and rotate refresh token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không tồn tại",
        )

    token_hash = hash_token(refresh_token)
    token_record = get_refresh_token_by_hash(db, token_hash)

    if not token_record:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ",
        )

    # Token reuse detection: if token is already revoked, someone is replaying it!
    if token_record.revoked:
        revoke_all_user_tokens(db, token_record.user_id)
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phát hiện token bị tái sử dụng. Tất cả các phiên đăng nhập đã bị hủy",
        )

    # Check expiration
    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        revoke_refresh_token(db, token_record)
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token đã hết hạn",
        )

    # Check user account status
    user = get_user_by_id(db, token_record.user_id)
    if not user or not user.is_active:
        revoke_refresh_token(db, token_record)
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa do vi phạm chính sách",
        )

    # Refresh rotation: revoke old token, issue new token
    revoke_refresh_token(db, token_record)

    new_raw_refresh = generate_refresh_token()
    create_refresh_token(
        db,
        user_id=user.id,
        raw_token=new_raw_refresh,
        user_agent=request.headers.get("user-agent"),
    )
    set_refresh_cookie(response, new_raw_refresh)

    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME),
):
    """Revoke current refresh token and clear cookie."""
    if refresh_token:
        token_hash = hash_token(refresh_token)
        token_record = get_refresh_token_by_hash(db, token_hash)
        if token_record and not token_record.revoked:
            revoke_refresh_token(db, token_record)

    clear_refresh_cookie(response)
    return MessageResponse(message="Đăng xuất thành công")


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve profile of currently authenticated user."""
    return UserResponse.model_validate(current_user)


# ---------------- SSO Endpoints ----------------


@router.get("/sso/{provider}/authorize")
def sso_authorize(
    provider: str,
    request: Request,
    redirect: Optional[str] = Query(None),
):
    """Initiate OAuth 2.0 Authorization Code flow for Google or GitHub."""
    provider = provider.lower()
    if provider not in ("google", "github"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhà cung cấp SSO không được hỗ trợ",
        )

    # Validate relative redirect path to prevent open redirect
    safe_redirect = "/"
    if redirect and redirect.startswith("/") and not redirect.startswith("//"):
        safe_redirect = redirect

    state = create_oauth_state(provider=provider, redirect_target=safe_redirect)
    redirect_uri = str(request.url_for("sso_callback", provider=provider))

    auth_url = get_oauth_authorize_url(provider, state, redirect_uri)
    return RedirectResponse(
        url=auth_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get("/sso/{provider}/callback", name="sso_callback")
async def sso_callback(
    provider: str,
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Handle OAuth 2.0 provider callback with state validation and identity resolution."""
    provider = provider.lower()
    if provider not in ("google", "github"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhà cung cấp SSO không được hỗ trợ",
        )

    # Provider reported an error
    if error:
        err_target = f"{settings.FRONTEND_URL}/auth/sso/callback?error={quote_plus(error)}"
        return RedirectResponse(url=err_target, status_code=status.HTTP_302_FOUND)

    # Validate state
    if not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu tham số state xác thực",
        )

    state_payload = verify_oauth_state(state, expected_provider=provider)
    if not state_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="State xác thực không hợp lệ hoặc đã hết hạn",
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu mã xác thực (code) từ nhà cung cấp SSO",
        )

    redirect_uri = str(request.url_for("sso_callback", provider=provider))

    try:
        if provider == "google":
            oauth_info = await exchange_google_code(code, redirect_uri)
        else:
            oauth_info = await exchange_github_code(code, redirect_uri)

        user = resolve_identity(db, oauth_info)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi xác thực SSO: {str(exc)}",
        )

    # Issue tokens
    raw_refresh = generate_refresh_token()
    create_refresh_token(
        db,
        user_id=user.id,
        raw_token=raw_refresh,
        user_agent=request.headers.get("user-agent"),
    )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )

    target_redirect = state_payload.get("redirect", "/")
    frontend_target = (
        f"{settings.FRONTEND_URL}/auth/sso/callback"
        f"?access_token={access_token}&redirect={quote_plus(target_redirect)}"
    )

    res = RedirectResponse(url=frontend_target, status_code=status.HTTP_302_FOUND)
    set_refresh_cookie(res, raw_refresh)
    return res
