import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Lock, GitBranch, Loader2 } from "lucide-react"
import * as api from "@/lib/api"
import { toast } from "sonner"
import type { RepoInfo } from "@/types"

interface CloneRepoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloned: () => void
}

export function CloneRepoDialog({ open, onOpenChange, onCloned }: CloneRepoDialogProps) {
  const [repos, setRepos] = useState<RepoInfo[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [cloning, setCloning] = useState<string | null>(null)

  const fetchRepos = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const list = await api.listGitHubRepos(1, query || undefined)
      setRepos(list)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load repos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    fetchRepos("")
  }, [open, fetchRepos])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => fetchRepos(search), 300)
    return () => clearTimeout(timer)
  }, [search, open, fetchRepos])

  const handleClone = async (repo: RepoInfo) => {
    setCloning(repo.full_name)
    try {
      await api.cloneGitHubRepo(repo.full_name, repo.default_branch)
      toast.success(`Cloned ${repo.full_name}`)
      onOpenChange(false)
      onCloned()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clone failed")
    } finally {
      setCloning(null)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSearch("")
      setRepos([])
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle>Clone Repository</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border/50 bg-muted/30"
          />
        </div>

        <ScrollArea className="h-[360px] mt-2 -mx-2 px-2">
          {loading && repos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading repos...
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No repositories found
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {repos.map((repo) => (
                <button
                  key={repo.full_name}
                  disabled={cloning !== null}
                  onClick={() => handleClone(repo)}
                  className="w-full text-left rounded-lg p-3 transition-all duration-200 border border-transparent hover:bg-muted/40 hover:border-border/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-yellow-500/30 text-yellow-500">
                        <Lock className="w-2.5 h-2.5 mr-0.5" />
                        Private
                      </Badge>
                    )}
                    {cloning === repo.full_name && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0 text-primary" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <GitBranch className="w-3 h-3" />
                    {repo.default_branch}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
