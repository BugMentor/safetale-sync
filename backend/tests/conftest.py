"""
Pytest fixtures for SafeTale Sync backend tests.
Mocks Ollama and Qdrant so tests run without external services.
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on path
_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))


@pytest.fixture
def client():
    """FastAPI test client. LLM is mocked at app level via patch in integration tests."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_llm_ok():
    """Mock ChatOllama that returns a successful response."""
    mock = MagicMock()
    mock.ainvoke = AsyncMock(return_value=MagicMock(content="OK"))
    mock.invoke = MagicMock(return_value=MagicMock(content="The dragon smiled."))
    return mock


@pytest.fixture
def mock_llm_fail():
    """Mock ChatOllama that raises."""
    mock = MagicMock()
    mock.ainvoke = AsyncMock(side_effect=Exception("Connection refused"))
    mock.invoke = MagicMock(side_effect=Exception("Connection refused"))
    return mock


@pytest.fixture
def mock_search_lore():
    """Mock search_lore tool returning fixed lore."""
    mock = MagicMock()
    mock.invoke = MagicMock(return_value="Once there was a brave knight.")
    return mock
