import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime, getIdColor } from "@/lib/utils"
import * as api from "@/lib/api"
import type { TaskOut, TaskLogOut } from "@/types"

interface TaskDetailDialogProps {
  taskId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDetailDialog({ taskId, open, onOpenChange }: TaskDetailDialogProps) {
  const [task, setTask] = useState<TaskOut | null>(null)
  const [logs, setLogs] = useState<TaskLogOut[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([api.getTask(taskId), api.getTaskLogs(taskId)])
      .then(([t, l]) => {
        setTask(t)
        setLogs(l)
      })
      .catch((err) => console.error("Failed to load task detail:", err))
      .finally(() => setLoading(false))
  }, [open, taskId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-hidden flex flex-col border-border/50 bg-card">
        {loading || !task ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-48 bg-muted/50" />
            <Skeleton className="h-4 w-full bg-muted/50" />
            <Skeleton className="h-4 w-full bg-muted/50" />
            <Skeleton className="h-32 w-full bg-muted/50" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getIdColor(task.id)}`}>
                  {task.id}
                </span>
                <Badge variant="secondary" className="text-xs bg-secondary/80">
                  {task.status.replace("_", " ")}
                </Badge>
                {task.plan_mode && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Plan
                  </Badge>
                )}
              </div>
              <DialogTitle className="pr-6">{task.title}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-1">
              <DetailRow label="Priority">{task.priority}</DetailRow>
              <DetailRow label="Worker">{task.assigned_worker_id ?? "\u2014"}</DetailRow>
              <DetailRow label="Retries">{task.retry_count} / {task.max_retries}</DetailRow>
              <DetailRow label="Tokens">
                {task.tokens_input.toLocaleString()} in / {task.tokens_output.toLocaleString()} out
              </DetailRow>
              <DetailRow label="Cost">${task.cost_usd.toFixed(4)}</DetailRow>
              <DetailRow label="Created">{formatRelativeTime(task.created_at)}</DetailRow>
              <DetailRow label="Branch">{task.branch_name ?? "\u2014"}</DetailRow>
              <DetailRow label="Commit">{task.commit_sha ? task.commit_sha.slice(0, 8) : "\u2014"}</DetailRow>
            </div>

            {task.description && (
              <p className="text-sm mt-3 whitespace-pre-wrap text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border/30">
                {task.description}
              </p>
            )}

            {task.error_message && (
              <p className="text-sm mt-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {task.error_message}
              </p>
            )}

            <Separator className="my-3 bg-border/50" />

            <h4 className="text-sm font-semibold mb-1.5">Logs</h4>
            <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
              <div className="bg-muted/40 rounded-lg p-3 font-mono text-xs space-y-0.5 border border-border/30">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground/50">No logs yet</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="py-0.5 border-b border-border/20 last:border-0">
                      <span className="text-primary/70">[{l.event_type}]</span>{" "}
                      <span className="text-foreground/80">{l.message}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground/90">{children}</span>
    </>
  )
}
