# SafeTale Sync

Real-time collaborative AI storytelling platform. Built with FastAPI, React, Yjs (CRDTs), LangGraph, and local RAG. **Fully local and open-source**—no cloud LLMs. We use [git-flow](GITFLOW.md): `main` = production, `develop` = integration; do new work in `feature/*` branches.

## Tech stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI, WebSockets
- **Sync:** Yjs over custom WebSocket
- **AI:** LangGraph + LangChain, local Ollama (`llama3.1:8b`), Qdrant + nomic-embed-text for RAG

## Quick start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **Health (LLM):** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Generate story:** `POST /api/generate-story` with `{"story_context": "", "user_input": "What happens next?"}`
- **Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

Requires **Ollama** running with `llama3.1:8b` at `http://localhost:11434`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use the same session ID in multiple tabs to see collaborative editing.

### RAG (optional)

1. Run **Qdrant** (e.g. Docker): `docker run -p 6333:6333 qdrant/qdrant`
2. Ingest a fairy tale:  
   `cd backend && python -m scripts.ingest_lore data/sample_tale.txt`
3. The `/api/generate-story` flow will use `search_lore` to pull thematic context before generating.

## Project layout

- `backend/` — FastAPI app, LangGraph agent, LLM client, WebSocket manager, RAG tools and ingest script
- `frontend/` — Vite React app with Yjs-backed collaborative text area
