import os
import sys
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.rate_limit import reset_rate_limits, set_rate_limiting_enabled
from app.database import SessionLocal
from app.main import app
from app.models.user import OAuthAccount, RefreshToken, User, UserAddress


@pytest.fixture(autouse=True)
def configure_test_environment():
    """Disable rate limiting and reset memory state for clean test execution."""
    set_rate_limiting_enabled(False)
    reset_rate_limits()
    yield
    set_rate_limiting_enabled(True)
    reset_rate_limits()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a database session for test setup and verification."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient with cookies and full request support."""
    with TestClient(app) as test_client:
        yield test_client
