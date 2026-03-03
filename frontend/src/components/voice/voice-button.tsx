import { Button } from "@/components/ui/button"
import { useVoiceInput } from "@/hooks/use-voice-input"

interface VoiceButtonProps {
  onResult: (text: string) => void
}

export function VoiceButton({ onResult }: VoiceButtonProps) {
  const { available, active, transcript, toggle } = useVoiceInput(onResult)

  if (!available) return null

  return (
    <div className="flex items-center gap-2.5">
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={toggle}
        className="border-hive-border"
      >
        {active ? "\u23F9 Stop" : "\uD83C\uDF99 Voice"}
      </Button>
      {transcript && (
        <span className="text-xs text-muted-foreground">{transcript}</span>
      )}
    </div>
  )
}
