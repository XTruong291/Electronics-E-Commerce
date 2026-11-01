from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, hash_token, verify_password
from app.models.user import RefreshToken, User, UserRole
from app.schemas.auth import UserRegisterRequest


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve user by normalized email."""
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Retrieve user by primary key ID."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    obj_in: UserRegisterRequest,
    role: UserRole = UserRole.CUSTOMER,
) -> User:
    """Create a new local registered user."""
    db_user = User(
        email=obj_in.email.strip().lower(),
        password_hash=hash_password(obj_in.password),
        full_name=obj_in.full_name.strip(),
        phone=obj_in.phone.strip() if obj_in.phone else None,
        role=role,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> Optional[User]:
    """Authenticate user with email and plain password."""
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.password_hash:
        # OAuth-only user who hasn't set a password
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_refresh_token(
    db: Session,
    user_id: int,
    raw_token: str,
    user_agent: Optional[str] = None,
) -> RefreshToken:
    """Store SHA-256 hash of refresh token in database."""
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    db_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False,
        user_agent=user_agent,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_refresh_token_by_hash(
    db: Session,
    token_hash: str,
) -> Optional[RefreshToken]:
    """Find refresh token record by its SHA-256 hash."""
    return db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()


def revoke_refresh_token(db: Session, token: RefreshToken) -> None:
    """Revoke a single refresh token."""
    token.revoked = True
    db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    """Revoke all refresh tokens belonging to a user (used on reuse detection or security reset)."""
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update(
        {"revoked": True},
        synchronize_session="fetch",
    )
    db.commit()


def resolve_identity(db: Session, oauth_info: "OAuthUserInfo") -> User:
    """Resolve user identity from OAuth provider information.
    Covers three cases:
    (a) (provider, provider_user_id) exists -> log in that user;
    (b) email matches an existing user and email_verified is true -> link account;
    (c) new email -> create user with password_hash = NULL, role CUSTOMER, plus oauth_accounts row.
    Rejects linking when email_verified is false.
    """
    from fastapi import HTTPException, status
    from app.models.user import OAuthAccount

    # Case (a): (provider, provider_user_id) exists
    oauth_acc = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == oauth_info.provider,
            OAuthAccount.provider_user_id == str(oauth_info.provider_user_id),
        )
        .first()
    )
    if oauth_acc:
        user = get_user_by_id(db, oauth_acc.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản liên kết không tồn tại",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa do vi phạm chính sách",
            )
        if not user.avatar_url and oauth_info.avatar_url:
            user.avatar_url = oauth_info.avatar_url
            db.commit()
        return user

    # If not previously linked, email is mandatory
    if not oauth_info.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy email từ tài khoản SSO",
        )

    normalized_email = oauth_info.email.strip().lower()
    existing_user = get_user_by_email(db, normalized_email)

    # Case (b): Email matches existing user
    if existing_user:
        if not oauth_info.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email chưa được xác thực bởi nhà cung cấp. Không thể tự động liên kết tài khoản",
            )
        if not existing_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa do vi phạm chính sách",
            )

        new_oauth = OAuthAccount(
            user_id=existing_user.id,
            provider=oauth_info.provider,
            provider_user_id=str(oauth_info.provider_user_id),
        )
        db.add(new_oauth)
        if not existing_user.avatar_url and oauth_info.avatar_url:
            existing_user.avatar_url = oauth_info.avatar_url
        db.commit()
        db.refresh(existing_user)
        return existing_user

    # Case (c): New email -> create user with password_hash=None and role CUSTOMER
    new_user = User(
        email=normalized_email,
        password_hash=None,
        full_name=oauth_info.full_name or normalized_email.split("@")[0],
        avatar_url=oauth_info.avatar_url,
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    new_oauth = OAuthAccount(
        user_id=new_user.id,
        provider=oauth_info.provider,
        provider_user_id=str(oauth_info.provider_user_id),
    )
    db.add(new_oauth)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user_profile(
    db: Session,
    user: User,
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
) -> User:
    """Update profile fields for a user."""
    if full_name is not None:
        user.full_name = full_name.strip()
    if phone is not None:
        user.phone = phone.strip() if phone else None
    db.commit()
    db.refresh(user)
    return user


def get_user_addresses(db: Session, user_id: int):
    """Retrieve all addresses belonging to a user."""
    from app.models.user import UserAddress

    return (
        db.query(UserAddress)
        .filter(UserAddress.user_id == user_id)
        .order_by(UserAddress.is_default.desc(), UserAddress.id.desc())
        .all()
    )


def get_user_address_by_id(db: Session, address_id: int, user_id: int):
    """Retrieve a single address belonging to user."""
    from app.models.user import UserAddress

    return (
        db.query(UserAddress)
        .filter(UserAddress.id == address_id, UserAddress.user_id == user_id)
        .first()
    )


def create_user_address(
    db: Session,
    user_id: int,
    recipient: str,
    phone: str,
    province: str,
    district: str,
    ward: str,
    detail: str,
    is_default: bool = False,
):
    """Create a new address. If is_default is True or first address, sets as sole default."""
    from app.models.user import UserAddress

    existing_count = (
        db.query(UserAddress).filter(UserAddress.user_id == user_id).count()
    )
    if existing_count == 0:
        is_default = True

    if is_default:
        db.query(UserAddress).filter(UserAddress.user_id == user_id).update(
            {"is_default": False}
        )

    address = UserAddress(
        user_id=user_id,
        recipient=recipient.strip(),
        phone=phone.strip(),
        province=province.strip(),
        district=district.strip(),
        ward=ward.strip(),
        detail=detail.strip(),
        is_default=is_default,
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


def update_user_address(
    db: Session,
    address,
    recipient: Optional[str] = None,
    phone: Optional[str] = None,
    province: Optional[str] = None,
    district: Optional[str] = None,
    ward: Optional[str] = None,
    detail: Optional[str] = None,
    is_default: Optional[bool] = None,
):
    """Update address fields. If is_default becomes True, unset others."""
    from app.models.user import UserAddress

    if is_default is True:
        db.query(UserAddress).filter(
            UserAddress.user_id == address.user_id,
            UserAddress.id != address.id,
        ).update({"is_default": False})
        address.is_default = True
    elif is_default is False:
        address.is_default = False

    if recipient is not None:
        address.recipient = recipient.strip()
    if phone is not None:
        address.phone = phone.strip()
    if province is not None:
        address.province = province.strip()
    if district is not None:
        address.district = district.strip()
    if ward is not None:
        address.ward = ward.strip()
    if detail is not None:
        address.detail = detail.strip()

    db.commit()
    db.refresh(address)
    return address


def delete_user_address(db: Session, address) -> None:
    """Delete an address. If default was deleted, promote another address to default if exists."""
    from app.models.user import UserAddress

    was_default = address.is_default
    user_id = address.user_id
    db.delete(address)
    db.commit()

    if was_default:
        next_addr = (
            db.query(UserAddress).filter(UserAddress.user_id == user_id).first()
        )
        if next_addr:
            next_addr.is_default = True
            db.commit()


def list_users(
    db: Session,
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
):
    """List users with search, role/status filtering, and pagination."""
    query = db.query(User)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((User.email.ilike(s)) | (User.full_name.ilike(s)))
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    items = (
        query.order_by(User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def delete_user(db: Session, user: User) -> None:
    """Permanently delete a user account.
    Disassociates user's order history by setting order.user_id = None.
    Cascades deletion to refresh_tokens, oauth_accounts, and user_addresses.
    """
    from app.models.order import Order

    # 1. Disassociate placed orders so historical order data remains intact for store accounting
    db.query(Order).filter(Order.user_id == user.id).update({Order.user_id: None})

    # 2. Delete user
    db.delete(user)
    db.commit()


