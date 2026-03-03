import { Code2 } from "lucide-react"
import { useBoardContext } from "@/context/board-context"

export function Header() {
  const { totalTasks } = useBoardContext()

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center md:hidden">
          <Code2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Claude Hive Task Manager</h1>
          <p className="text-sm text-muted-foreground">
            {totalTasks} tasks
          </p>
        </div>
      </div>
    </header>
  )
}
