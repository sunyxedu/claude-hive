"""Project CRUD endpoints."""

from fastapi import APIRouter, HTTPException

from manager.models import ProjectCreate, ProjectOut
from manager.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(data: ProjectCreate):
    try:
        return await project_service.create_project(data)
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(409, "A project with this path already exists")
        raise


@router.get("", response_model=list[ProjectOut])
async def list_projects():
    return await project_service.list_projects()


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: int):
    project = await project_service.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: int):
    deleted = await project_service.delete_project(project_id)
    if not deleted:
        raise HTTPException(400, "Cannot delete project (has active tasks or not found)")
