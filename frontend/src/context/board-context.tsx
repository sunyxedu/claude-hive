import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type {
  TaskOut,
  WorkerOut,
  SystemStats,
  BoardData,
  TaskStatus,
  ProjectOut,
  GitHubUser,
} from "@/types"
import * as api from "@/lib/api"
import { useBoardSSE } from "@/hooks/use-board-sse"
import { usePolling } from "@/hooks/use-polling"

// ── State ──

interface BoardState {
  board: BoardData
  workers: WorkerOut[]
  stats: SystemStats | null
  loading: boolean
}

const COLUMNS: TaskStatus[] = [
  "pending",
  "in_progress",
  "merging",
  "testing",
  "completed",
  "failed",
]

const emptyBoard = (): BoardData =>
  Object.fromEntries(COLUMNS.map((s) => [s, []])) as BoardData

const initialState: BoardState = {
  board: emptyBoard(),
  workers: [],
  stats: null,
  loading: true,
}

// ── Actions ──

type Action =
  | { type: "SET_BOARD"; board: BoardData }
  | { type: "UPSERT_TASK"; task: TaskOut }
  | { type: "REMOVE_TASK"; id: number }
  | { type: "SET_WORKERS"; workers: WorkerOut[] }
  | { type: "SET_STATS"; stats: SystemStats }
  | { type: "SET_LOADING"; loading: boolean }

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "SET_BOARD":
      return { ...state, board: action.board, loading: false }
    case "UPSERT_TASK": {
      const task = action.task
      const board = { ...state.board }
      for (const status of COLUMNS) {
        board[status] = (board[status] ?? []).filter((t) => t.id !== task.id)
      }
      if (COLUMNS.includes(task.status)) {
        board[task.status] = [task, ...(board[task.status] ?? [])]
      }
      return { ...state, board }
    }
    case "REMOVE_TASK": {
      const board = { ...state.board }
      for (const status of COLUMNS) {
        board[status] = (board[status] ?? []).filter((t) => t.id !== action.id)
      }
      return { ...state, board }
    }
    case "SET_WORKERS":
      return { ...state, workers: action.workers }
    case "SET_STATS":
      return { ...state, stats: action.stats }
    case "SET_LOADING":
      return { ...state, loading: action.loading }
  }
}

// ── Context ──

interface BoardContextValue extends BoardState {
  projects: ProjectOut[]
  activeProject: ProjectOut | null
  setActiveProject: (project: ProjectOut | null) => void
  refreshProjects: () => Promise<void>
  refreshBoard: () => Promise<void>
  totalTasks: number
  user: GitHubUser | null
  refreshUser: () => Promise<void>
}

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [activeProject, setActiveProject] = useState<ProjectOut | null>(null)
  const [user, setUser] = useState<GitHubUser | null>(null)

  const projectId = activeProject?.id ?? null

  const refreshProjects = useCallback(async () => {
    try {
      const list = await api.listProjects()
      setProjects(list)
      // Auto-select first project if none active
      if (!activeProject && list.length > 0) {
        setActiveProject(list[0])
      }
    } catch {
      // Projects endpoint may not be ready
    }
  }, [activeProject])

  const refreshBoard = useCallback(async () => {
    try {
      const board = await api.getBoard(projectId)
      dispatch({ type: "SET_BOARD", board })
    } catch (err) {
      console.error("Failed to load board:", err)
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [projectId])

  const refreshWorkers = useCallback(async () => {
    try {
      const workers = await api.getWorkers()
      dispatch({ type: "SET_WORKERS", workers })
    } catch {
      // Workers endpoint may not be ready
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.getStats(projectId)
      dispatch({ type: "SET_STATS", stats })
    } catch {
      // Stats endpoint may not be ready
    }
  }, [projectId])

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getAuthMe()
      if (data.logged_in) {
        setUser({
          github_username: data.github_username,
          github_avatar: data.github_avatar,
          logged_in: true,
        })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  // Load projects and user on mount
  useEffect(() => {
    refreshProjects()
    refreshUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload board when active project changes
  useEffect(() => {
    dispatch({ type: "SET_LOADING", loading: true })
    refreshBoard()
    refreshStats()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // SSE real-time updates — filter by project on upsert
  useBoardSSE({
    onTaskCreated: (task) => {
      if (projectId === null || task.project_id === projectId) {
        dispatch({ type: "UPSERT_TASK", task })
      }
    },
    onTaskUpdated: (task) => {
      if (projectId === null || task.project_id === projectId) {
        dispatch({ type: "UPSERT_TASK", task })
      }
    },
    onTaskDeleted: (id) => dispatch({ type: "REMOVE_TASK", id }),
    onWorkerUpdated: () => refreshWorkers(),
  })

  // Polling fallback (10s)
  usePolling(() => {
    refreshBoard()
    refreshWorkers()
    refreshStats()
  }, 10000)

  const totalTasks = Object.values(state.board).reduce(
    (sum, tasks) => sum + (tasks?.length ?? 0),
    0
  )

  return (
    <BoardContext.Provider
      value={{
        ...state,
        projects,
        activeProject,
        setActiveProject,
        refreshProjects,
        refreshBoard,
        totalTasks,
        user,
        refreshUser,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoardContext must be used within BoardProvider")
  return ctx
}
