import { useBoardContext } from "@/context/board-context"
import { BoardColumn } from "./board-column"
import { Skeleton } from "@/components/ui/skeleton"
import type { TaskStatus } from "@/types"

const COLUMNS: { status: TaskStatus; label: string; color: string; countBg: string }[] = [
  { status: "pending", label: "Pending", color: "text-gray-600", countBg: "bg-gray-100 text-gray-600" },
  { status: "in_progress", label: "In Progress", color: "text-blue-600", countBg: "bg-blue-100 text-blue-600" },
  { status: "merging", label: "Merging", color: "text-amber-600", countBg: "bg-amber-100 text-amber-600" },
  { status: "testing", label: "Testing", color: "text-orange-600", countBg: "bg-orange-100 text-orange-600" },
  { status: "completed", label: "Completed", color: "text-emerald-600", countBg: "bg-emerald-100 text-emerald-600" },
  { status: "failed", label: "Failed", color: "text-red-600", countBg: "bg-red-100 text-red-600" },
]

export function Board() {
  const { board, loading } = useBoardContext()

  if (loading) {
    return (
      <div className="flex gap-4 px-6 pb-6 overflow-x-auto">
        {COLUMNS.map((col) => (
          <div key={col.status} className="flex-1 min-w-[160px]">
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
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
