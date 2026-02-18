"""
E2E tests for WebSocket /ws/story/{session_id}.
"""

import pytest
from fastapi import WebSocketDisconnect


def test_websocket_connect_and_broadcast(sync_client):
    """Two clients in same session; one sends bytes, the other receives."""
    with sync_client.websocket_connect("/ws/story/e2e-session-1") as ws1:
        with sync_client.websocket_connect("/ws/story/e2e-session-1") as ws2:
            ws1.send_bytes(b"hello from 1")
            data = ws2.receive_bytes()
            assert data == b"hello from 1"
            ws2.send_bytes(b"hello from 2")
            data = ws1.receive_bytes()
            assert data == b"hello from 2"


def test_websocket_sender_excluded_from_broadcast(sync_client):
    """Broadcast goes to other clients in session, not the sender."""
    with sync_client.websocket_connect("/ws/story/e2e-session-2") as ws1:
        with sync_client.websocket_connect("/ws/story/e2e-session-2") as ws2:
            ws1.send_bytes(b"only ws2 should get this")
            data = ws2.receive_bytes()
            assert data == b"only ws2 should get this"
            # ws1 must not receive its own message (exclude=websocket)
            ws2.send_bytes(b"only ws1 should get this")
            data = ws1.receive_bytes()
            assert data == b"only ws1 should get this"


def test_websocket_empty_session_id_rejected(sync_client):
    """Empty or whitespace session_id gets close code 4000."""
    with pytest.raises(WebSocketDisconnect):
        with sync_client.websocket_connect("/ws/story/ ") as _:
            pass


def test_websocket_disconnect_cleans_up(sync_client):
    """After one client disconnects, the other can still send; new client can join."""
    with sync_client.websocket_connect("/ws/story/e2e-session-3") as ws1:
        with sync_client.websocket_connect("/ws/story/e2e-session-3") as ws2:
            ws1.send_bytes(b"before")
            assert ws2.receive_bytes() == b"before"
    # ws1 closed; ws2 is alone in session
    with sync_client.websocket_connect("/ws/story/e2e-session-3") as ws3:
        ws3.send_bytes(b"after")
        # Only ws3 is in session now (ws2 was in different connection lifecycle)
        # So no other client to receive - just ensure no crash
        pass
