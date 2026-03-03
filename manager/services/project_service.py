"""Project CRUD operations."""

from pathlib import Path

from manager.database import get_db
from manager.models import ProjectCreate


async def create_project(data: ProjectCreate) -> dict:
    db = get_db()
    cursor = await db.execute(
        """INSERT INTO projects (name, path, main_branch)
           VALUES (?, ?, ?) RETURNING *""",
        (data.name, data.path, data.main_branch),
    )
    row = await cursor.fetchone()
    await db.commit()
    return dict(row)


async def list_projects() -> list[dict]:
    db = get_db()
    cursor = await db.execute("SELECT * FROM projects ORDER BY id")
    return [dict(r) for r in await cursor.fetchall()]


async def get_project(project_id: int) -> dict | None:
    db = get_db()
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_project(project_id: int) -> bool:
    db = get_db()
    # Don't delete if project has active tasks
    cursor = await db.execute(
        "SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND status IN ('pending', 'in_progress', 'merging', 'testing')",
        (project_id,),
    )
    row = await cursor.fetchone()
    if row["c"] > 0:
        return False
    cursor = await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    await db.commit()
    return cursor.rowcount > 0


async def ensure_default_project(project_dir: Path, project_name: str, main_branch: str) -> dict:
    """Create the default project from settings if no projects exist."""
    db = get_db()
    cursor = await db.execute("SELECT * FROM projects WHERE path = ?", (str(project_dir),))
    row = await cursor.fetchone()
    if row:
        return dict(row)

    return await create_project(ProjectCreate(
        name=project_name,
        path=str(project_dir),
        main_branch=main_branch,
    ))
