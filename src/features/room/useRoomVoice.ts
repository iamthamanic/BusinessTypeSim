/**
 * Room composer voice capture — MediaRecorder + optional SpeechRecognition transcript.
 * Location: src/features/room/useRoomVoice.ts
 */
import { useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useRoomVoice(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const baseDraftRef = useRef('')

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function start(currentDraft: string) {
    setError(null)
    baseDraftRef.current = currentDraft.trim()
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      setRecording(true)

      const Ctor = getSpeechRecognitionCtor()
      if (Ctor) {
        const recognition = new Ctor()
        recognition.lang = 'de-DE'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event) => {
          let interim = ''
          let finalText = ''
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const piece = event.results[i]?.[0]?.transcript ?? ''
            if (event.results[i]?.isFinal) finalText += piece
            else interim += piece
          }
          const combined = [baseDraftRef.current, finalText || interim]
            .filter(Boolean)
            .join(baseDraftRef.current && (finalText || interim) ? ' ' : '')
          onTranscript(combined.trim())
          if (finalText) {
            baseDraftRef.current = [baseDraftRef.current, finalText.trim()]
              .filter(Boolean)
              .join(' ')
              .trim()
          }
        }
        recognition.onerror = (event) => {
          if (event.error === 'not-allowed') {
            setError('Mikrofonzugriff wurde verweigert.')
          }
        }
        recognitionRef.current = recognition
        recognition.start()
      }
    } catch {
      setError('Mikrofon ist nicht verfügbar oder wurde blockiert.')
      setRecording(false)
    }
  }

  function stop() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    mediaRecorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setRecording(false)

    if (!getSpeechRecognitionCtor() && chunksRef.current.length > 0) {
      const seconds = Math.max(1, Math.round(chunksRef.current.reduce((sum, blob) => sum + blob.size, 0) / 16000))
      const note = `Audioaufnahme (${seconds}s) — bitte Text ergänzen.`
      const next = [baseDraftRef.current, note].filter(Boolean).join(' ').trim()
      onTranscript(next)
    }
  }

  return { recording, error, start, stop, clearError: () => setError(null) }
}
