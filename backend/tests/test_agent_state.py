"""Unit tests for agent_state (TypedDict)."""

def test_agent_state_typed_dict():
    from agent_state import AgentState
    state: AgentState = {
        "story_context": "Once upon a time",
        "user_input": "What happens next?",
        "conversation_history": [],
        "safety_passed": True,
        "response": "",
    }
    assert state["story_context"] == "Once upon a time"
    assert state["user_input"] == "What happens next?"
    assert state["safety_passed"] is True
    assert state["response"] == ""
