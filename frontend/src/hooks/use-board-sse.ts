import { useEffect, useRef } from "react"
import type { TaskOut, WorkerOut } from "@/types"

interface SSEHandlers {
  onTaskCreated: (task: TaskOut) => void
  onTaskUpdated: (task: TaskOut) => void
  onTaskDeleted: (id: number) => void
  onWorkerUpdated: (worker: WorkerOut) => void
}

export function useBoardSSE(handlers: SSEHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const source = new EventSource("/api/stream/board")

    source.addEventListener("task_created", (e) => {
      const task: TaskOut = JSON.parse((e as MessageEvent).data)
      handlersRef.current.onTaskCreated(task)
    })

    source.addEventListener("task_updated", (e) => {
      const task: TaskOut = JSON.parse((e as MessageEvent).data)
      handlersRef.current.onTaskUpdated(task)
    })

    source.addEventListener("task_deleted", (e) => {
      const { id }: { id: number } = JSON.parse((e as MessageEvent).data)
      handlersRef.current.onTaskDeleted(id)
    })

    source.addEventListener("worker_updated", (e) => {
      const worker: WorkerOut = JSON.parse((e as MessageEvent).data)
      handlersRef.current.onWorkerUpdated(worker)
    })

    source.onerror = () => {
      console.warn("SSE connection lost, reconnecting...")
    }

    return () => {
      source.close()
    }
  }, [])
}
