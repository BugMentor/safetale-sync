"""
Pytest fixtures for SafeTale Sync backend tests.
E2E tests use TestClient (in-process) so coverage is collected; no live server required.
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """HTTP client for E2E API tests (sync TestClient)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sync_client():
    """Alias for client; synchronous TestClient for WebSocket and API tests."""
    with TestClient(app) as c:
        yield c
