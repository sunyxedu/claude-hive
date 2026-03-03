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
  ProjectConfig,
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
  config: ProjectConfig | null
  refreshBoard: () => Promise<void>
  totalTasks: number
}

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [config, setConfig] = useState<ProjectConfig | null>(null)

  const refreshBoard = useCallback(async () => {
    try {
      const board = await api.getBoard()
      dispatch({ type: "SET_BOARD", board })
    } catch (err) {
      console.error("Failed to load board:", err)
      dispatch({ type: "SET_LOADING", loading: false })
    }
  }, [])

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
      const stats = await api.getStats()
      dispatch({ type: "SET_STATS", stats })
    } catch {
      // Stats endpoint may not be ready
    }
  }, [])

  // Load config once
  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {})
  }, [])

  // SSE real-time updates
  useBoardSSE({
    onTaskCreated: (task) => dispatch({ type: "UPSERT_TASK", task }),
    onTaskUpdated: (task) => dispatch({ type: "UPSERT_TASK", task }),
    onTaskDeleted: (id) => dispatch({ type: "REMOVE_TASK", id }),
    onWorkerUpdated: () => refreshWorkers(),
  })

  // Initial load + polling fallback (10s)
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
    <BoardContext.Provider value={{ ...state, config, refreshBoard, totalTasks }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoardContext must be used within BoardProvider")
  return ctx
}
