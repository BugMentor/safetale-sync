"""Unit tests for ws_manager (ConnectionManager)."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import WebSocket


@pytest.fixture
def manager():
    from ws_manager import ConnectionManager
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    ws = MagicMock(spec=WebSocket)
    ws.accept = AsyncMock()
    ws.send_bytes = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_connect_accepts_and_registers(manager, mock_websocket):
    await manager.connect(mock_websocket, "session-1")
    mock_websocket.accept.assert_called_once()
    assert "session-1" in manager._sessions
    assert mock_websocket in manager._sessions["session-1"]


@pytest.mark.asyncio
async def test_disconnect_removes_websocket(manager, mock_websocket):
    await manager.connect(mock_websocket, "session-1")
    manager.disconnect(mock_websocket, "session-1")
    assert "session-1" not in manager._sessions or mock_websocket not in manager._sessions["session-1"]


@pytest.mark.asyncio
async def test_disconnect_nonexistent_session_no_op(manager, mock_websocket):
    manager.disconnect(mock_websocket, "no-such-session")
    assert "no-such-session" not in manager._sessions


@pytest.mark.asyncio
async def test_broadcast_to_session_sends_to_others_not_sender(manager, mock_websocket):
    other = MagicMock(spec=WebSocket)
    other.accept = AsyncMock()
    other.send_bytes = AsyncMock()
    await manager.connect(mock_websocket, "room")
    await manager.connect(other, "room")
    await manager.broadcast_to_session("room", b"hello", exclude=mock_websocket)
    other.send_bytes.assert_called_once_with(b"hello")
    mock_websocket.send_bytes.assert_not_called()


@pytest.mark.asyncio
async def test_broadcast_to_session_encodes_str(manager, mock_websocket):
    await manager.connect(mock_websocket, "room")
    await manager.broadcast_to_session("room", "text message", exclude=None)
    mock_websocket.send_bytes.assert_called_once_with(b"text message")


@pytest.mark.asyncio
async def test_broadcast_to_nonexistent_session_no_op(manager):
    await manager.broadcast_to_session("missing", b"data")
    # No exception, no sends
    assert "missing" not in manager._sessions


@pytest.mark.asyncio
async def test_broadcast_send_bytes_exception_disconnects_dead_client(manager, mock_websocket):
    dead_ws = MagicMock(spec=WebSocket)
    dead_ws.accept = AsyncMock()
    dead_ws.send_bytes = AsyncMock(side_effect=Exception("connection closed"))
    await manager.connect(mock_websocket, "room")
    await manager.connect(dead_ws, "room")
    await manager.broadcast_to_session("room", b"msg", exclude=None)
    mock_websocket.send_bytes.assert_called_once_with(b"msg")
    dead_ws.send_bytes.assert_called_once()
    # Dead client should be removed from session
    assert dead_ws not in manager._sessions.get("room", [])
