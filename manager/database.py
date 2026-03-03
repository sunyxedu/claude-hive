"""SQLite database initialization and query helpers."""

import aiosqlite
from pathlib import Path

_db: aiosqlite.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    path        TEXT    NOT NULL UNIQUE,
    main_branch TEXT    NOT NULL DEFAULT 'main',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER REFERENCES projects(id),
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'pending',
    priority        INTEGER NOT NULL DEFAULT 0,
    plan_mode       INTEGER NOT NULL DEFAULT 1,
    branch_name     TEXT,
    worktree_path   TEXT,
    assigned_worker_id INTEGER,
    assigned_port   INTEGER,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    started_at      TEXT,
    completed_at    TEXT,
    error_message   TEXT,
    commit_sha      TEXT,
    tokens_input    INTEGER NOT NULL DEFAULT 0,
    tokens_output   INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS workers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL,
    status                TEXT    NOT NULL DEFAULT 'idle',
    pid                   INTEGER,
    current_task_id       INTEGER,
    port_base             INTEGER NOT NULL,
    last_heartbeat        TEXT,
    total_tasks_completed INTEGER NOT NULL DEFAULT 0,
    total_cost_usd        REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS task_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER NOT NULL,
    worker_id   INTEGER,
    event_type  TEXT    NOT NULL,
    message     TEXT    NOT NULL DEFAULT '',
    details     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS lessons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER,
    category    TEXT    NOT NULL DEFAULT 'general',
    summary     TEXT    NOT NULL,
    details     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_task_logs_task ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

CREATE TABLE IF NOT EXISTS github_auth (
    id              INTEGER PRIMARY KEY,
    github_user_id  TEXT NOT NULL,
    github_username TEXT NOT NULL,
    github_avatar   TEXT NOT NULL DEFAULT '',
    access_token    TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


async def _migrate(db: aiosqlite.Connection):
    """Run migrations for existing databases."""
    # Check if tasks table has project_id column
    cursor = await db.execute("PRAGMA table_info(tasks)")
    columns = [row[1] for row in await cursor.fetchall()]
    if "project_id" not in columns:
        await db.execute(
            "ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)"
        )
        await db.commit()


async def init_db(db_path: Path) -> aiosqlite.Connection:
    """Open database, enable WAL mode, create schema."""
    global _db
    db_path.parent.mkdir(parents=True, exist_ok=True)
    _db = await aiosqlite.connect(str(db_path))
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("PRAGMA foreign_keys=ON")
    await _db.executescript(SCHEMA)
    await _db.commit()
    await _migrate(_db)
    return _db


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None


def get_db() -> aiosqlite.Connection:
    assert _db is not None, "Database not initialized"
    return _db
