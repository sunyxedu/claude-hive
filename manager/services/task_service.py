"""Task lifecycle logic."""

from manager.database import get_db
from manager.event_bus import bus
from manager.models import TaskCreate, TaskUpdate, TaskStatus


async def create_task(data: TaskCreate) -> dict:
    db = get_db()
    cursor = await db.execute(
        """INSERT INTO tasks (project_id, title, description, priority, plan_mode, max_retries)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING *""",
        (data.project_id, data.title, data.description, data.priority,
         int(data.plan_mode), data.max_retries),
    )
    row = await cursor.fetchone()
    await db.commit()
    task = dict(row)
    await bus.publish("board", "task_created", task)
    return task


async def list_tasks(status: str | None = None, project_id: int | None = None) -> list[dict]:
    db = get_db()
    conditions = []
    params: list = []
    if status:
        conditions.append("status = ?")
        params.append(status)
    if project_id is not None:
        conditions.append("project_id = ?")
        params.append(project_id)

    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    cursor = await db.execute(
        f"SELECT * FROM tasks{where} ORDER BY priority DESC, id ASC", params
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_task(task_id: int) -> dict | None:
    db = get_db()
    cursor = await db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def update_task(task_id: int, data: TaskUpdate) -> dict | None:
    db = get_db()
    fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not fields:
        return await get_task(task_id)
    # Convert bool to int for SQLite
    if "plan_mode" in fields:
        fields["plan_mode"] = int(fields["plan_mode"])
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [task_id]
    cursor = await db.execute(
        f"UPDATE tasks SET {set_clause} WHERE id = ? RETURNING *", values
    )
    row = await cursor.fetchone()
    await db.commit()
    if row:
        task = dict(row)
        await bus.publish("board", "task_updated", task)
        return task
    return None


async def delete_task(task_id: int) -> bool:
    db = get_db()
    cursor = await db.execute("DELETE FROM tasks WHERE id = ? AND status IN ('pending', 'failed', 'cancelled')", (task_id,))
    await db.commit()
    if cursor.rowcount > 0:
        await bus.publish("board", "task_deleted", {"id": task_id})
        return True
    return False


async def get_board(project_id: int | None = None) -> dict:
    """Get all tasks grouped by status for kanban board."""
    tasks = await list_tasks(project_id=project_id)
    board: dict[str, list] = {s.value: [] for s in TaskStatus}
    for t in tasks:
        board[t["status"]].append(t)
    return board


async def get_task_logs(task_id: int) -> list[dict]:
    db = get_db()
    cursor = await db.execute(
        "SELECT * FROM task_logs WHERE task_id = ? ORDER BY id ASC", (task_id,)
    )
    return [dict(r) for r in await cursor.fetchall()]


async def add_task_log(task_id: int, event_type: str, message: str,
                       worker_id: int | None = None, details: str | None = None):
    db = get_db()
    await db.execute(
        """INSERT INTO task_logs (task_id, worker_id, event_type, message, details)
           VALUES (?, ?, ?, ?, ?)""",
        (task_id, worker_id, event_type, message, details),
    )
    await db.commit()
    await bus.publish(f"task:{task_id}", "log", {
        "task_id": task_id, "event_type": event_type, "message": message,
    })
