"""
SafeTale Sync - FastAPI entry point.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from llm_client import check_llm_responding
from story_agent import build_story_graph
from ws_manager import manager as ws_manager


class GenerateStoryRequest(BaseModel):
    story_context: str = ""
    user_input: str = ""


class GenerateStoryResponse(BaseModel):
    response: str

app = FastAPI(
    title="SafeTale Sync",
    description="Real-time collaborative AI storytelling",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    """Verify the local LLM (Ollama) is responding."""
    ok, detail = await check_llm_responding()
    if not ok:
        return {"status": "unhealthy", "llm": "error", "detail": detail}
    return {"status": "healthy", "llm": "ok", "detail": detail}


@app.websocket("/ws/story/{session_id}")
async def websocket_story(websocket: WebSocket, session_id: str) -> None:
    if not session_id or not session_id.strip():
        await websocket.close(code=4000)
        return
    await ws_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_bytes()
            await ws_manager.broadcast_to_session(session_id, data, exclude=websocket)
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket, session_id)


_story_graph = None


def _get_story_graph():
    global _story_graph
    if _story_graph is None:
        _story_graph = build_story_graph()
    return _story_graph


@app.post("/api/generate-story", response_model=GenerateStoryResponse)
async def generate_story(body: GenerateStoryRequest) -> GenerateStoryResponse:
    """Run the story agent and return the continuation."""
    if not body.user_input or not body.user_input.strip():
        return GenerateStoryResponse(response="What would you like to happen next in the story?")
    graph = _get_story_graph()
    initial: dict = {
        "story_context": body.story_context or "",
        "user_input": body.user_input.strip(),
        "conversation_history": [],
        "safety_passed": False,
        "response": "",
    }
    result = graph.invoke(initial)
    response = result.get("response") or ""
    return GenerateStoryResponse(response=response)


@app.get("/")
async def root():
    return {"app": "SafeTale Sync", "docs": "/docs"}
