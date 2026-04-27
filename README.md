<div align="center">
  <img src="assets/readme-title.svg" height="40" alt="⬡ LlamaGraph" />
</div>

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white) ![Ollama](https://img.shields.io/badge/Ollama-local-grey?logo=ollama) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

</div>

<div align="center">
  <img src="assets/screenshot_canvas.png" alt="LlamaGraph canvas — visual pipeline builder with nodes and wiring" />
</div>

**An open-source, no-code AI workflow builder for local LLMs.** Drag nodes onto a canvas, wire them into prompt chains or branching pipelines, and run them against any Ollama model — fully local, no API keys, no data ever leaving your machine.

If you find this project useful, consider [starring the repo on GitHub](https://github.com/dakshp26/llamagraph) — it helps others discover it.

---

## Quick Start

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Ollama](https://ollama.com/) running locally with at least one model pulled. llama3 is used as an example here ([pull any model available on Ollama!](https://ollama.com/library))

```bash
ollama pull llama3
```

**Run with Docker:**
```bash
git clone https://github.com/dakshp26/llamagraph
cd llamagraph
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

LlamaGraph is intended for local use. Docker binds the frontend and backend
to `127.0.0.1` only; do not expose these ports to your LAN or the public
internet without separate authentication and network protection.

<details>
<summary>Manual setup (for development)</summary>

**Prerequisites:** Node.js 20+, pnpm, [uv](https://docs.astral.sh/uv/getting-started/#installation) (installs a compatible Python if needed), Ollama running locally.

```bash
# 1. Clone and install JS deps
git clone https://github.com/dakshp26/llamagraph
cd llamagraph
pnpm install

# 2. Set up the backend with uv (creates .venv/ from pyproject.toml + uv.lock)
cd backend
uv sync --all-groups   # app deps + dev (pytest, ruff, httpx)

# 3. Start everything
cd ..
pnpm dev
```

The backend venv is created under `backend/.venv` so the root `pnpm dev` script can find Python. You can also run tools without activating the venv, for example: `cd backend && uv run ruff check` or `uv run pytest`.

Frontend runs on [http://localhost:3000](http://localhost:3000), backend on [http://localhost:8000](http://localhost:8000).
Keep both services local-only unless you add separate protection such as
authentication, firewall rules, or a private tunnel.

</details>

---

## What it does

LlamaGraph gives you a node-based canvas to design, connect, and run AI workflows of any complexity — from a single prompt-to-output chain to multi-branch pipelines with conditional routing, data transformation, and chained LLM calls.

Each run streams execution updates in real time via Server-Sent Events: you see each node's status and output as it happens, not after the whole pipeline finishes.

**Use it to:**
- Prototype complex prompt chains without writing code
- Build conditional AI workflows that branch on LLM output
- Chain multiple LLM calls with intermediate transformations
- Test and iterate on pipelines visually before committing to code
- Save and load pipeline configurations as portable `.llamagraph.json` files (see [examples](examples/))

## Why LlamaGraph?

Most local LLM tools give you a chat window. Most pipeline tools require writing code or sending your data to the cloud. LlamaGraph sits in between: a visual, code-free builder that runs entirely on your machine.

- **Private by design** — no external API calls, no telemetry, no data leaving your machine
- **Visual, not verbal** — build multi-step logic without prompting your way through it
- **Real-time feedback** — watch each node execute and stream output as it happens
- **Composable** — mix prompts, transforms, conditions, and multiple LLM calls in one graph
- **Portable** — pipelines are plain JSON; version them, share them, load them anywhere

## Node types

| Node | Role |
|------|------|
| **Input** | Entry point — feeds text or data into the pipeline |
| **Prompt** | Jinja-style template that injects upstream values into a prompt |
| **Transform** | Regex or field-extract operations on text |
| **Condition** | Branches the graph based on a rule — true/false routing |
| **LLM** | Calls a local Ollama model and streams the response |
| **Output** | Terminal node — displays final results |

Nodes are composable: connect them in any order the DAG allows, fan out to parallel branches, or converge multiple streams into one.

---

## Project structure

```
llamagraph/
├── frontend/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # canvas/, nodes/, debug/, ui/
│   ├── store/         # Zustand: pipelineStore, executionStore, validationStore
│   └── lib/           # sseClient, pipelineFile, API client, graph utils
├── backend/
│   ├── routers/       # FastAPI route handlers
│   ├── services/      # graph.py, executor.py, node_handlers.py, ollama_client.py
│   └── models/        # Pydantic schemas
├── examples/          # Sample .llamagraph.json pipelines
└── docker-compose.yml
```

## Architecture

The UI continuously polls `POST /pipeline/validate` and surfaces errors in real time. On run, `POST /pipeline/run` validates and topologically sorts the DAG, then executes nodes one by one — skipping branches marked unreachable by condition nodes. LLM nodes stream tokens back via SSE; the frontend never calls Ollama directly.

**API:**
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/ollama/health` | Ollama connectivity check |
| `GET` | `/ollama/models` | Available model list |
| `POST` | `/pipeline/validate` | Graph validation |
| `POST` | `/pipeline/run` | Pipeline execution — SSE stream |

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js 16, React 19, XYFlow, Zustand, Tailwind CSS 4 |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Ollama, [uv](https://docs.astral.sh/uv/) (package manager) |

## Contributing

Contributions are welcome — bug fixes, new node types, UI improvements, docs.

1. **Open an issue first** for anything beyond a small fix so we can align on direction before you invest time.
2. Fork the repo and create a feature branch.
3. Make your changes and add tests where applicable.
4. Open a PR with a clear description of what changed and why.

```bash
# Lint and test before opening a PR
pnpm --filter frontend lint
pnpm --filter frontend build

cd backend
uv run ruff check
uv run pytest
```

**Good first issues:** look for the `good first issue` label in the issue tracker.

## License

MIT — see [LICENSE](LICENSE).
