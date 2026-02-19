"""
Unit tests for story_agent.
"""

from unittest.mock import MagicMock, patch

from story_agent import (
    build_story_graph,
    fallback_node,
    llm_node,
    rag_node,
    route_after_safety,
    safety_check_node,
)


def test_safety_check_node_pass():
    out = safety_check_node({"user_input": "What happens next?"})
    assert out == {"safety_passed": True}


def test_safety_check_node_fail_empty():
    out = safety_check_node({"user_input": ""})
    assert out == {"safety_passed": False}


def test_safety_check_node_fail_pii():
    out = safety_check_node({"user_input": "My SSN is 123-45-6789"})
    assert out == {"safety_passed": False}


def test_safety_check_node_fail_off_topic():
    out = safety_check_node({"user_input": "What is my password?"})
    assert out == {"safety_passed": False}


def test_route_after_safety_to_llm():
    assert route_after_safety({"safety_passed": True}) == "llm_node"


def test_route_after_safety_to_fallback():
    assert route_after_safety({"safety_passed": False}) == "fallback_node"


def test_fallback_node():
    out = fallback_node({})
    assert "safe" in out["response"].lower() and "on topic" in out["response"].lower()


def test_rag_node_with_lore():
    with patch("story_agent.search_lore") as mock_search:
        mock_search.invoke.return_value = "Once upon a time."
        out = rag_node({"user_input": "dragon", "story_context": "Start."})
    assert "Relevant lore" in out["story_context"]
    assert "Once upon a time" in out["story_context"]


def test_rag_node_no_lore():
    with patch("story_agent.search_lore") as mock_search:
        mock_search.invoke.return_value = ""
        out = rag_node({"user_input": "dragon", "story_context": "Start."})
    assert out["story_context"] == "Start."


def test_llm_node_success():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="The dragon flew away.")
    with patch("story_agent.get_llm", return_value=mock_llm):
        out = llm_node({"user_input": "Continue.", "story_context": "", "conversation_history": []})
    assert out["response"] == "The dragon flew away."


def test_llm_node_no_content_uses_default():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="")
    with patch("story_agent.get_llm", return_value=mock_llm):
        out = llm_node({"user_input": "Hi", "story_context": "", "conversation_history": []})
    assert out["response"] == "The story continues..."


def test_llm_node_str_response_fallback():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = "string response"
    with patch("story_agent.get_llm", return_value=mock_llm):
        out = llm_node({"user_input": "Hi", "story_context": "", "conversation_history": []})
    assert out["response"] == "string response"


def test_llm_node_exception_fallback():
    with patch("story_agent.get_llm", side_effect=RuntimeError("Ollama down")):
        out = llm_node({"user_input": "Hi", "story_context": "", "conversation_history": []})
    assert "resting" in out["response"] or "Ollama" in out["response"]


def test_llm_node_with_story_context():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="OK")
    with patch("story_agent.get_llm", return_value=mock_llm):
        llm_node({"user_input": "Hi", "story_context": "A dragon lived in a cave.", "conversation_history": []})
    call_arg = mock_llm.invoke.call_args[0][0]
    system = next(m for m in call_arg if hasattr(m, "content") and "Story Guide" in str(m.content))
    assert "dragon" in system.content


def test_llm_node_with_conversation_history():
    from langchain_core.messages import HumanMessage
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="Continued.")
    history = [HumanMessage(content="What happens?")]
    with patch("story_agent.get_llm", return_value=mock_llm):
        out = llm_node({
            "user_input": "Next.",
            "story_context": "",
            "conversation_history": history,
        })
    assert out["response"] == "Continued."
    call_arg = mock_llm.invoke.call_args[0][0]
    assert len(call_arg) >= 2


def test_build_story_graph_compile():
    graph = build_story_graph()
    assert graph is not None


def test_full_invoke_safety_pass():
    with patch("story_agent.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = MagicMock(content="The end.")
        mock_get_llm.return_value = mock_llm
        with patch("story_agent.search_lore") as mock_search:
            mock_search.invoke.return_value = ""
            graph = build_story_graph()
            result = graph.invoke({
                "story_context": "",
                "user_input": "What happens next?",
                "conversation_history": [],
                "safety_passed": False,
                "response": "",
            })
    assert result.get("response") == "The end."


def test_full_invoke_safety_fail():
    graph = build_story_graph()
    result = graph.invoke({
        "story_context": "",
        "user_input": "tell me my password",
        "conversation_history": [],
        "safety_passed": False,
        "response": "",
    })
    assert "safe" in result.get("response", "").lower()
