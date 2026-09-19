import { GoogleGenAI } from '@google/genai'

export type GeminiInput = {
  crop: string
  imageBuffer: Buffer
  mimeType: string
  symptomDescription?: string
  language?: string
}
export type GeminiOutput = {
  status: 'COMPLETED' | 'LOW_CONFIDENCE' | 'UNSUPPORTED'
  prediction: string | null
  confidence: number | null
  provider: 'GEMINI'
  modelName: string
  modelVersion: string
  needsExpert: boolean
  summaryEn: string
  summaryTe: string
  observedSymptoms: string[]
  recommendedNextSteps: string[]
  explanation: string
  whenToSeekExpertHelp: string
  language: string
  possibleConditions: Array<{ name: string; certainty: string; reason: string }>
}

export class InferenceParseError extends Error {}
export class InferenceUnavailableError extends Error {}

function safeGeminiError(error: any): InferenceUnavailableError {
  const status = Number(error?.status || error?.response?.status)
  const message = String(error?.message || '').toLowerCase()
  if (status === 401 || status === 403 || message.includes('api key') || message.includes('permission')) return new InferenceUnavailableError('Gemini authentication failed. Check GEMINI_API_KEY.')
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) return new InferenceUnavailableError('Gemini quota or rate limit reached. Please try again later.')
  if (status >= 500 || message.includes('unavailable') || message.includes('network')) return new InferenceUnavailableError('Gemini is temporarily unavailable. Please try again.')
  return new InferenceUnavailableError('Gemini could not analyze this image. Please try a clear JPEG, PNG, or WebP image.')
}

type GeminiClient = {
  models: { generateContent: (request: Record<string, unknown>) => Promise<{ text?: string }> }
}

const supportedCrops = new Set(['paddy', 'rice', 'cotton', 'chilli', 'maize', 'tomato'])
const certaintyScore: Record<string, number> = { low: 30, medium: 60, high: 80 }
const allowedSeverities = new Set(['none', 'mild', 'moderate', 'severe'])
const responseSchema = {
  type: 'object',
  properties: {
    image_usable: { type: 'boolean' }, crop_matches_selection: { type: 'boolean' },
    visible_signs: { type: 'array', items: { type: 'string' } },
    possible_conditions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, certainty: { type: 'string', enum: ['low', 'medium', 'high'] }, reason: { type: 'string' } }, required: ['name', 'certainty', 'reason'] } },
    severity: { type: 'string', enum: ['none', 'mild', 'moderate', 'severe'] }, overall_certainty: { type: 'string', enum: ['low', 'medium', 'high'] },
    explanation: { type: 'string' }, recommended_next_steps: { type: 'array', items: { type: 'string' } }, when_to_seek_expert_help: { type: 'string' },
  },
  required: ['image_usable', 'crop_matches_selection', 'visible_signs', 'possible_conditions', 'severity', 'overall_certainty', 'explanation', 'recommended_next_steps', 'when_to_seek_expert_help'],
}

export function redactDoses(text: string, fallback: string): string {
  return /\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l|litre|liter)s?\s*(?:\/|per)\s*/i.test(text)
    ? fallback
    : text
}

function parseResponse(text: string): Record<string, any> {
  const unwrapped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try { parsed = JSON.parse(unwrapped) } catch { throw new InferenceParseError('Gemini returned malformed JSON') }
  if (!parsed || typeof parsed !== 'object') throw new InferenceParseError('Gemini returned an invalid response')
  const result = parsed as Record<string, any>
  if (typeof result.image_usable !== 'boolean' || typeof result.crop_matches_selection !== 'boolean' ||
    !Array.isArray(result.visible_signs) || !Array.isArray(result.possible_conditions) ||
    !allowedSeverities.has(result.severity) || !certaintyScore[result.overall_certainty]) {
    throw new InferenceParseError('Gemini response failed validation')
  }
  return result
}

