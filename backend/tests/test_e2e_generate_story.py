"""
E2E tests for POST /api/generate-story.
"""

from unittest.mock import MagicMock, patch


def test_generate_story_success(client):
    mock_graph = MagicMock()
    mock_graph.invoke.return_value = {"response": "The dragon smiled and flew away."}
    with patch("main._get_story_graph", return_value=mock_graph):
        r = client.post(
            "/api/generate-story",
            json={"story_context": "Once upon a time.", "user_input": "What does the dragon do?"},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["response"] == "The dragon smiled and flew away."
    mock_graph.invoke.assert_called_once()
    call_arg = mock_graph.invoke.call_args[0][0]
    assert call_arg["story_context"] == "Once upon a time."
    assert call_arg["user_input"] == "What does the dragon do?"
    assert call_arg["conversation_history"] == []


def test_generate_story_empty_user_input(client):
    r = client.post(
        "/api/generate-story",
        json={"story_context": "Once.", "user_input": ""},
    )
    assert r.status_code == 200
    assert r.json()["response"] == "What would you like to happen next in the story?"


def test_generate_story_whitespace_only_user_input(client):
    r = client.post(
        "/api/generate-story",
        json={"story_context": "", "user_input": "   "},
    )
    assert r.status_code == 200
    assert r.json()["response"] == "What would you like to happen next in the story?"


def test_generate_story_empty_response_from_graph(client):
    mock_graph = MagicMock()
    mock_graph.invoke.return_value = {"response": ""}
    with patch("main._get_story_graph", return_value=mock_graph):
        r = client.post(
            "/api/generate-story",
            json={"story_context": "", "user_input": "Continue."},
        )
    assert r.status_code == 200
    assert r.json()["response"] == ""
