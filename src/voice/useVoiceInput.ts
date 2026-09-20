import { useRef, useState } from 'react'
import type { Language } from '../i18n'

type Recognition = { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null }
type RecognitionConstructor = new () => Recognition

const recognitionConstructor = () => (window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition || (window as Window & { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition

export function useVoiceInput(language: Language, messages: { unsupported: string; permission: string; noSpeech: string; network: string }) {
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listen = (onText: (text: string) => void) => {
    setError('')
    const Constructor = typeof window !== 'undefined' ? recognitionConstructor() : undefined
    if (!Constructor) { setError(messages.unsupported); return false }
    const recognition = new Constructor()
    recognition.lang = language === 'te' ? 'te-IN' : 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = event => onText(event.results[0][0].transcript)
    recognition.onerror = event => setError(event.error === 'not-allowed' ? messages.permission : event.error === 'no-speech' ? messages.noSpeech : messages.network)
    recognition.onend = () => { if (timer.current) clearTimeout(timer.current) }
    recognition.start()
    timer.current = setTimeout(() => recognition.stop(), 8000)
    return true
  }
  return { listen, error, supported: typeof window !== 'undefined' && Boolean(recognitionConstructor()) }
}