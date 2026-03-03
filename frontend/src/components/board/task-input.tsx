import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Mic, MicOff } from "lucide-react"
import { useVoiceInput } from "@/hooks/use-voice-input"
import * as api from "@/lib/api"
import { toast } from "sonner"

export function TaskInput() {
  const [value, setValue] = useState("")
  const [planMode, setPlanMode] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const appendVoice = useCallback((text: string) => {
    setValue((prev) => (prev ? prev + " " + text : text))
    textareaRef.current?.focus()
  }, [])

  const { available, active, toggle } = useVoiceInput(appendVoice)

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed) return

    const lines = trimmed.split("\n")
    const title = lines[0]
    const description = lines.slice(1).join("\n").trim()

    setSubmitting(true)
    try {
      await api.createTask({
        title,
        description,
        priority: 5,
        plan_mode: planMode,
      })
      setValue("")
      toast.success("Task created")
    } catch (err) {
      toast.error(
        "Failed: " + (err instanceof Error ? err.message : "Unknown error")
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="border rounded-xl bg-card p-4 shadow-sm">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add new task... (Cmd/Ctrl+Enter to submit)"
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[56px]"
          />
          <div className="flex flex-col gap-2">
            {available && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggle}
                className={active ? "bg-primary text-primary-foreground" : ""}
              >
                {active ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !value.trim()}
              className="whitespace-nowrap"
            >
              {submitting ? "..." : "Add"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="plan-mode-inline"
              checked={planMode}
              onCheckedChange={(c) => setPlanMode(c === true)}
            />
            <Label
              htmlFor="plan-mode-inline"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Plan mode
            </Label>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:block">
            Enter for newline, Cmd/Ctrl+Enter to submit
            {available ? " | Click mic for voice input" : ""}
          </span>
        </div>
      </div>
    </div>
  )
}
