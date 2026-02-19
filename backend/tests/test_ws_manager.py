"""
Unit tests for ws_manager.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from ws_manager import ConnectionManager


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.mark.asyncio
async def test_connect_accepts_and_stores(manager):
    ws = MagicMock()
    ws.accept = AsyncMock()
    await manager.connect(ws, "s1")
    ws.accept.assert_called_once()
    assert ws in manager._sessions["s1"]


@pytest.mark.asyncio
async def test_disconnect_removes_and_cleans_session(manager):
    ws = MagicMock()
    ws.accept = AsyncMock()
    await manager.connect(ws, "s1")
    manager.disconnect(ws, "s1")
    assert "s1" not in manager._sessions


def test_disconnect_unknown_session_no_op(manager):
    ws = MagicMock()
    manager.disconnect(ws, "unknown")
    assert "unknown" not in manager._sessions


@pytest.mark.asyncio
async def test_broadcast_to_session_excludes_sender(manager):
    ws1 = MagicMock()
    ws1.accept = AsyncMock()
    ws2 = MagicMock()
    ws2.accept = AsyncMock()
    ws2.send_bytes = AsyncMock()
    await manager.connect(ws1, "s1")
    await manager.connect(ws2, "s1")
    await manager.broadcast_to_session("s1", b"hello", exclude=ws1)
    ws2.send_bytes.assert_called_once_with(b"hello")
    ws1.send_bytes.assert_not_called()


@pytest.mark.asyncio
async def test_broadcast_sends_str_as_utf8(manager):
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_bytes = AsyncMock()
    await manager.connect(ws, "s1")
    await manager.broadcast_to_session("s1", "hello", exclude=None)
    ws.send_bytes.assert_called_once_with(b"hello")


@pytest.mark.asyncio
async def test_broadcast_unknown_session_no_op(manager):
    await manager.broadcast_to_session("nonexistent", b"x", exclude=None)
    # no raise, no side effect


@pytest.mark.asyncio
async def test_broadcast_dead_connection_removed(manager):
    ws1 = MagicMock()
    ws1.accept = AsyncMock()
    ws1.send_bytes = AsyncMock()
    ws2 = MagicMock()
    ws2.accept = AsyncMock()
    ws2.send_bytes = AsyncMock(side_effect=Exception("broken"))
    await manager.connect(ws1, "s1")
    await manager.connect(ws2, "s1")
    await manager.broadcast_to_session("s1", b"hello", exclude=None)
    ws1.send_bytes.assert_called_once_with(b"hello")
    assert ws2 not in manager._sessions.get("s1", [])
    await manager.broadcast_to_session("s1", b"second", exclude=None)
    assert ws1.send_bytes.call_count == 2
    ws1.send_bytes.assert_any_call(b"second")
