"""Task CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from manager.models import TaskCreate, TaskUpdate, TaskOut
from manager.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(data: TaskCreate):
    return await task_service.create_task(data)


@router.get("", response_model=list[TaskOut])
async def list_tasks(status: str | None = None):
    return await task_service.list_tasks(status)


@router.get("/board")
async def get_board():
    return await task_service.get_board()


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: int):
    task = await task_service.get_task(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, data: TaskUpdate):
    task = await task_service.update_task(task_id, data)
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int):
    deleted = await task_service.delete_task(task_id)
    if not deleted:
        raise HTTPException(400, "Cannot delete task (must be pending/failed/cancelled)")


@router.get("/{task_id}/logs")
async def get_task_logs(task_id: int):
    return await task_service.get_task_logs(task_id)
