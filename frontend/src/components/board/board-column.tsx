import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskCard } from "./task-card"
import type { TaskOut, TaskStatus } from "@/types"

interface BoardColumnProps {
  status: TaskStatus
  label: string
  color: string
  countBg: string
  tasks: TaskOut[]
}

export function BoardColumn({ label, color, countBg, tasks }: BoardColumnProps) {
  return (
    <div className="flex-1 min-w-[160px] flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${countBg}`}
        >
          {tasks.length}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 pr-1">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-xl">
              No tasks
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
