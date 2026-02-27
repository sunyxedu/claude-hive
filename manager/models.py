"""Pydantic models for API request/response."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    merging = "merging"
    testing = "testing"
    review = "review"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class WorkerStatus(str, Enum):
    idle = "idle"
    busy = "busy"
    starting = "starting"
    stopping = "stopping"
    dead = "dead"


# --- Task ---

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str = ""
    priority: int = Field(default=0, ge=0, le=10)
    plan_mode: bool = True
    max_retries: int = Field(default=3, ge=0, le=10)


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    status: TaskStatus | None = None
    plan_mode: bool | None = None
    error_message: str | None = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    status: TaskStatus
    priority: int
    plan_mode: bool
    branch_name: str | None
    worktree_path: str | None
    assigned_worker_id: int | None
    assigned_port: int | None
    retry_count: int
    max_retries: int
    created_at: str
    started_at: str | None
    completed_at: str | None
    error_message: str | None
    commit_sha: str | None
    tokens_input: int
    tokens_output: int
    cost_usd: float


# --- Worker ---

class WorkerOut(BaseModel):
    id: int
    name: str
    status: WorkerStatus
    pid: int | None
    current_task_id: int | None
    port_base: int
    last_heartbeat: str | None
    total_tasks_completed: int
    total_cost_usd: float


# --- Task Log ---

class TaskLogOut(BaseModel):
    id: int
    task_id: int
    worker_id: int | None
    event_type: str
    message: str
    details: str | None
    created_at: str


# --- Stats ---

class SystemStats(BaseModel):
    total_tasks: int
    pending_tasks: int
    completed_tasks: int
    failed_tasks: int
    active_workers: int
    total_cost_usd: float
    total_tokens_input: int
    total_tokens_output: int
