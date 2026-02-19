"""
Unit tests for llm_client.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from llm_client import check_llm_responding, get_llm


def test_get_llm_default():
    with patch("llm_client.ChatOllama") as mock_ollama:
        get_llm()
    mock_ollama.assert_called_once()
    kwargs = mock_ollama.call_args[1]
    assert kwargs["base_url"] == "http://localhost:11434"
    assert kwargs["model"] == "llama3.1:8b"
    assert kwargs["temperature"] == 0.7


@pytest.mark.asyncio
async def test_check_llm_responding_ok():
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="OK"))
    with patch("llm_client.get_llm", return_value=mock_llm):
        ok, detail = await check_llm_responding()
    assert ok is True
    assert detail == "OK"


@pytest.mark.asyncio
async def test_check_llm_responding_empty_content():
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content=""))
    with patch("llm_client.get_llm", return_value=mock_llm):
        ok, detail = await check_llm_responding()
    assert ok is False
    assert "empty" in detail.lower()


@pytest.mark.asyncio
async def test_check_llm_responding_none_content():
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=MagicMock(spec=[]))
    with patch("llm_client.get_llm", return_value=mock_llm):
        ok, _detail = await check_llm_responding()
    assert ok is False


@pytest.mark.asyncio
async def test_check_llm_responding_exception():
    with patch("llm_client.get_llm", side_effect=ConnectionError("Connection refused")):
        ok, detail = await check_llm_responding()
    assert ok is False
    assert "Connection refused" in detail
