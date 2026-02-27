"""Git worktree creation, cleanup, and symlink management."""

import logging
from pathlib import Path

from manager.config import settings
from manager.services.git_service import run_git

log = logging.getLogger(__name__)

# Directories/files to symlink from main repo into worktrees
SYMLINK_TARGETS = [
    "node_modules",
    ".env",
]


async def create_worktree(branch_name: str) -> Path | None:
    """
    Create a git worktree for the given branch.
    Returns the worktree path, or None on failure.
    """
    worktree_path = settings.worktrees_dir / branch_name
    worktree_path.parent.mkdir(parents=True, exist_ok=True)

    # Create the worktree with a new branch from main
    rc, _, err = await run_git(
        "worktree", "add", "-b", branch_name,
        str(worktree_path), settings.main_branch,
    )
    if rc != 0:
        log.error("Failed to create worktree for %s: %s", branch_name, err)
        return None

    # Create symlinks for shared resources
    for target_name in SYMLINK_TARGETS:
        source = settings.project_dir / target_name
        link = worktree_path / target_name
        if source.exists() and not link.exists():
            try:
                link.symlink_to(source)
                log.info("Symlinked %s -> %s", link, source)
            except OSError as e:
                log.warning("Failed to symlink %s: %s", target_name, e)

    log.info("Created worktree at %s on branch %s", worktree_path, branch_name)
    return worktree_path


async def cleanup_worktree(branch_name: str, worktree_path: Path | str | None = None):
    """Remove worktree and delete the branch."""
    if worktree_path is None:
        worktree_path = settings.worktrees_dir / branch_name
    worktree_path = Path(worktree_path)

    # Remove symlinks first (don't delete the real targets)
    for target_name in SYMLINK_TARGETS:
        link = worktree_path / target_name
        if link.is_symlink():
            link.unlink()

    # Remove the worktree
    rc, _, err = await run_git("worktree", "remove", "--force", str(worktree_path))
    if rc != 0:
        log.warning("Failed to remove worktree %s: %s", worktree_path, err)

    # Prune stale worktree entries
    await run_git("worktree", "prune")

    # Delete the branch
    rc, _, err = await run_git("branch", "-D", branch_name)
    if rc != 0:
        log.warning("Failed to delete branch %s: %s", branch_name, err)

    log.info("Cleaned up worktree and branch: %s", branch_name)


async def list_worktrees() -> list[dict]:
    """List all current worktrees."""
    rc, out, _ = await run_git("worktree", "list", "--porcelain")
    if rc != 0:
        return []

    worktrees = []
    current: dict = {}
    for line in out.splitlines():
        if line.startswith("worktree "):
            if current:
                worktrees.append(current)
            current = {"path": line.split(" ", 1)[1]}
        elif line.startswith("HEAD "):
            current["head"] = line.split(" ", 1)[1]
        elif line.startswith("branch "):
            current["branch"] = line.split(" ", 1)[1]
    if current:
        worktrees.append(current)

    return worktrees
