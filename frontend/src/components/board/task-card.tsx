import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Maximize2, RotateCcw, Trash2 } from "lucide-react"
import { TaskDetailDialog } from "@/components/dialogs/task-detail-dialog"
import { formatRelativeTime, getIdColor } from "@/lib/utils"
import * as api from "@/lib/api"
import { toast } from "sonner"
import type { TaskOut } from "@/types"

interface TaskCardProps {
  task: TaskOut
}

export function TaskCard({ task }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const description = task.description || task.title
  const truncated = description.length > 120
  const displayText = expanded ? description : description.slice(0, 120)

  const timestamp = task.completed_at || task.started_at || task.created_at
  const statusLabel =
    task.status === "completed"
      ? "Completed"
      : task.status === "failed"
        ? "Failed"
        : task.status === "in_progress"
          ? "In Progress"
          : null

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.updateTask(task.id, { status: "pending", error_message: "" })
      toast.success("Task queued for retry")
    } catch {
      toast.error("Failed to retry task")
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteTask(task.id)
      toast.success("Task deleted")
    } catch {
      toast.error("Failed to delete task")
    }
  }

  return (
    <>
      <Card className="p-0 overflow-hidden border-border/50 bg-card hover:border-primary/30 transition-all duration-200 rounded-xl hover:shadow-lg hover:shadow-primary/5 group">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${getIdColor(task.id)}`}
            >
              {task.id}
            </span>
            {task.plan_mode && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 shrink-0 border-primary/30 text-primary"
              >
                Plan
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setDetailOpen(true)}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            {truncated && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div
          className="px-3 pb-2 cursor-pointer"
          onClick={() => setDetailOpen(true)}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {displayText}
            {truncated && !expanded && (
              <span className="text-muted-foreground">...</span>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/70">
            {statusLabel ? `${statusLabel}: ` : ""}
            {formatRelativeTime(timestamp)}
          </span>
          {task.status === "failed" && (
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-blue-400"
                onClick={handleRetry}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-400"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>
      <TaskDetailDialog
        taskId={task.id}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
