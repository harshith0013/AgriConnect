import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type VoiceLanguage = 'en' | 'te'
export type VoiceProvider = { synthesize: (text: string, language: VoiceLanguage) => Promise<Buffer> }

const cacheDir = path.resolve(process.env.VOICE_CACHE_DIR || '.voice-cache')
const cacheKey = (text: string, language: VoiceLanguage) => createHash('sha256').update(`${language}:${text}`).digest('hex')

async function cached(text: string, language: VoiceLanguage, generate: () => Promise<Buffer>) {
  const file = path.join(cacheDir, `${cacheKey(text, language)}.mp3`)
  try { return await readFile(file) } catch { const audio = await generate(); await mkdir(cacheDir, { recursive: true }); await writeFile(file, audio); return audio }
}

const languageCode = (language: VoiceLanguage) => language === 'te' ? 'te-IN' : 'en-IN'

const google: VoiceProvider = { synthesize: (text, language) => cached(text, language, async () => {
  const key = process.env.GOOGLE_TTS_API_KEY
  if (!key) throw new Error('Google TTS credentials are not configured')
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { text }, voice: { languageCode: languageCode(language) }, audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 } }) })
  if (!response.ok) throw new Error('Google TTS is unavailable')
  const data = await response.json() as { audioContent?: string }
  if (!data.audioContent) throw new Error('Google TTS returned no audio')
  return Buffer.from(data.audioContent, 'base64')
}) }

const gemini: VoiceProvider = { synthesize: (text, language) => cached(text, language, async () => {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Gemini voice credentials are not configured')
  const model = process.env.GEMINI_VOICE_MODEL || 'gemini-2.5-flash-preview-tts'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: languageCode(language) } } }) })
  if (!response.ok) throw new Error('Gemini voice is unavailable')
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> }
  const encoded = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data
  if (!encoded) throw new Error('Gemini voice returned no audio')
  return Buffer.from(encoded, 'base64')
}) }

export function createVoiceProvider(): VoiceProvider | null {
  if (process.env.VOICE_PROVIDER === 'google') return google
  if (process.env.VOICE_PROVIDER === 'gemini') return gemini
  return null
}