import { useState } from "react"
import {
  FolderGit2,
  Hexagon,
  Users,
  DollarSign,
  Plus,
  Trash2,
  Github,
  Download,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBoardContext } from "@/context/board-context"
import { AddProjectDialog } from "@/components/dialogs/add-project-dialog"
import { CloneRepoDialog } from "@/components/dialogs/clone-repo-dialog"
import * as api from "@/lib/api"
import { toast } from "sonner"
import type { ProjectOut } from "@/types"

export function Sidebar() {
  const {
    projects,
    activeProject,
    setActiveProject,
    refreshProjects,
    workers,
    stats,
    totalTasks,
    user,
    refreshUser,
  } = useBoardContext()
  const [addOpen, setAddOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)

  const active = workers.filter((w) => w.status === "busy").length

  const handleDelete = async (e: React.MouseEvent, project: ProjectOut) => {
    e.stopPropagation()
    try {
      await api.deleteProject(project.id)
      toast.success(`Deleted "${project.name}"`)
      await refreshProjects()
      if (activeProject?.id === project.id) {
        setActiveProject(null)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project")
    }
  }

  const handleGitHubLogin = async () => {
    try {
      const { url } = await api.getGitHubAuthUrl(window.location.href)
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start GitHub login")
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
      await refreshUser()
      toast.success("Logged out")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to logout")
    }
  }

  const handleCloned = async () => {
    await refreshProjects()
  }

  return (
    <>
      <aside className="hidden md:flex w-60 border-r border-border/50 bg-sidebar flex-col shrink-0">
        <div className="px-4 py-5 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center glow-sm">
              <Hexagon className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Claude Hive
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            {projects.map((project) => {
              const isActive = activeProject?.id === project.id
              return (
                <div
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className={`rounded-lg p-3 cursor-pointer transition-all duration-200 group ${
                    isActive
                      ? "bg-primary/8 border border-primary/20 glow-sm"
                      : "border border-transparent hover:bg-muted/40 hover:border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderGit2
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm truncate ${
                        isActive ? "text-primary" : "text-foreground/80"
                      }`}
                    >
                      {project.name}
                    </span>
                    {projects.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                        onClick={(e) => handleDelete(e, project)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {isActive && (
                    <div className="text-xs text-muted-foreground mt-1 ml-6">
                      {totalTasks} tasks
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2.5 text-xs text-muted-foreground">
          {user ? (
            <div className="flex items-center gap-2 mb-2">
              {user.github_avatar ? (
                <img
                  src={user.github_avatar}
                  alt={user.github_username}
                  className="w-6 h-6 rounded-full shrink-0"
                />
              ) : (
                <Github className="w-4 h-4 shrink-0" />
              )}
              <span className="text-foreground font-medium text-sm truncate">
                {user.github_username}
              </span>
              <div className="flex items-center gap-0.5 ml-auto shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setCloneOpen(true)}
                  title="Clone Repo"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-400"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2 mb-2 border-border/50 bg-muted/30 hover:bg-muted/50 text-xs"
              onClick={handleGitHubLogin}
            >
              <Github className="w-3.5 h-3.5" />
              Sign in with GitHub
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>
              <span className="text-foreground font-medium">{active}</span>
              /{workers.length} workers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <span className="text-foreground font-medium">
                ${(stats?.total_cost_usd ?? 0).toFixed(2)}
              </span>{" "}
              total cost
            </span>
          </div>
        </div>
      </aside>

      <AddProjectDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={refreshProjects}
      />
      <CloneRepoDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCloned={handleCloned}
      />
    </>
  )
}
