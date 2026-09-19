export type InferenceInput = { cropName: string; imagePath: string }
export type InferenceResult = { prediction: string | null; confidence: number | null; resultStatus: 'COMPLETED' | 'LOW_CONFIDENCE' | 'UNSUPPORTED' | 'FAILED'; guidanceKey: string | null; modelName: string; modelVersion: string; provider: string }

export interface CropInferenceProvider {
  analyze(input: InferenceInput): Promise<InferenceResult>
}

const supportedCrops = new Set(['paddy', 'rice', 'cotton', 'chilli', 'maize', 'tomato'])

export class MockInferenceProvider implements CropInferenceProvider {
  async analyze(input: InferenceInput): Promise<InferenceResult> {
    if (!supportedCrops.has(input.cropName.trim().toLowerCase())) return { prediction: null, confidence: null, resultStatus: 'UNSUPPORTED', guidanceKey: 'cropNotSupported', modelName: 'development-demo-provider', modelVersion: '0.1.0', provider: 'MOCK_DEMO' }
    return { prediction: 'Demo image review: possible leaf stress pattern', confidence: 0.42, resultStatus: 'LOW_CONFIDENCE', guidanceKey: 'lowConfidenceGuidance', modelName: 'development-demo-provider', modelVersion: '0.1.0', provider: 'MOCK_DEMO' }
  }
}

export function createInferenceProvider(): CropInferenceProvider {
  return new MockInferenceProvider()
}
