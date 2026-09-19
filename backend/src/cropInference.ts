import { GeminiInferenceProvider, type GeminiInput, type GeminiOutput } from './geminiProvider.js'

export type InferenceInput = GeminiInput
export type InferenceResult = GeminiOutput

export interface CropInferenceProvider {
  analyze(input: InferenceInput): Promise<InferenceResult>
}

export function createInferenceProvider(): CropInferenceProvider {
  return new GeminiInferenceProvider()
}
