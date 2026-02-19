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

### Backend tests (pytest)

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Unit tests cover `llm_client`, `story_agent` (safety, LLM fallback, RAG node), `lore_tools`, `ws_manager`, and `agent_state`. Integration tests cover `GET /api/health`, `POST /api/generate-story`, and WebSocket `/ws/story/{session_id}`. Ollama and Qdrant are mocked so tests run without external services.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use the same session ID in multiple tabs to see collaborative editing.

### Frontend tests (Vitest + Playwright)

Unit and integration tests (Vitest):

```bash
cd frontend
npm install
npm run test:run
```

E2E tests (Playwright; optional, run manually or pre-release):

```bash
cd frontend
npm install
npx playwright install chromium   # first time only
npm run test:e2e                  # starts dev server and runs tests
npm run test:e2e:ui               # interactive UI mode
```

### RAG (optional)

1. Run **Qdrant** (e.g. Docker): `docker run -p 6333:6333 qdrant/qdrant`
2. Ingest a fairy tale:  
   `cd backend && python -m scripts.ingest_lore data/sample_tale.txt`
3. The `/api/generate-story` flow will use `search_lore` to pull thematic context before generating.

## Backend testing (E2E + unit, 100% coverage)

Backend tests are **E2E-style** (HTTP and WebSocket against the FastAPI app in-process) plus **unit tests** for all modules. No live Ollama or Qdrant is required; tests use mocks.

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -v --cov=. --cov-report=term-missing --cov-fail-under=100
```

- **E2E coverage:** `GET /api/health`, `POST /api/generate-story`, `GET /`, WebSocket `/ws/story/{session_id}` (connect, send/receive bytes, broadcast, empty session rejected).
- **Unit coverage:** `llm_client`, `ws_manager`, `story_agent`, `lore_tools`, `main` (including graph caching and websocket handler paths).
- **Optional:** To run against a **live server** (e.g. for manual or CI smoke tests), start the backend with `uvicorn main:app --host 0.0.0.0 --port 8000` and use `curl` or the frontend against it; the pytest suite does not start a separate process.

## CI

On push and pull requests to `main` and `develop`, GitHub Actions runs **backend tests** (pytest) and **frontend tests** (Vitest `npm run test:run`). These checks can be required for merge via branch protection. E2E (Playwright) is not run in CI and can be executed manually or before release.

## Project layout

- `backend/` — FastAPI app, LangGraph agent, LLM client, WebSocket manager, RAG tools and ingest script; **pytest** unit and integration tests in `tests/`
- `frontend/` — Vite React app with Yjs-backed collaborative text area and Playwright E2E tests in `e2e/`
