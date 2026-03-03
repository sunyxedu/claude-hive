import { useState, useCallback, useRef, useEffect } from "react"

interface UseVoiceInputReturn {
  available: boolean
  active: boolean
  transcript: string
  toggle: () => void
}

export function useVoiceInput(onResult: (text: string) => void): UseVoiceInputReturn {
  const [available, setAvailable] = useState(false)
  const [active, setActive] = useState(false)
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    setAvailable(true)
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("")
      setTranscript(text)
      if (event.results[0].isFinal) {
        onResultRef.current(text)
        setTranscript("Added to description")
      }
    }

    recognition.onend = () => {
      setActive(false)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setTranscript("Error: " + e.error)
      setActive(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (active) {
      recognition.stop()
    } else {
      recognition.start()
      setActive(true)
      setTranscript("Listening...")
    }
  }, [active])

  return { available, active, transcript, toggle }
}
