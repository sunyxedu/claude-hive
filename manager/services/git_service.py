"""Git operations: commit, rebase, merge, branch management."""

import asyncio
import logging
from pathlib import Path

from manager.config import settings

log = logging.getLogger(__name__)

# Serialize merges to main
_merge_lock = asyncio.Lock()


async def run_git(*args: str, cwd: Path | None = None) -> tuple[int, str, str]:
    """Run a git command, return (returncode, stdout, stderr)."""
    cmd = ["git"] + list(args)
    cwd = cwd or settings.project_dir
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode, stdout.decode().strip(), stderr.decode().strip()


async def ensure_repo(project_dir: Path | None = None) -> bool:
    """Verify a directory is a git repository."""
    rc, _, _ = await run_git("rev-parse", "--git-dir", cwd=project_dir)
    return rc == 0


async def get_current_branch(cwd: Path | None = None) -> str:
    _, out, _ = await run_git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd)
    return out


async def get_head_sha(cwd: Path | None = None) -> str:
    _, out, _ = await run_git("rev-parse", "HEAD", cwd=cwd)
    return out


async def create_branch(branch_name: str) -> bool:
    rc, _, err = await run_git("branch", branch_name)
    if rc != 0:
        log.error("Failed to create branch %s: %s", branch_name, err)
    return rc == 0


async def delete_branch(branch_name: str) -> bool:
    rc, _, _ = await run_git("branch", "-D", branch_name)
    return rc == 0


async def fetch_main(project_dir: Path | None = None, main_branch: str | None = None) -> bool:
    """Fetch latest main if remote exists."""
    branch = main_branch or settings.main_branch
    rc, _, _ = await run_git("fetch", "origin", branch, cwd=project_dir)
    return rc == 0


async def commit_all(message: str, cwd: Path | None = None) -> str | None:
    """Stage all changes and commit. Returns commit SHA or None."""
    await run_git("add", "-A", cwd=cwd)
    rc, _, err = await run_git("commit", "-m", message, cwd=cwd)
    if rc != 0:
        log.warning("Commit failed (may be nothing to commit): %s", err)
        return None
    _, sha, _ = await run_git("rev-parse", "HEAD", cwd=cwd)
    return sha


async def rebase_onto_main(cwd: Path, main_branch: str | None = None) -> tuple[bool, str]:
    """Rebase current branch onto main. Returns (success, output)."""
    branch = main_branch or settings.main_branch
    rc, out, err = await run_git("rebase", branch, cwd=cwd)
    if rc != 0:
        # Abort the failed rebase
        await run_git("rebase", "--abort", cwd=cwd)
        return False, err
    return True, out


async def merge_to_main(
    worktree_path: Path,
    branch_name: str,
    project_dir: Path | None = None,
    main_branch: str | None = None,
) -> tuple[bool, str]:
    """
    Merge branch into main using fast-forward.
    Serialized via asyncio.Lock to prevent concurrent main modifications.
    """
    repo_dir = project_dir or settings.project_dir
    branch = main_branch or settings.main_branch

    async with _merge_lock:
        # Checkout main in the project repo
        rc, _, err = await run_git("checkout", branch, cwd=repo_dir)
        if rc != 0:
            return False, f"Failed to checkout main: {err}"

        # Fast-forward merge
        rc, out, err = await run_git("merge", "--ff-only", branch_name, cwd=repo_dir)
        if rc != 0:
            return False, f"Fast-forward merge failed: {err}"

        # Push if auto_push enabled
        if settings.auto_push:
            rc, _, err = await run_git("push", "origin", branch, cwd=repo_dir)
            if rc != 0:
                log.warning("Push failed: %s", err)

        return True, out


async def write_progress(task_title: str, summary: str, project_dir: Path | None = None):
    """Append lesson to PROGRESS.md in the project repo."""
    repo_dir = project_dir or settings.project_dir
    progress_path = repo_dir / "PROGRESS.md"
    entry = f"\n## {task_title}\n\n{summary}\n"
    try:
        if progress_path.exists():
            content = progress_path.read_text()
        else:
            content = "# Progress Log\n"
        content += entry
        progress_path.write_text(content)
    except Exception as e:
        log.error("Failed to write PROGRESS.md: %s", e)
