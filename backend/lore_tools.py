"""
LangChain tools for SafeTale Sync RAG (search_lore).
"""

from langchain_core.tools import tool

QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "safetale_lore"
NOMIC_MODEL = "nomic-embed-text-v1"


@tool
def search_lore(query: str, top_k: int = 3) -> str:
    """
    Search the fairy-tale lore database for thematic context.
    Use this to retrieve relevant story snippets before generating continuations.
    """
    if not query or not query.strip():
        return ""
    query = query.strip()
    try:
        from qdrant_client import QdrantClient
        from nomic import embed
    except ImportError:
        return ""

    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    except Exception:
        return ""

    try:
        out = embed.text(
            texts=[query],
            model=NOMIC_MODEL,
            task_type="search_query",
        )
        query_vector = out["embeddings"][0]
    except Exception:
        return ""

    try:
        hits = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=top_k,
        )
    except Exception:
        return ""

    if not hits:
        return ""
    parts = []
    for h in hits:
        if h.payload and "text" in h.payload:
            parts.append(h.payload["text"])
    return "\n\n".join(parts) if parts else ""
