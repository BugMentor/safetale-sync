"""Unit tests for llm_client."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


def test_get_llm_returns_chat_ollama():
    from llm_client import get_llm, DEFAULT_MODEL, OLLAMA_BASE_URL
    llm = get_llm()
    assert llm is not None
    assert llm.model == DEFAULT_MODEL
    assert llm.base_url == OLLAMA_BASE_URL


def test_get_llm_custom_model_and_base_url():
    from llm_client import get_llm
    llm = get_llm(model="custom:7b", base_url="http://custom:11434")
    assert llm.model == "custom:7b"
    assert llm.base_url == "http://custom:11434"


@pytest.mark.asyncio
async def test_check_llm_responding_success():
    from llm_client import check_llm_responding
    with patch("llm_client.get_llm") as mock_get:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="OK"))
        mock_get.return_value = mock_llm
        ok, detail = await check_llm_responding()
    assert ok is True
    assert detail == "OK"


@pytest.mark.asyncio
async def test_check_llm_responding_empty_response():
    from llm_client import check_llm_responding
    with patch("llm_client.get_llm") as mock_get:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=""))
        mock_get.return_value = mock_llm
        ok, detail = await check_llm_responding()
    assert ok is False
    assert "empty" in detail.lower()


@pytest.mark.asyncio
async def test_check_llm_responding_exception():
    from llm_client import check_llm_responding
    with patch("llm_client.get_llm") as mock_get:
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(side_effect=Exception("Connection refused"))
        mock_get.return_value = mock_llm
        ok, detail = await check_llm_responding()
    assert ok is False
    assert "Connection refused" in detail
