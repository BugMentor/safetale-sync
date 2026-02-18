"""
WebSocket connection manager for story sessions.
Broadcasts every message from one client to all others in the same session.
"""

from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._sessions: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        await websocket.accept()
        self._sessions[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        if session_id not in self._sessions:
            return
        self._sessions[session_id] = [ws for ws in self._sessions[session_id] if ws != websocket]
        if not self._sessions[session_id]:
            del self._sessions[session_id]

    async def broadcast_to_session(
        self, session_id: str, message: bytes | str, exclude: WebSocket | None = None
    ) -> None:
        if session_id not in self._sessions:
            return
        data: bytes = message.encode("utf-8") if isinstance(message, str) else message
        dead: list[WebSocket] = []
        for ws in self._sessions[session_id]:
            if ws is exclude:
                continue
            try:
                await ws.send_bytes(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, session_id)


manager = ConnectionManager()
