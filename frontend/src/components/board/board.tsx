import { useBoardContext } from "@/context/board-context"
import { BoardColumn } from "./board-column"
import { Skeleton } from "@/components/ui/skeleton"
import type { TaskStatus } from "@/types"

const COLUMNS: { status: TaskStatus; label: string; color: string; countBg: string }[] = [
  { status: "pending", label: "Pending", color: "text-slate-400", countBg: "bg-slate-500/15 text-slate-400" },
  { status: "in_progress", label: "In Progress", color: "text-blue-400", countBg: "bg-blue-500/15 text-blue-400" },
  { status: "merging", label: "Merging", color: "text-amber-400", countBg: "bg-amber-500/15 text-amber-400" },
  { status: "testing", label: "Testing", color: "text-orange-400", countBg: "bg-orange-500/15 text-orange-400" },
  { status: "completed", label: "Completed", color: "text-emerald-400", countBg: "bg-emerald-500/15 text-emerald-400" },
  { status: "failed", label: "Failed", color: "text-red-400", countBg: "bg-red-500/15 text-red-400" },
]

export function Board() {
  const { board, loading } = useBoardContext()

  if (loading) {
    return (
      <div className="flex gap-4 px-6 pb-6 overflow-x-auto">
        {COLUMNS.map((col) => (
          <div key={col.status} className="flex-1 min-w-[160px]">
            <Skeleton className="h-5 w-24 mb-3 bg-muted/50" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl bg-muted/50" />
              <Skeleton className="h-24 w-full rounded-xl bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 px-6 pb-6 overflow-x-auto flex-1">
      {COLUMNS.map((col) => (
        <BoardColumn
          key={col.status}
          status={col.status}
          label={col.label}
          color={col.color}
          countBg={col.countBg}
          tasks={board[col.status] ?? []}
        />
      ))}
    </div>
  )
}
