export type TaskStatus =
  | "pending"
  | "in_progress"
  | "merging"
  | "testing"
  | "review"
  | "completed"
  | "failed"
  | "cancelled"

export type WorkerStatus = "idle" | "busy" | "starting" | "stopping" | "dead"

// --- Project ---

export interface ProjectCreate {
  name: string
  path: string
  main_branch?: string
}

export interface ProjectOut {
  id: number
  name: string
  path: string
  main_branch: string
  created_at: string
}

// --- Task ---

export interface TaskCreate {
  title: string
  description?: string
  priority?: number
  plan_mode?: boolean
  max_retries?: number
  project_id?: number | null
}

export interface TaskUpdate {
  title?: string
  description?: string
  priority?: number
  status?: TaskStatus
  plan_mode?: boolean
  error_message?: string
}

export interface TaskOut {
  id: number
  project_id: number | null
  title: string
  description: string
  status: TaskStatus
  priority: number
  plan_mode: boolean
  branch_name: string | null
  worktree_path: string | null
  assigned_worker_id: number | null
  assigned_port: number | null
  retry_count: number
  max_retries: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  commit_sha: string | null
  tokens_input: number
  tokens_output: number
  cost_usd: number
}

// --- Worker ---

export interface WorkerOut {
  id: number
  name: string
  status: WorkerStatus
  pid: number | null
  current_task_id: number | null
  port_base: number
  last_heartbeat: string | null
  total_tasks_completed: number
  total_cost_usd: number
}

export interface TaskLogOut {
  id: number
  task_id: number
  worker_id: number | null
  event_type: string
  message: string
  details: string | null
  created_at: string
}

export interface SystemStats {
  total_tasks: number
  pending_tasks: number
  completed_tasks: number
  failed_tasks: number
  active_workers: number
  total_cost_usd: number
  total_tokens_input: number
  total_tokens_output: number
}

export interface ProjectConfig {
  project_dir: string
  project_name: string
  max_workers: number
  [key: string]: unknown
}

export type BoardData = Partial<Record<TaskStatus, TaskOut[]>>

// --- GitHub ---

export interface GitHubUser {
  github_username: string
  github_avatar: string
  logged_in: boolean
}

export interface RepoInfo {
  full_name: string
  name: string
  description: string | null
  private: boolean
  default_branch: string
  html_url: string
}
