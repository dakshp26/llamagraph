# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start both services (frontend on :3000, backend on :8000)
pnpm dev

# Frontend only
pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter frontend lint

# Backend — use uv (no manual venv activation needed)
cd backend
uv sync --all-groups          # install deps + dev tools
uv run uvicorn main:app --reload --port 8000
uv run ruff check
uv run pytest

# Docker (primary run method)
docker compose up --build
```

## Architecture

LlamaGraph is a visual AI pipeline builder. Users drag-and-drop nodes onto a canvas, connect them, and run pipelines that stream responses from a local Ollama LLM. Designed for non-technical end users.

**Monorepo layout:**
- `frontend/` — Next.js 16 (App Router), React 19, XYFlow, Zustand, Tailwind CSS 4
- `backend/` — Python 3.11, FastAPI, Uvicorn, Ollama client, Pydantic v2, uv
- `README.md` — setup, scripts, and API overview

**Frontend state:**
- `store/pipelineStore.ts` — owns the graph (nodes, edges, viewport)
- `store/executionStore.ts` — owns run state, per-node status, streaming token output
- `store/validationStore.ts` — Ollama health, graph validity, validation issues

**Key frontend files:**
- `lib/sseClient.ts` — SSE stream consumer for pipeline run events
- `lib/pipelineFile.ts` — save/load `.llamagraph.json` with schema versioning

**Backend request flow:**
1. `POST /pipeline/validate` — polled continuously by the UI; validates graph and returns `ValidationErrorItem[]`
2. `POST /pipeline/run` receives full graph JSON
3. `services/graph.py` validates and topologically sorts the DAG
4. `services/executor.py` executes node by node; condition nodes mark unreachable branches as skipped
5. `services/node_handlers.py` dispatches per-type async handlers
6. LLM nodes stream tokens via SSE; `services/ollama_client.py` wraps the Ollama API
7. `services/pipeline_utils.py` handles SSE formatting, template resolution, condition matching
8. Frontend consumes SSE events (`token`, `node_status`, `error`, `done`)

**API surface:**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/ollama/health` | Ollama connectivity check |
| `GET` | `/ollama/models` | Available model list |
| `POST` | `/pipeline/validate` | Graph validation — polled continuously by the UI |
| `POST` | `/pipeline/run` | Pipeline execution — returns an SSE stream |

**Six node types:** Input → Prompt (template) → Transform (regex/field extract) → Condition (branch) → LLM (Ollama) → Output

**Engineering constraints:**
- Always validate pipelines on the backend — never trust client-only validation
- Stream LLM tokens via SSE — never buffer and return all at once
- Frontend never calls Ollama directly — all Ollama traffic goes through FastAPI
- Never expose raw Python exceptions or stack traces to the frontend
- Never send pipeline data to external servers
- Condition nodes skip unreachable branches — executor tracks and bypasses downstream nodes accordingly
