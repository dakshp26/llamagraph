# Contributing

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
