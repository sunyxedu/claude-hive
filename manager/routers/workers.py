"""Worker status and control endpoints."""

from fastapi import APIRouter

from manager.services.worker_orchestrator import orchestrator

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("")
async def list_workers():
    return await orchestrator.get_workers()


@router.post("/start")
async def start_workers(count: int | None = None):
    await orchestrator.start(count)
    return {"status": "started"}


@router.post("/stop")
async def stop_workers():
    await orchestrator.stop()
    return {"status": "stopped"}
