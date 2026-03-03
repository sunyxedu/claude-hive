import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FolderOpen, ChevronDown, Loader2 } from "lucide-react"
import * as api from "@/lib/api"
import { toast } from "sonner"

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function AddProjectDialog({ open, onOpenChange, onCreated }: AddProjectDialogProps) {
  const [path, setPath] = useState("")
  const [branches, setBranches] = useState<string[]>([])
  const [mainBranch, setMainBranch] = useState("")
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const name = path ? path.split("/").filter(Boolean).pop() || "" : ""

  const reset = () => {
    setPath("")
    setBranches([])
    setMainBranch("")
  }

  const handleBrowse = async () => {
    try {
      const result = await api.browseDirectory()
      if (result.path) {
        setPath(result.path)
        setLoadingBranches(true)
        try {
          const list = await api.getGitBranches(result.path)
          setBranches(list)
          setMainBranch(list.length > 0 ? list[0] : "main")
        } catch {
          setBranches([])
          setMainBranch("main")
        } finally {
          setLoadingBranches(false)
        }
      }
    } catch {
      // User cancelled the folder picker
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!path.trim()) return

    setSubmitting(true)
    try {
      await api.createProject({
        name,
        path: path.trim(),
        main_branch: mainBranch || "main",
      })
      toast.success(`Project "${name}" added`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Folder picker */}
          <div className="space-y-2">
            <Label>Repository</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 h-10 border-border/50 bg-muted/30 hover:bg-muted/50 font-normal"
              onClick={handleBrowse}
            >
              <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
              {path ? (
                <span className="truncate text-foreground">{name}</span>
              ) : (
                <span className="text-muted-foreground">Choose folder...</span>
              )}
            </Button>
            {path && (
              <p className="text-xs text-muted-foreground truncate px-1">{path}</p>
            )}
          </div>

          {/* Branch selector */}
          {path && (
            <div className="space-y-2">
              <Label>Main branch</Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading branches...
                </div>
              ) : branches.length > 0 ? (
                <div className="relative">
                  <select
                    value={mainBranch}
                    onChange={(e) => setMainBranch(e.target.value)}
                    className="w-full h-10 rounded-md border border-border/50 bg-muted/30 px-3 text-sm text-foreground appearance-none cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-1">
                  No branches found — not a git repository?
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !path.trim()}
              className="shadow-lg shadow-primary/20"
            >
              {submitting ? "Adding..." : "Add Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
