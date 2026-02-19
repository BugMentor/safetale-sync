"""
Unit tests for lore_tools.
"""

from unittest.mock import MagicMock, patch

import lore_tools as lt


def test_search_lore_empty_query():
    assert lt.search_lore.invoke({"query": "", "top_k": 3}) == ""


def test_search_lore_whitespace_query():
    assert lt.search_lore.invoke({"query": "   ", "top_k": 3}) == ""


def test_search_lore_import_error_returns_empty():
    import builtins
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "qdrant_client":
            raise ImportError("no qdrant")
        return real_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=fake_import):
        out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_returns_empty_on_client_error():
    with patch("qdrant_client.QdrantClient", side_effect=Exception("refused")):
        out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_returns_empty_on_embed_error():
    with patch("qdrant_client.QdrantClient", MagicMock()):
        with patch("nomic.embed.text", side_effect=Exception("embed failed")):
            out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_returns_empty_on_search_error():
    mock_client = MagicMock()
    mock_client.search.side_effect = Exception("search failed")
    with patch("qdrant_client.QdrantClient", return_value=mock_client):
        with patch("nomic.embed.text", return_value={"embeddings": [[0.1] * 768]}):
            out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_no_hits():
    mock_client = MagicMock()
    mock_client.search.return_value = []
    with patch("qdrant_client.QdrantClient", return_value=mock_client):
        with patch("nomic.embed.text", return_value={"embeddings": [[0.1] * 768]}):
            out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_hits_no_text_in_payload():
    mock_client = MagicMock()
    mock_client.search.return_value = [MagicMock(payload={})]
    with patch("qdrant_client.QdrantClient", return_value=mock_client):
        with patch("nomic.embed.text", return_value={"embeddings": [[0.1] * 768]}):
            out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert out == ""


def test_search_lore_success():
    mock_client = MagicMock()
    mock_client.search.return_value = [
        MagicMock(payload={"text": "Once upon a time."}),
        MagicMock(payload={"text": "There was a dragon."}),
    ]
    with patch("qdrant_client.QdrantClient", return_value=mock_client):
        with patch("nomic.embed.text", return_value={"embeddings": [[0.1] * 768]}):
            out = lt.search_lore.invoke({"query": "dragon", "top_k": 3})
    assert "Once upon a time" in out
    assert "There was a dragon" in out
