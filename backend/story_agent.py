"""
LangGraph story agent: safety check -> LLM or fallback.
Uses StateGraph only (no AgentExecutor).
"""

import re
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from agent_state import AgentState
from llm_client import get_llm
from lore_tools import search_lore

# Simple PII / off-topic patterns (guard clauses)
PII_PATTERN = re.compile(
    r"\b(\d{3}[-.]?\d{2}[-.]?\d{4}|\b\d{16}\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b",
    re.IGNORECASE,
)
OFF_TOPIC_KEYWORDS = {"password", "credit card", "ssn", "social security", "bank account"}


def _safety_check(text: str) -> bool:
    if not text or not text.strip():
        return False
    lower = text.lower()
    if PII_PATTERN.search(text):
        return False
    if any(kw in lower for kw in OFF_TOPIC_KEYWORDS):
        return False
    return True


def safety_check_node(state: AgentState) -> dict:
    """Validate user input for PII or off-topic content."""
    user_input = state.get("user_input") or ""
    passed = _safety_check(user_input)
    return {"safety_passed": passed}


def rag_node(state: AgentState) -> dict:
    """Retrieve thematic context from lore (RAG) and append to story_context."""
    user_input = state.get("user_input") or ""
    story_context = state.get("story_context") or ""
    lore = search_lore.invoke({"query": user_input, "top_k": 3})
    if lore:
        story_context = (story_context + "\n\nRelevant lore:\n" + lore).strip()
    return {"story_context": story_context}


def llm_node(state: AgentState) -> dict:
    """Generate story continuation using the local LLM."""
    user_input = state.get("user_input") or ""
    story_context = state.get("story_context") or ""
    history = state.get("conversation_history") or []

    system = (
        "You are a friendly Story Guide for a collaborative fairy-tale app. "
        "Keep responses short, whimsical, and suitable for all ages. "
        "Do not repeat or include PII. If story context is provided, use it."
    )
    if story_context:
        system += f"\n\nCurrent story context:\n{story_context[:2000]}"

    messages = [SystemMessage(content=system)]
    for msg in history[-10:]:
        messages.append(msg)
    messages.append(HumanMessage(content=user_input))

    try:
        llm = get_llm()
        response = llm.invoke(messages)
        content = response.content if hasattr(response, "content") else str(response)
        return {"response": content or "The story continues..."}
    except Exception:
        return {"response": "The story guide is resting. Make sure Ollama is running with llama3.1:8b and try again."}


def fallback_node(state: AgentState) -> dict:
    """Return a safe deterministic response when safety check fails."""
    return {"response": "Let's keep our tale safe and on topic. Try asking what happens next in the story!"}


def route_after_safety(state: AgentState) -> Literal["llm_node", "fallback_node"]:
    if state.get("safety_passed"):
        return "llm_node"
    return "fallback_node"


def build_story_graph() -> StateGraph:
    workflow = StateGraph(AgentState)
    workflow.add_node("safety_check_node", safety_check_node)
    workflow.add_node("rag_node", rag_node)
    workflow.add_node("llm_node", llm_node)
    workflow.add_node("fallback_node", fallback_node)

    workflow.add_edge(START, "safety_check_node")
    workflow.add_conditional_edges(
        "safety_check_node",
        route_after_safety,
        {"llm_node": "rag_node", "fallback_node": "fallback_node"},
    )
    workflow.add_edge("rag_node", "llm_node")
    workflow.add_edge("llm_node", END)
    workflow.add_edge("fallback_node", END)

    return workflow.compile()
