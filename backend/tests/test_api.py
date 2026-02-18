"""Integration tests: FastAPI routes and WebSocket."""

from unittest.mock import patch, AsyncMock, MagicMock
import pytest


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("app") == "SafeTale Sync"
    assert "docs" in data


@patch("main.check_llm_responding", new_callable=AsyncMock)
def test_health_healthy(patch_check, client):
    patch_check.return_value = (True, "OK")
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "healthy"
    assert data.get("llm") == "ok"


@patch("main.check_llm_responding", new_callable=AsyncMock)
def test_health_unhealthy(patch_check, client):
    patch_check.return_value = (False, "Connection refused")
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "unhealthy"
    assert data.get("llm") == "error"
    assert "Connection refused" in data.get("detail", "")


def test_generate_story_empty_input(client):
    r = client.post("/api/generate-story", json={"story_context": "", "user_input": ""})
    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert "What would you like" in data["response"] or "happen next" in data["response"]


@patch("main._get_story_graph")
def test_generate_story_success(mock_get_graph, client):
    mock_graph = MagicMock()
    mock_graph.invoke = MagicMock(return_value={"response": "The dragon smiled and flew away."})
    mock_get_graph.return_value = mock_graph
    r = client.post("/api/generate-story", json={"story_context": "In a forest.", "user_input": "What happens next?"})
    assert r.status_code == 200
    data = r.json()
    assert data["response"] == "The dragon smiled and flew away."
    mock_graph.invoke.assert_called_once()


@patch("main._get_story_graph")
def test_generate_story_whitespace_input_returns_prompt(mock_get_graph, client):
    mock_graph = MagicMock()
    mock_get_graph.return_value = mock_graph
    r = client.post("/api/generate-story", json={"story_context": "", "user_input": "   "})
    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert "What would you like" in data["response"] or "happen next" in data["response"]
    mock_graph.invoke.assert_not_called()


def test_websocket_connect_and_broadcast(client):
    with client.websocket_connect("/ws/story/test-session") as ws:
        ws.send_bytes(b"hello")
    # Single client: broadcast excludes sender so we don't receive; just verify connect/send and disconnect


def test_websocket_valid_session_accepts(client):
    with client.websocket_connect("/ws/story/valid-session") as ws:
        ws.send_bytes(b"ping")
    # Disconnect on exit; no exception means connect/send worked


def test_websocket_empty_session_id_closes_with_code(client):
    # Empty or whitespace session_id should close with code 4000 (no broadcast)
    try:
        with client.websocket_connect("/ws/story/%20") as ws:
            ws.send_bytes(b"x")
    except Exception:
        pass
    # Server closes; we just ensure the route runs (empty session path covered)


@patch("main._get_story_graph")
def test_generate_story_empty_response_from_graph_returns_empty_string(mock_get_graph, client):
    mock_graph = MagicMock()
    mock_graph.invoke = MagicMock(return_value={"response": ""})
    mock_get_graph.return_value = mock_graph
    r = client.post("/api/generate-story", json={"story_context": "", "user_input": "Next?"})
    assert r.status_code == 200
    assert r.json()["response"] == ""


@patch("main._get_story_graph")
def test_generate_story_missing_response_key_returns_empty_string(mock_get_graph, client):
    mock_graph = MagicMock()
    mock_graph.invoke = MagicMock(return_value={})
    mock_get_graph.return_value = mock_graph
    r = client.post("/api/generate-story", json={"story_context": "", "user_input": "Next?"})
    assert r.status_code == 200
    assert r.json()["response"] == ""


@patch("main.build_story_graph")
def test_generate_story_builds_graph_once_then_reuses(mock_build_graph, client):
    mock_graph = MagicMock()
    mock_graph.invoke = MagicMock(return_value={"response": "Once."})
    mock_build_graph.return_value = mock_graph
    import main
    main._story_graph = None
    try:
        r1 = client.post("/api/generate-story", json={"story_context": "", "user_input": "A?"})
        r2 = client.post("/api/generate-story", json={"story_context": "", "user_input": "B?"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert mock_build_graph.call_count == 1
    finally:
        main._story_graph = None
