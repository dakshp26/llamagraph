# Contributing

## Development Setup

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


## Making a Contribution

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
