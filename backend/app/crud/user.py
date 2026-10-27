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
