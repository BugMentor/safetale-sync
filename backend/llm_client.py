"""
Local LLM client for SafeTale Sync.
Uses LangChain ChatOllama pointed at the local Ollama instance.
"""

from langchain_ollama import ChatOllama

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1:8b"


def get_llm(model: str = DEFAULT_MODEL, base_url: str = OLLAMA_BASE_URL) -> ChatOllama:
    """Return a ChatOllama instance for local inference."""
    return ChatOllama(
        base_url=base_url,
        model=model,
        temperature=0.7,
    )


async def check_llm_responding() -> "tuple[bool, str]":
    """
    Verify the local LLM is responding.
    Returns (success, message).
    """
    try:
        llm = get_llm()
        response = await llm.ainvoke("Say OK in one word.")
        if not response or not response.content:
            return False, "LLM returned empty response"
        return True, str(response.content).strip()
    except Exception as e:
        return False, str(e)
