"""Rebase conflict resolution and retry strategy.

Strategy:
  Attempt 1: auto-rebase (already tried in worker_loop)
  Attempt 2: use Claude to resolve conflicts
  Attempt 3: recreate task from fresh main (cheaper than infinite retries)
"""

import logging
from pathlib import Path

from manager.services.git_service import run_git, rebase_onto_main, fetch_main
from manager.services.claude_runner import run_claude
from manager.services.task_service import add_task_log
from manager.workers.worktree_setup import cleanup_worktree, create_worktree

log = logging.getLogger(__name__)


async def handle_rebase_failure(
    task_id: int,
    task: dict,
    worktree_path: Path,
    branch_name: str,
    worker_id: int,
) -> bool:
    """
    Handle rebase failure with escalating strategy.
    Returns True if resolved, False if task should be marked failed/recreated.
    """
    retry = task.get("retry_count", 0)

    if retry == 0:
        # Attempt 2: Claude-assisted conflict resolution
        await add_task_log(task_id, "rebase_retry",
                          "Attempting Claude-assisted conflict resolution", worker_id)
        ok = await _claude_resolve_conflicts(task_id, worktree_path, worker_id)
        if ok:
            await _increment_retry(task_id)
            return True

    if retry <= 1:
        # Attempt 3: Recreate task from fresh main
        await add_task_log(task_id, "recreate",
                          "Recreating task from fresh main (conflict too complex)", worker_id)
        await _recreate_task(task_id, task, branch_name, worktree_path)
        return False  # worker_loop will pick it up as a new pending task

    # Exhausted retries
    from manager.workers.worker_loop import set_task_status
    await set_task_status(task_id, "failed",
                          error_message="Merge failed after max retries")
    return False


async def _claude_resolve_conflicts(
    task_id: int, worktree_path: Path, worker_id: int
) -> bool:
    """Ask Claude to resolve merge conflicts in the worktree."""
    # Start rebase again so conflicts are visible
    await fetch_main()
    from manager.config import settings
    rc, _, _ = await run_git("rebase", settings.main_branch, cwd=worktree_path)
    if rc == 0:
        return True  # No conflicts this time

    # Check for conflict markers
    rc, conflicted, _ = await run_git("diff", "--name-only", "--diff-filter=U", cwd=worktree_path)
    if not conflicted:
        await run_git("rebase", "--abort", cwd=worktree_path)
        return False

    prompt = (
        "There are merge conflicts in the following files:\n"
        f"{conflicted}\n\n"
        "Please resolve all merge conflicts by choosing the correct code. "
        "Remove all conflict markers (<<<<<<<, =======, >>>>>>>). "
        "Then stage the resolved files with `git add`."
    )

    result = await run_claude(
        prompt=prompt,
        cwd=worktree_path,
        task_id=task_id,
        plan_mode=False,
    )

    if not result.success:
        await run_git("rebase", "--abort", cwd=worktree_path)
        return False

    # Continue rebase
    rc, _, err = await run_git("rebase", "--continue", cwd=worktree_path)
    if rc != 0:
        await run_git("rebase", "--abort", cwd=worktree_path)
        await add_task_log(task_id, "rebase_continue_failed", err, worker_id)
        return False

    return True


async def _recreate_task(
    task_id: int, task: dict, branch_name: str, worktree_path: Path
):
    """
    Mark current task as cancelled and create a fresh one.
    Cheaper than wasting tokens on hopeless merge conflicts.
    """
    from manager.workers.worker_loop import set_task_status
    from manager.database import get_db

    await set_task_status(task_id, "cancelled",
                          error_message="Recreated due to merge conflicts")
    await cleanup_worktree(branch_name, worktree_path)

    # Create a new task with same params, bumped retry count
    db = get_db()
    await db.execute(
        """INSERT INTO tasks (title, description, priority, plan_mode, max_retries, retry_count)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (task["title"], task["description"], task["priority"],
         task["plan_mode"], task["max_retries"], task.get("retry_count", 0) + 1),
    )
    await db.commit()


async def _increment_retry(task_id: int):
    from manager.database import get_db
    db = get_db()
    await db.execute(
        "UPDATE tasks SET retry_count = retry_count + 1 WHERE id = ?", (task_id,)
    )
    await db.commit()
