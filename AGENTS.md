# AGENTS.md

## Cursor Cloud specific instructions

**Claude Hive** is a single full-stack app (Python FastAPI backend + React/Vite frontend) that orchestrates multiple Claude Code CLI instances via git worktrees.

### Architecture

- **Backend**: FastAPI on port 8420 (`manager/` package). Uses SQLite via `aiosqlite`. Managed with `uv`.
- **Frontend**: React 19 + Vite + Tailwind (`frontend/`). Builds to `static/` which the backend serves. Uses `npm`.
- **External dep**: The `claude` CLI (`@anthropic-ai/claude-code`) is invoked by workers as a subprocess. Requires `ANTHROPIC_API_KEY`.

### Running services

Backend (requires a git repo as project dir):
```
HIVE_PROJECT_DIR=/path/to/git/repo HIVE_PROJECT_NAME=my-project uv run uvicorn manager.main:app --host 0.0.0.0 --port 8420 --reload
```

Frontend dev server (proxies `/api` to backend on port 8420):
```
cd frontend && npm run dev
```

Build frontend for production (output goes to `static/`):
```
cd frontend && npm run build
```

### Lint / Test / Build

- Frontend lint: `cd frontend && npx eslint .` (has pre-existing warnings/errors in the codebase)
- Frontend build: `cd frontend && npm run build` (runs `tsc -b` then `vite build`)
- No automated Python tests or test suite exist in this repo currently.

### Non-obvious notes

- The backend requires `HIVE_PROJECT_DIR` to point to a valid git repository. Without it, it defaults to `.` (current directory). All env vars use the `HIVE_` prefix (see `manager/config.py`).
- Workers will fail tasks with "Claude CLI not found" if the `claude` CLI binary is not on PATH. This is expected without `@anthropic-ai/claude-code` installed globally.
- The frontend Vite dev server runs on port 5173 and proxies `/api` requests to the backend on port 8420. Both must be running for full dev experience.
- `uv` must be on PATH — install via `curl -LsSf https://astral.sh/uv/install.sh | sh` if missing.
