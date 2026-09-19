import assert from 'node:assert/strict'
import sharp from 'sharp'
import { GeminiInferenceProvider, InferenceParseError, InferenceUnavailableError, toOutput, redactDoses } from './geminiProvider.js'

const good = {
  image_usable: true, image_issue: 'none', crop_matches_selection: true,
  visible_signs: ['brown spots with yellow rings on lower leaves'],
  possible_conditions: [{ name: 'Early blight', certainty: 'medium', reason: 'ring-shaped spots' }],
  severity: 'moderate', overall_certainty: 'high', needs_expert: false,
  summary_en: 'The leaves have brown spots. Show the photo to your KVK officer.',
  summary_te: 'ఆకులపై గోధుమ రంగు మచ్చలు ఉన్నాయి. ఫోటోను KVK అధికారికి చూపించండి.',
}

function fake(replies: Array<string | Error>) {
  let calls = 0
  const client: any = { models: { generateContent: async () => {
    const reply = replies[Math.min(calls++, replies.length - 1)]
    if (reply instanceof Error) throw reply
    return { text: reply }
  } } }
  return { client, calls: () => calls }
}

async function png() {
  return sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#3f8f3a' } }).png().toBuffer()
}

(async () => {
  const imageBuffer = await png()
  const run = (fakeClient: ReturnType<typeof fake>, crop = 'tomato') =>
    new GeminiInferenceProvider({ client: fakeClient.client, timeoutMs: 2000 }).analyse({ crop, imageBuffer, mimeType: 'image/png' })

  let fakeClient = fake([JSON.stringify(good)])
  let output = await run(fakeClient)
  assert.equal(output.status, 'COMPLETED'); assert.equal(output.confidence, 60)
  assert.equal(output.prediction, 'Possible: Early blight'); assert.equal(output.provider, 'GEMINI')
  assert.equal(output.needsExpert, true)

  output = await run(fake(['```json\n' + JSON.stringify(good) + '\n```']))
  assert.equal(output.confidence, 60)

  output = await run(fake([JSON.stringify({ ...good, image_usable: false, image_issue: 'blurry' })]))
  assert.equal(output.status, 'LOW_CONFIDENCE'); assert.equal(output.confidence, null); assert.equal(output.needsExpert, true)

  output = await run(fake([JSON.stringify({ ...good, crop_matches_selection: false })]))
  assert.equal(output.status, 'LOW_CONFIDENCE'); assert.match(output.prediction!, /does not look like tomato/)

  output = await run(fake([JSON.stringify({ ...good, visible_signs: [], possible_conditions: [], severity: 'none', overall_certainty: 'high' })]))
  assert.equal(output.status, 'LOW_CONFIDENCE'); assert.match(output.prediction!, /does not confirm/)

  output = await run(fake([JSON.stringify({ ...good, severity: 'mild', possible_conditions: [{ name: 'X', certainty: 'high', reason: 'r' }], overall_certainty: 'high' })]))
  assert.equal(output.confidence, 80)

  output = await run(fake([JSON.stringify({ ...good, summary_en: 'Spray 2 g per litre of mancozeb.' })]))
  assert.match(output.summaryEn, /KVK/); assert.ok(!/2 g/.test(output.summaryEn))
  assert.equal(redactDoses('Keep leaves dry.', 'x'), 'Keep leaves dry.')
  assert.equal(redactDoses('use 5 ml/L', 'x'), 'x')

  fakeClient = fake([JSON.stringify(good)])
  output = await run(fakeClient, 'banana')
  assert.equal(output.status, 'UNSUPPORTED'); assert.equal(fakeClient.calls(), 0)

  fakeClient = fake(['not json', JSON.stringify(good)])
  output = await run(fakeClient); assert.equal(fakeClient.calls(), 2); assert.equal(output.status, 'COMPLETED')

  await assert.rejects(run(fake([JSON.stringify({ ...good, severity: 'catastrophic' })])), InferenceParseError)

  const rateLimitError: any = new Error('rate'); rateLimitError.status = 429
  fakeClient = fake([rateLimitError, JSON.stringify(good)])
  output = await run(fakeClient); assert.equal(fakeClient.calls(), 2)
  await assert.rejects(run(fake([rateLimitError, rateLimitError])), InferenceUnavailableError)

  const badRequestError: any = new Error('bad'); badRequestError.status = 400
  fakeClient = fake([badRequestError])
  await assert.rejects(run(fakeClient), InferenceUnavailableError); assert.equal(fakeClient.calls(), 1)

  assert.equal(toOutput(good as any, 'tomato').confidence, 60)
  console.log('all Gemini provider tests passed')
})().catch(error => { console.error(error); process.exit(1) })
