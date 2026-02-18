#!/usr/bin/env python3
"""
Ingest a text file (e.g. fairy tale) into Qdrant for RAG.
Chunks the text, embeds with nomic-embed-text, upserts to the safetale_lore collection.
Usage: python -m scripts.ingest_lore <path_to_text_file>
"""

import re
import sys
from pathlib import Path

# Add backend root so we can import from lore_tools
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "safetale_lore"
NOMIC_MODEL = "nomic-embed-text-v1"
def chunk_text(text: str, max_chars: int = 400) -> list[str]:
    """Split text into overlapping chunks (by paragraphs/sentences)."""
    if not text or not text.strip():
        return []
    text = text.strip()
    # Prefer splitting on double newline, then single, then sentence end
    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[str] = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(p) <= max_chars:
            chunks.append(p)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", p)
        current = []
        current_len = 0
        for s in sentences:
            if current_len + len(s) > max_chars and current:
                chunks.append(" ".join(current))
                current = []
                current_len = 0
            current.append(s)
            current_len += len(s)
        if current:
            chunks.append(" ".join(current))
    return chunks


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.ingest_lore <path_to_text_file>", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.exists() or not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    raw = path.read_text(encoding="utf-8", errors="replace")
    chunks = chunk_text(raw)
    if not chunks:
        print("No chunks produced.", file=sys.stderr)
        sys.exit(1)

    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, PointStruct, VectorParams
        from nomic import embed
    except ImportError as e:
        print(f"Missing dependency: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    except Exception as e:
        print(f"Qdrant connection failed (is Docker running?): {e}", file=sys.stderr)
        sys.exit(1)

    try:
        out = embed.text(
            texts=chunks,
            model=NOMIC_MODEL,
            task_type="search_document",
        )
        embeddings = out["embeddings"]
    except Exception as e:
        print(f"Embedding failed: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=len(embeddings[0]), distance=Distance.COSINE),
        )
    except Exception as e:
        print(f"Collection create failed: {e}", file=sys.stderr)
        sys.exit(1)

    points = [
        PointStruct(id=i, vector=emb, payload={"text": chunks[i]})
        for i, emb in enumerate(embeddings)
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"Ingested {len(chunks)} chunks into {COLLECTION_NAME}.")


if __name__ == "__main__":
    main()
