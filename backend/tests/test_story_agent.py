"""Unit tests for story_agent."""

from unittest.mock import patch, MagicMock
import pytest


def test_safety_check_node_passes_clean_input():
    from story_agent import safety_check_node
    out = safety_check_node({"user_input": "What happens next?", "safety_passed": False})
    assert out == {"safety_passed": True}


def test_safety_check_node_fails_empty():
    from story_agent import safety_check_node
    out = safety_check_node({"user_input": "", "safety_passed": False})
    assert out == {"safety_passed": False}


def test_safety_check_node_fails_pii():
    from story_agent import safety_check_node
    out = safety_check_node({"user_input": "Email user@example.com", "safety_passed": False})
    assert out == {"safety_passed": False}


def test_safety_check_node_fails_off_topic():
    from story_agent import safety_check_node
    out = safety_check_node({"user_input": "What is my password?", "safety_passed": False})
    assert out == {"safety_passed": False}


def test_fallback_node_returns_safe_message():
    from story_agent import fallback_node
    out = fallback_node({"user_input": "bad", "response": ""})
    assert out["response"] and ("safe" in out["response"].lower() or "topic" in out["response"].lower())


def test_route_after_safety_to_llm_when_passed():
    from story_agent import route_after_safety
    assert route_after_safety({"safety_passed": True}) == "llm_node"


def test_route_after_safety_to_fallback_when_failed():
    from story_agent import route_after_safety
    assert route_after_safety({"safety_passed": False}) == "fallback_node"


@patch("story_agent.get_llm")
def test_llm_node_success(mock_get_llm):
    from story_agent import llm_node
    mock_get_llm.return_value.invoke = MagicMock(return_value=MagicMock(content="The dragon smiled."))
    out = llm_node({"story_context": "", "user_input": "Next?", "conversation_history": [], "safety_passed": True, "response": ""})
    assert out["response"] == "The dragon smiled."


@patch("story_agent.get_llm")
def test_llm_node_with_history_and_story_context(mock_get_llm):
    from langchain_core.messages import HumanMessage, AIMessage
    from story_agent import llm_node
    mock_get_llm.return_value.invoke = MagicMock(return_value=MagicMock(content="Continued."))
    history = [HumanMessage(content="Hi"), AIMessage(content="Hello!")]
    out = llm_node({
        "story_context": "Once upon a time.",
        "user_input": "Next?",
        "conversation_history": history,
        "safety_passed": True,
        "response": "",
    })
    assert out["response"] == "Continued."
    call_args = mock_get_llm.return_value.invoke.call_args[0][0]
    assert any("Once upon a time" in str(getattr(m, "content", m)) for m in call_args)


@patch("story_agent.get_llm")
def test_llm_node_fallback_on_exception(mock_get_llm):
    from story_agent import llm_node
    mock_get_llm.return_value.invoke = MagicMock(side_effect=Exception("Ollama not running"))
    out = llm_node({"story_context": "", "user_input": "Next?", "conversation_history": [], "safety_passed": True, "response": ""})
    assert "Ollama" in out["response"] or "resting" in out["response"]


@patch("story_agent.get_llm")
def test_llm_node_response_without_content_uses_str(mock_get_llm):
    from story_agent import llm_node
    # Response with no .content attribute so hasattr(response, "content") is False -> str(response)
    class NoContent:
        def __str__(self):
            return "no-content"
    mock_get_llm.return_value.invoke = MagicMock(return_value=NoContent())
    out = llm_node({"story_context": "", "user_input": "Next?", "conversation_history": [], "safety_passed": True, "response": ""})
    assert out["response"] == "no-content"


@patch("story_agent.get_llm")
def test_llm_node_empty_content_returns_fallback_phrase(mock_get_llm):
    from story_agent import llm_node
    # content or "The story continues..." when content is ""
    mock_get_llm.return_value.invoke = MagicMock(return_value=MagicMock(content=""))
    out = llm_node({"story_context": "", "user_input": "Next?", "conversation_history": [], "safety_passed": True, "response": ""})
    assert out["response"] == "The story continues..."


@patch("story_agent.search_lore")
def test_rag_node_appends_lore(mock_search_lore):
    from story_agent import rag_node
    mock_search_lore.invoke = MagicMock(return_value="Relevant snippet.")
    out = rag_node({"story_context": "Current.", "user_input": "dragon", "conversation_history": [], "safety_passed": True, "response": ""})
    assert "Current." in out["story_context"] and "Relevant snippet" in out["story_context"]


@patch("story_agent.search_lore")
def test_rag_node_empty_lore_keeps_context(mock_search_lore):
    from story_agent import rag_node
    mock_search_lore.invoke = MagicMock(return_value="")
    out = rag_node({"story_context": "Only this.", "user_input": "q", "conversation_history": [], "safety_passed": True, "response": ""})
    assert out["story_context"] == "Only this."


def test_build_story_graph_invoke_fallback_path():
    from story_agent import build_story_graph
    graph = build_story_graph()
    result = graph.invoke({"story_context": "", "user_input": "password", "conversation_history": [], "safety_passed": False, "response": ""})
    assert "response" in result and result["response"]
