import { BoardProvider } from "@/context/board-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { TaskInput } from "@/components/board/task-input"
import { Board } from "@/components/board/board"
import { Toaster } from "@/components/ui/sonner"

export default function App() {
  return (
    <BoardProvider>
      <div className="flex h-dvh bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto">
            <TaskInput />
            <Board />
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </BoardProvider>
  )
}
