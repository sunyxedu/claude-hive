import type {
  TaskOut,
  TaskCreate,
  TaskUpdate,
  TaskLogOut,
  WorkerOut,
  SystemStats,
  BoardData,
  ProjectConfig,
  ProjectCreate,
  ProjectOut,
  GitHubUser,
  RepoInfo,
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

// Projects
export const listProjects = () => request<ProjectOut[]>("GET", "/projects")
export const getProject = (id: number) => request<ProjectOut>("GET", `/projects/${id}`)
export const createProject = (data: ProjectCreate) =>
  request<ProjectOut>("POST", "/projects", data)
export const deleteProject = (id: number) => request<null>("DELETE", `/projects/${id}`)

// Tasks
export const getBoard = (projectId?: number | null) =>
  request<BoardData>("GET", "/tasks/board" + (projectId ? `?project_id=${projectId}` : ""))
export const getTasks = (status?: string, projectId?: number | null) => {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (projectId) params.set("project_id", String(projectId))
  const qs = params.toString()
  return request<TaskOut[]>("GET", "/tasks" + (qs ? `?${qs}` : ""))
}
export const getTask = (id: number) => request<TaskOut>("GET", `/tasks/${id}`)
export const createTask = (data: TaskCreate) => request<TaskOut>("POST", "/tasks", data)
export const updateTask = (id: number, data: TaskUpdate) =>
  request<TaskOut>("PATCH", `/tasks/${id}`, data)
export const deleteTask = (id: number) => request<null>("DELETE", `/tasks/${id}`)
export const getTaskLogs = (id: number) => request<TaskLogOut[]>("GET", `/tasks/${id}/logs`)

// Workers
export const getWorkers = () => request<WorkerOut[]>("GET", "/workers")

// System
export const getStats = (projectId?: number | null) =>
  request<SystemStats>("GET", "/stats" + (projectId ? `?project_id=${projectId}` : ""))
export const getConfig = () => request<ProjectConfig>("GET", "/config")
export const browseDirectory = () => request<{ path: string }>("POST", "/browse-directory")
export const getGitBranches = (path: string) =>
  request<string[]>("GET", `/git/branches?path=${encodeURIComponent(path)}`)

// Auth
export const getGitHubAuthUrl = (redirect: string) =>
  request<{ url: string }>("GET", `/auth/github/url?redirect=${encodeURIComponent(redirect)}`)
export const getAuthMe = () => request<GitHubUser & { logged_in: boolean }>("GET", "/auth/me")
export const logout = () => request<null>("POST", "/auth/logout")

// GitHub repos
export const listGitHubRepos = (page?: number, search?: string) => {
  const params = new URLSearchParams()
  if (page) params.set("page", String(page))
  if (search) params.set("search", search)
  const qs = params.toString()
  return request<RepoInfo[]>("GET", "/github/repos" + (qs ? `?${qs}` : ""))
}
export const cloneGitHubRepo = (full_name: string, branch?: string) =>
  request<{ path: string; project: unknown; message: string }>(
    "POST", "/github/clone", { full_name, branch: branch || "" }
  )
