const cropAliases: Record<string, string[]> = {
  paddy: ['paddy', 'rice', 'వరి', 'బియ్యం'],
  cotton: ['cotton', 'పత్తి'],
  chilli: ['chilli', 'chili', 'mirchi', 'మిరప'],
  maize: ['maize', 'corn', 'మొక్కజొన్న'],
  tomato: ['tomato', 'టమాటా', 'టమోటా'],
}

export function matchCrop(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  return Object.entries(cropAliases).find(([, aliases]) => aliases.some(alias => normalized === alias || normalized.includes(alias)))?.[0] || null
}

export function matchYesNo(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (['yes', 'y', ' అవును', 'అవును', 'అవునండి'].some(word => normalized.includes(word.trim()))) return true
  if (['no', 'n', ' కాదు', 'కాదు', 'వద్దు'].some(word => normalized.includes(word.trim()))) return false
  return null
}