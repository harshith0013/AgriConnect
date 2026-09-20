import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchCrop, matchYesNo } from './voiceMatchers.ts'
import { speakNumber, teluguNumber } from './teluguNumbers.ts'

test('matches English and Telugu crop names', () => {
  assert.equal(matchCrop('rice'), 'paddy')
  assert.equal(matchCrop('మిరప'), 'chilli')
  assert.equal(matchCrop('tomato crop'), 'tomato')
})

test('matches yes and no in English and Telugu', () => {
  assert.equal(matchYesNo('yes'), true)
  assert.equal(matchYesNo('అవును'), true)
  assert.equal(matchYesNo('no'), false)
  assert.equal(matchYesNo('కాదు'), false)
})

test('speaks common Telugu numbers without guessing larger forms', () => {
  assert.equal(teluguNumber(7), 'ఏడు')
  assert.equal(teluguNumber(12), 'పన్నెండు')
  assert.equal(teluguNumber(20), 'ఇరవై')
  assert.equal(speakNumber(12, 'te'), 'పన్నెండు')
})

test('speech wrapper cancels and speaks with a matching voice', async () => {
  const events: string[] = []
  const voice = { lang: 'te-IN', name: 'Test Telugu' } as SpeechSynthesisVoice
  const synthesis = { getVoices: () => [voice], cancel: () => events.push('cancel'), speak: () => events.push('speak'), addEventListener: () => undefined, removeEventListener: () => undefined }
  Object.assign(globalThis, { window: { speechSynthesis: synthesis }, SpeechSynthesisUtterance: class { rate = 0; lang = ''; voice?: SpeechSynthesisVoice; text: string; constructor(text: string) { this.text = text } } })
  const { speak } = await import('./speech.ts')
  assert.equal(speak('నమస్కారం', 'te'), true)
  assert.deepEqual(events, ['cancel', 'speak'])
})