export function toOutput(result: Record<string, any>, crop: string, modelName = 'gemini-3.7-flash'): GeminiOutput {
  const healthy = result.possible_conditions.some((condition: any) => /healthy|normal|no (?:disease|pest|visible issue)/i.test(String(condition.name)))
  const usable = result.image_usable && result.crop_matches_selection && (result.visible_signs.length > 0 || healthy)
  const first = result.possible_conditions[0]
  const confidence = usable && first ? Math.min(certaintyScore[result.overall_certainty], certaintyScore[first.certainty] || 0) : null
  const fallbackEn = usable ? 'The image may indicate a crop-health issue. Consult your local KVK before treatment.' : 'This image does not confirm a crop-health issue. Please submit a clearer image or consult your local KVK.'
  const fallbackTe = 'ఈ చిత్రం ఆధారంగా పంట సమస్యను నిర్ధారించలేము. స్పష్టమైన చిత్రాన్ని పంపండి లేదా స్థానిక KVK ను సంప్రదించండి.'
  const summaryEn = redactDoses(typeof result.summary_en === 'string' ? result.summary_en : fallbackEn, fallbackEn)
  const summaryTe = redactDoses(typeof result.summary_te === 'string' ? result.summary_te : fallbackTe, fallbackTe)
  const needsExpert = !usable || result.needs_expert === true || result.severity === 'moderate' || result.severity === 'severe'
  return {
    status: usable ? 'COMPLETED' : 'LOW_CONFIDENCE',
    prediction: usable && first ? (healthy ? `Assessment: ${String(first.name)}` : `Possible: ${String(first.name)}`) : usable ? null : result.crop_matches_selection ? 'The image does not confirm a crop-health issue.' : `The image does not look like ${crop}.`,
    confidence,
    provider: 'GEMINI', modelName, modelVersion: '1.0', needsExpert,
    summaryEn, summaryTe, observedSymptoms: result.visible_signs.map(String),
    recommendedNextSteps: Array.isArray(result.recommended_next_steps) ? result.recommended_next_steps.map(String) : [],
    explanation: typeof result.explanation === 'string' ? result.explanation : fallbackEn,
    whenToSeekExpertHelp: typeof result.when_to_seek_expert_help === 'string' ? result.when_to_seek_expert_help : 'Consult your local KVK or a qualified agricultural expert before treatment.',
    language: 'en',
    possibleConditions: Array.isArray(result.possible_conditions) ? result.possible_conditions.map((condition: any) => ({ name: String(condition.name), certainty: String(condition.certainty), reason: String(condition.reason) })) : [],
  }
}

export class GeminiInferenceProvider {
  private readonly client: GeminiClient
  private readonly timeoutMs: number
  constructor(options: { client?: GeminiClient; timeoutMs?: number } = {}) {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!options.client && !apiKey) throw new InferenceUnavailableError('Gemini API key is not configured')
    this.client = options.client || new GoogleGenAI({ apiKey }) as unknown as GeminiClient
    this.timeoutMs = options.timeoutMs || 60000
  }

  async analyse(input: GeminiInput): Promise<GeminiOutput> {
    if (!supportedCrops.has(input.crop.trim().toLowerCase())) return { ...toOutput({ image_usable: false, crop_matches_selection: true, visible_signs: [], possible_conditions: [], severity: 'none', overall_certainty: 'low' }, input.crop), status: 'UNSUPPORTED' }
    const language = input.language === 'te' ? 'Telugu' : 'English'
    const prompt = `You are a cautious crop-health image analyst. Analyze this ${input.crop} crop photograph. Respond in ${language}. ${input.symptomDescription ? `Farmer-reported symptoms: ${input.symptomDescription}` : 'No symptoms were reported.'}

  Inspect the entire image rather than relying on the crop name. First describe concrete visual evidence: lesion shape, color, borders, distribution, leaf age, wilting, holes, insects, webbing, stem or panicle symptoms, and image quality. For paddy, compare plausible diseases, insect pests, nutrient deficiencies, abiotic stress, and healthy growth; do not always choose the same condition. If the crop looks healthy, explicitly return one possible condition named "Healthy crop / no obvious visible issue" with high certainty only when the image is clear and shows normal growth; do not invent disease. Return up to three ranked possible conditions with a separate reason for each. If the image does not contain enough distinguishing evidence, set image_usable to false or return an empty list. Never claim certainty from one image. Never invent pesticide names, dosages, or guaranteed treatments. Recommend only low-risk observation or crop-management steps, and advise a KVK/agricultural expert for uncertain, severe, or treatment-related decisions.`
    const request = { model: process.env.GEMINI_MODEL || 'gemini-3.7-flash', contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: input.mimeType, data: input.imageBuffer.toString('base64') } }] }], config: { temperature: 0.2, responseMimeType: 'application/json', responseSchema } }
    let response: { text?: string } | undefined
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await Promise.race([this.client.models.generateContent(request), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini request timed out')), this.timeoutMs))])
        const parsed = parseResponse(response?.text || '')
        return { ...toOutput(parsed, input.crop), language: input.language || 'en' }
      } catch (error: any) {
        if (error instanceof InferenceParseError) {
          if (attempt === 0) continue
          throw error
        }
        if (error?.message === 'timeout') throw new InferenceUnavailableError('Gemini analysis timed out. Please try a clearer or smaller image.')
        if (attempt === 1 || ![408, 429, 500, 502, 503, 504].includes(error?.status)) throw safeGeminiError(error)
      }
    }
    throw new InferenceUnavailableError('Gemini service is unavailable')
  }

  async analyze(input: GeminiInput): Promise<GeminiOutput> { return this.analyse(input) }
}
