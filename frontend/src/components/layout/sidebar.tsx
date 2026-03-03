import { FolderGit2, Hexagon, Users, DollarSign } from "lucide-react"
import { useBoardContext } from "@/context/board-context"

export function Sidebar() {
  const { config, workers, stats, totalTasks } = useBoardContext()
  const active = workers.filter((w) => w.status === "busy").length
  const projectName = config?.project_name || "Project"

  return (
    <aside className="hidden md:flex w-60 border-r bg-card flex-col shrink-0">
      <div className="px-4 py-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Hexagon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-base">Claude Hive</span>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Projects
        </div>
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 cursor-default">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm text-primary truncate">
              {projectName}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalTasks} tasks
          </div>
        </div>
      </nav>

      <div className="p-4 border-t space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          <span>
            {active}/{workers.length} workers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" />
          <span>${(stats?.total_cost_usd ?? 0).toFixed(2)} total cost</span>
        </div>
      </div>
    </aside>
  )
}
