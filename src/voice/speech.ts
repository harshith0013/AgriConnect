import type { Language } from '../i18n'

export type SpeechVoiceStatus = { supported: boolean; matchingVoice: boolean }

const languageTag = (language: Language) => language === 'te' ? 'te-IN' : 'en-IN'

export function findVoice(language: Language, voices: SpeechSynthesisVoice[] = window.speechSynthesis?.getVoices() || []) {
  const tag = languageTag(language).toLowerCase()
  return voices.find(voice => voice.lang.toLowerCase() === tag) || voices.find(voice => voice.lang.toLowerCase().startsWith(language))
}

export function getSpeechVoiceStatus(language: Language): SpeechVoiceStatus {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  return { supported, matchingVoice: supported && Boolean(findVoice(language)) }
}

export function speak(text: string, language: Language, onStatus?: (status: SpeechVoiceStatus) => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return false
  try {
    const synthesis = window.speechSynthesis
    synthesis.cancel()
    const voice = findVoice(language)
    const status = { supported: true, matchingVoice: Boolean(voice) }
    onStatus?.(status)
    if (!voice) return false
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageTag(language)
    utterance.voice = voice
    utterance.rate = 0.85
    synthesis.speak(utterance)
    return true
  } catch {
    onStatus?.({ supported: true, matchingVoice: false })
    return false
  }
}

export function watchVoices(onChange: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => undefined
  const synthesis = window.speechSynthesis
  synthesis.addEventListener('voiceschanged', onChange)
  onChange()
  return () => synthesis.removeEventListener('voiceschanged', onChange)
}