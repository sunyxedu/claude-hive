"""System health, config, and stats endpoints."""

from fastapi import APIRouter

from manager.config import settings
from manager.services.worker_orchestrator import orchestrator

router = APIRouter(tags=["system"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/stats")
async def stats():
    return await orchestrator.get_stats()


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
