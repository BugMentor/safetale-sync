"""
Tests for main app: root and any edge cases not covered by E2E.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocketDisconnect

from main import app, websocket_story, _get_story_graph


def test_get_story_graph_builds_and_caches():
    """Cover _get_story_graph: first call builds, second returns cached."""
    mock_graph = MagicMock()
    with patch("main._story_graph", None), patch("main.build_story_graph", return_value=mock_graph):
        g1 = _get_story_graph()
        g2 = _get_story_graph()
    assert g1 is mock_graph
    assert g2 is mock_graph


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["app"] == "SafeTale Sync"
    assert data["docs"] == "/docs"


@pytest.mark.asyncio
async def test_websocket_story_receive_and_broadcast():
    """Call websocket_story directly to cover try/while/receive_bytes/broadcast/finally (lines 67-69)."""
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.send_bytes = AsyncMock()
    # First receive returns data, second raises so we exit loop and hit finally
    ws.receive_bytes = AsyncMock(side_effect=[b"hello", WebSocketDisconnect()])
    # Don't patch ws_manager so handler body is traced by coverage
    await websocket_story(ws, "unit-session")
    from ws_manager import manager as real_manager
    assert ws not in real_manager._sessions.get("unit-session", [])


@pytest.mark.asyncio
async def test_websocket_story_disconnect_after_receive():
    """Cover WebSocketDisconnect path and finally."""
    ws = MagicMock()
    ws.accept = AsyncMock()
    ws.receive_bytes = AsyncMock(side_effect=WebSocketDisconnect())
    ws_manager = MagicMock()
    ws_manager.connect = AsyncMock()
    ws_manager.broadcast_to_session = AsyncMock()
    ws_manager.disconnect = MagicMock()
    with patch("main.ws_manager", ws_manager):
        await websocket_story(ws, "unit-session")
    ws_manager.disconnect.assert_called_once_with(ws, "unit-session")
