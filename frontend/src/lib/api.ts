import type {
  TaskOut,
  TaskCreate,
  TaskUpdate,
  TaskLogOut,
  WorkerOut,
  SystemStats,
  BoardData,
  ProjectConfig,
} from "@/types"

const BASE = "/api"

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (body) opts.body = JSON.stringify(body)

  let res: Response
  try {
    res = await fetch(BASE + path, opts)
  } catch {
    throw new Error("Cannot connect to backend")
  }
  if (res.status === 204) return null as T
  if (res.status >= 500 && res.status < 600) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.detail || "Backend unreachable or server error")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Request failed")
  }
  return res.json()
}

// Tasks
export const getBoard = () => request<BoardData>("GET", "/tasks/board")
export const getTasks = (status?: string) =>
  request<TaskOut[]>("GET", "/tasks" + (status ? `?status=${status}` : ""))
export const getTask = (id: number) => request<TaskOut>("GET", `/tasks/${id}`)
export const createTask = (data: TaskCreate) => request<TaskOut>("POST", "/tasks", data)
export const updateTask = (id: number, data: TaskUpdate) =>
  request<TaskOut>("PATCH", `/tasks/${id}`, data)
export const deleteTask = (id: number) => request<null>("DELETE", `/tasks/${id}`)
export const getTaskLogs = (id: number) => request<TaskLogOut[]>("GET", `/tasks/${id}/logs`)

// Workers
export const getWorkers = () => request<WorkerOut[]>("GET", "/workers")

// System
export const getStats = () => request<SystemStats>("GET", "/stats")
export const getConfig = () => request<ProjectConfig>("GET", "/config")
