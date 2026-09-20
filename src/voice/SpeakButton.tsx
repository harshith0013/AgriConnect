import { Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Language } from '../i18n'
import { getSpeechVoiceStatus, speak, watchVoices } from './speech'

type Props = { text: string; language: Language; label: string; token?: string; clipKey?: string; onNotice?: (message: string) => void }

export function SpeakButton({ text, language, label, token, clipKey, onNotice }: Props) {
  const [available, setAvailable] = useState(true)
  useEffect(() => watchVoices(() => setAvailable(getSpeechVoiceStatus(language).matchingVoice)), [language])
  const play = async () => {
    if (clipKey) {
      const clip = `/audio/${language}/${clipKey}.mp3`
      const response = await fetch(clip, { method: 'HEAD' }).catch(() => null)
      if (response?.ok) { new Audio(clip).play().catch(() => undefined); return }
    }
    if (speak(text, language, status => setAvailable(status.matchingVoice))) return
    if (language === 'te' && token) {
      try {
        const audio = await api.voiceTts(text, language, token)
        new Audio(URL.createObjectURL(audio)).play().catch(() => undefined)
      } catch { onNotice?.('Telugu voice is not available on this device.') }
    } else if (!available) onNotice?.('No matching voice is installed on this device.')
  }
  return <button type="button" className="speak-button" aria-label={label} title={label} onClick={() => void play()}><Volume2 size={22} /></button>
}