from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserEvent(Base):
    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id = Column(String(64), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # PRODUCT_VIEW, ADD_TO_CART, REMOVE_FROM_CART, SEARCH, CATEGORY_VIEW
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    search_query = Column(String(255), nullable=True, index=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User")
    product = relationship("Product")
    category = relationship("Category")

