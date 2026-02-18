"""Unit tests for lore_tools (search_lore). Mock Qdrant and nomic."""

from unittest.mock import patch, MagicMock


def test_search_lore_empty_query():
    from lore_tools import search_lore
    assert search_lore.invoke({"query": "", "top_k": 3}) == ""
    assert search_lore.invoke({"query": "   ", "top_k": 3}) == ""


@patch("qdrant_client.QdrantClient")
def test_search_lore_returns_concatenated_payload_text(mock_client_class):
    import nomic
    import lore_tools
    mock_embed = MagicMock()
    mock_embed.text = MagicMock(return_value={"embeddings": [[0.1] * 768]})
    mock_client = MagicMock()
    mock_client.search = MagicMock(return_value=[
        MagicMock(payload={"text": "First chunk"}),
        MagicMock(payload={"text": "Second chunk"}),
    ])
    mock_client_class.return_value = mock_client
    with patch.object(nomic, "embed", mock_embed, create=True):
        result = lore_tools.search_lore.invoke({"query": "knight", "top_k": 3})
    assert "First chunk" in result and "Second chunk" in result


@patch("qdrant_client.QdrantClient")
def test_search_lore_no_hits_returns_empty(mock_client_class):
    import nomic
    import lore_tools
    mock_embed = MagicMock()
    mock_embed.text = MagicMock(return_value={"embeddings": [[0.1] * 768]})
    mock_client = MagicMock()
    mock_client.search = MagicMock(return_value=[])
    mock_client_class.return_value = mock_client
    with patch.object(nomic, "embed", mock_embed, create=True):
        result = lore_tools.search_lore.invoke({"query": "nonexistent", "top_k": 3})
    assert result == ""


@patch("qdrant_client.QdrantClient", side_effect=Exception("Qdrant down"))
def test_search_lore_client_failure_returns_empty(_mock_client):
    import lore_tools
    result = lore_tools.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert result == ""


def test_search_lore_import_error_returns_empty():
    import sys
    import types
    import lore_tools
    # Module with no QdrantClient so "from qdrant_client import QdrantClient" raises ImportError
    fake = types.ModuleType("qdrant_client")
    saved = sys.modules.get("qdrant_client")
    sys.modules["qdrant_client"] = fake
    try:
        result = lore_tools.search_lore.invoke({"query": "x", "top_k": 3})
        assert result == ""
    finally:
        if saved is not None:
            sys.modules["qdrant_client"] = saved
        else:
            sys.modules.pop("qdrant_client", None)


@patch("qdrant_client.QdrantClient")
def test_search_lore_embed_exception_returns_empty(mock_client_class):
    import nomic
    import lore_tools
    mock_embed = MagicMock()
    mock_embed.text = MagicMock(side_effect=Exception("embed failed"))
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    with patch.object(nomic, "embed", mock_embed, create=True):
        result = lore_tools.search_lore.invoke({"query": "knight", "top_k": 3})
    assert result == ""


@patch("qdrant_client.QdrantClient")
def test_search_lore_search_exception_returns_empty(mock_client_class):
    import nomic
    import lore_tools
    mock_embed = MagicMock()
    mock_embed.text = MagicMock(return_value={"embeddings": [[0.1] * 768]})
    mock_client = MagicMock()
    mock_client.search = MagicMock(side_effect=Exception("search failed"))
    mock_client_class.return_value = mock_client
    with patch.object(nomic, "embed", mock_embed, create=True):
        result = lore_tools.search_lore.invoke({"query": "knight", "top_k": 3})
    assert result == ""


@patch("qdrant_client.QdrantClient")
def test_search_lore_hits_without_text_in_payload_returns_empty(mock_client_class):
    import nomic
    import lore_tools
    mock_embed = MagicMock()
    mock_embed.text = MagicMock(return_value={"embeddings": [[0.1] * 768]})
    mock_client = MagicMock()
    mock_client.search = MagicMock(return_value=[
        MagicMock(payload={"other": "key"}),
        MagicMock(payload=None),
    ])
    mock_client_class.return_value = mock_client
    with patch.object(nomic, "embed", mock_embed, create=True):
        result = lore_tools.search_lore.invoke({"query": "knight", "top_k": 3})
    assert result == ""
