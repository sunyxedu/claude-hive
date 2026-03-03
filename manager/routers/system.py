"""System health, config, stats, and utility endpoints."""

import asyncio
import platform

from fastapi import APIRouter

from manager.config import settings
from manager.services.worker_orchestrator import orchestrator

router = APIRouter(tags=["system"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/stats")
async def stats(project_id: int | None = None):
    return await orchestrator.get_stats(project_id=project_id)


@router.get("/config")
async def config():
    return {
        "project_dir": str(settings.project_dir),
        "project_name": settings.project_name,
        "max_workers": settings.max_workers,
        "worker_port_base": settings.worker_port_base,
        "main_branch": settings.main_branch,
        "auto_push": settings.auto_push,
        "plan_mode_default": settings.plan_mode_default,
    }


@router.post("/browse-directory")
async def browse_directory():
    """Open native OS folder picker dialog."""
    system = platform.system()

    if system == "Darwin":
        proc = await asyncio.create_subprocess_exec(
            "osascript", "-e",
            'POSIX path of (choose folder with prompt "Select project directory")',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if proc.returncode == 0:
            return {"path": stdout.decode().strip().rstrip("/")}
        return {"path": ""}

    if system == "Linux":
        for cmd in [
            ["zenity", "--file-selection", "--directory",
             "--title=Select project directory"],
            ["kdialog", "--getexistingdirectory", "."],
        ]:
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await proc.communicate()
                if proc.returncode == 0:
                    return {"path": stdout.decode().strip()}
            except FileNotFoundError:
                continue
        return {"path": ""}

    return {"path": ""}


@router.get("/git/branches")
async def list_git_branches(path: str):
    """List git branches for a repository at the given path."""
    proc = await asyncio.create_subprocess_exec(
        "git", "branch", "--format=%(refname:short)",
        cwd=path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        return []

    branches = [b.strip() for b in stdout.decode().strip().splitlines() if b.strip()]
    # Sort main/master to front
    priority = {"main": 0, "master": 1}
    branches.sort(key=lambda b: (priority.get(b, 99), b))
    return branches
