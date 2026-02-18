"""
LangGraph agent state for SafeTale Sync story generation.
"""

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """State for the story generation agent."""

    story_context: str
    user_input: str
    conversation_history: Annotated[list, add_messages]
    safety_passed: bool
    response: str
