const ones = ['సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది']
const tens = ['', '', 'ఇరవై', 'ముప్పై', 'నలభై', 'యాభై', 'అరవై', 'డెబ్బై', 'ఎనభై', 'తొంభై']

export function teluguNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return String(value)
  if (value < 10) return ones[value]
  if (value < 20) return ['పది', 'పదకొండు', 'పన్నెండు', 'పదమూడు', 'పద్నాలుగు', 'పదిహేను', 'పదహారు', 'పదిహేడు', 'పద్దెనిమిది', 'పంతొమ్మిది'][value - 10]
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`
  return String(value)
}

export function speakNumber(value: number, language: 'en' | 'te') {
  return language === 'te' ? teluguNumber(value) : value.toLocaleString('en-IN')
}