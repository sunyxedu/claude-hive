"""Worker loop: claim task → execute → merge → cleanup."""

import asyncio
import logging
from datetime import datetime

from manager.database import get_db
from manager.event_bus import bus
from manager.services.claude_runner import run_claude
from manager.services.git_service import (
    commit_all, rebase_onto_main, merge_to_main, write_progress, fetch_main,
)
from manager.workers.worktree_setup import create_worktree, cleanup_worktree
from manager.workers.merge_strategy import handle_rebase_failure
from manager.workers.test_runner import run_tests
from manager.services.task_service import add_task_log, update_task

from manager.models import TaskUpdate, TaskStatus

log = logging.getLogger(__name__)


async def claim_task(worker_id: int) -> dict | None:
    """Atomically claim the next pending task."""
    db = get_db()
    cursor = await db.execute(
        """UPDATE tasks
           SET status = 'in_progress',
               assigned_worker_id = ?,
               started_at = datetime('now')
           WHERE id = (
               SELECT id FROM tasks
               WHERE status = 'pending'
               ORDER BY priority DESC, id ASC
               LIMIT 1
           )
           RETURNING *""",
        (worker_id,),
    )
    row = await cursor.fetchone()
    await db.commit()
    if row:
        task = dict(row)
        await bus.publish("board", "task_updated", task)
        return task
    return None


async def set_task_status(task_id: int, status: str, **kwargs):
    """Update task status and optional fields."""
    db = get_db()
    fields = {"status": status, **kwargs}
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [task_id]
    cursor = await db.execute(
        f"UPDATE tasks SET {set_clause} WHERE id = ? RETURNING *", values
    )
    row = await cursor.fetchone()
    await db.commit()
    if row:
        await bus.publish("board", "task_updated", dict(row))


async def update_worker_status(worker_id: int, status: str, task_id: int | None = None):
    db = get_db()
    await db.execute(
        """UPDATE workers SET status = ?, current_task_id = ?, last_heartbeat = datetime('now')
           WHERE id = ?""",
        (status, task_id, worker_id),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM workers WHERE id = ?", (worker_id,))
    row = await cursor.fetchone()
    if row:
        await bus.publish("board", "worker_updated", dict(row))


async def worker_loop(worker_id: int, stop_event: asyncio.Event):
    """Main worker loop — runs until stop_event is set."""
    from manager.services.git_service import ensure_repo
    if not await ensure_repo():
        log.error("Worker %d: project_dir is not a git repo, cannot start", worker_id)
        await update_worker_status(worker_id, "dead")
        return

    log.info("Worker %d started", worker_id)

    while not stop_event.is_set():
        await update_worker_status(worker_id, "idle")

        task = await claim_task(worker_id)
        if not task:
            # No tasks available, wait before polling again
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass
            continue

        task_id = task["id"]
        branch_name = f"hive/task-{task_id}"

        try:
            await update_worker_status(worker_id, "busy", task_id)
            await add_task_log(task_id, "claimed", f"Claimed by worker {worker_id}", worker_id)

            # 1. Create worktree
            await add_task_log(task_id, "worktree", "Creating worktree...", worker_id)
            worktree_path = await create_worktree(branch_name)
            if not worktree_path:
                await set_task_status(task_id, "failed", error_message="Failed to create worktree")
                continue

            await set_task_status(task_id, "in_progress",
                                 branch_name=branch_name,
                                 worktree_path=str(worktree_path))

            # 2. Run Claude
            await add_task_log(task_id, "claude_start", "Running Claude...", worker_id)
            prompt = _build_prompt(task)
            result = await run_claude(
                prompt=prompt,
                cwd=worktree_path,
                task_id=task_id,
                plan_mode=bool(task["plan_mode"]),
            )

            # Update token/cost tracking
            await set_task_status(task_id, "in_progress",
                                 tokens_input=result.tokens_input,
                                 tokens_output=result.tokens_output,
                                 cost_usd=result.cost_usd)

            if not result.success:
                await set_task_status(task_id, "failed", error_message=result.error)
                await add_task_log(task_id, "claude_failed", result.error, worker_id)
                await cleanup_worktree(branch_name, worktree_path)
                continue

            await add_task_log(task_id, "claude_done", "Claude completed successfully", worker_id)

            # 3. Commit changes
            sha = await commit_all(f"hive: {task['title']}", cwd=worktree_path)
            if not sha:
                await add_task_log(task_id, "info", "No changes to commit", worker_id)

            # 4. Rebase onto latest main
            await set_task_status(task_id, "merging")
            await add_task_log(task_id, "rebase", "Rebasing onto main...", worker_id)
            await fetch_main()
            ok, msg = await rebase_onto_main(worktree_path)

            if not ok:
                await add_task_log(task_id, "rebase_failed", msg, worker_id)
                ok = await handle_rebase_failure(task_id, task, worktree_path, branch_name, worker_id)
                if not ok:
                    await cleanup_worktree(branch_name, worktree_path)
                    continue

            # 5. Run tests
            await set_task_status(task_id, "testing")
            await add_task_log(task_id, "testing", "Running tests...", worker_id)
            test_ok, test_output = await run_tests(worktree_path)

            if not test_ok:
                await add_task_log(task_id, "test_failed", test_output, worker_id)
                await set_task_status(task_id, "failed",
                                     error_message=f"Tests failed: {test_output[:200]}")
                await cleanup_worktree(branch_name, worktree_path)
                continue

            await add_task_log(task_id, "test_passed", "Tests passed", worker_id)

            # 6. Merge to main
            await add_task_log(task_id, "merge", "Merging to main...", worker_id)
            merge_ok, merge_msg = await merge_to_main(worktree_path, branch_name)

            if not merge_ok:
                await set_task_status(task_id, "failed", error_message=merge_msg)
                await add_task_log(task_id, "merge_failed", merge_msg, worker_id)
                await cleanup_worktree(branch_name, worktree_path)
                continue

            # 7. Complete
            head_sha = sha or ""
            await set_task_status(task_id, "completed",
                                 completed_at=datetime.utcnow().isoformat(),
                                 commit_sha=head_sha)
            await add_task_log(task_id, "completed", "Task completed and merged", worker_id)

            # Update worker stats
            db = get_db()
            await db.execute(
                """UPDATE workers
                   SET total_tasks_completed = total_tasks_completed + 1,
                       total_cost_usd = total_cost_usd + ?
                   WHERE id = ?""",
                (result.cost_usd, worker_id),
            )
            await db.commit()

            # 8. Write progress
            await write_progress(task["title"], result.result_text[:500] if result.result_text else "Completed.")

            # 9. Cleanup
            await cleanup_worktree(branch_name, worktree_path)

        except Exception as e:
            log.exception("Worker %d error on task %d", worker_id, task_id)
            await set_task_status(task_id, "failed", error_message=str(e)[:500])
            await add_task_log(task_id, "error", str(e), worker_id)
            try:
                await cleanup_worktree(branch_name)
            except Exception:
                pass

    await update_worker_status(worker_id, "idle")
    log.info("Worker %d stopped", worker_id)


def _build_prompt(task: dict) -> str:
    """Build the prompt to send to Claude."""
    parts = [task["title"]]
    if task["description"]:
        parts.append(task["description"])
    return "\n\n".join(parts)
