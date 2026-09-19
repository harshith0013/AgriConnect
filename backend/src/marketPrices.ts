import { PrismaClient } from '@prisma/client'

export type MarketPriceQuery = { crop?: string; state?: string; district?: string; market?: string; fromDate?: string; toDate?: string }

const samplePrices = [
  { market: 'Warangal Mandi', state: 'Telangana', district: 'Warangal', cropName: 'Paddy', category: 'Grain', minPrice: 2100, maxPrice: 2450, modalPrice: 2300, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Jangaon Mandi', state: 'Telangana', district: 'Jangaon', cropName: 'Paddy', category: 'Grain', minPrice: 2050, maxPrice: 2380, modalPrice: 2240, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Suryapet Mandi', state: 'Telangana', district: 'Suryapet', cropName: 'Paddy', category: 'Grain', minPrice: 2150, maxPrice: 2500, modalPrice: 2360, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Warangal Mandi', state: 'Telangana', district: 'Warangal', cropName: 'Paddy', category: 'Grain', minPrice: 2040, maxPrice: 2320, modalPrice: 2190, unit: 'quintal', grade: 'FAQ', dateOffset: 7 },
  { market: 'Warangal Mandi', state: 'Telangana', district: 'Warangal', cropName: 'Paddy', category: 'Grain', minPrice: 1980, maxPrice: 2260, modalPrice: 2110, unit: 'quintal', grade: 'FAQ', dateOffset: 30 },
  { market: 'Warangal Mandi', state: 'Telangana', district: 'Warangal', cropName: 'Cotton', category: 'Fiber', minPrice: 6800, maxPrice: 7350, modalPrice: 7100, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Adilabad Mandi', state: 'Telangana', district: 'Adilabad', cropName: 'Cotton', category: 'Fiber', minPrice: 6900, maxPrice: 7480, modalPrice: 7200, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Guntur Mandi', state: 'Andhra Pradesh', district: 'Guntur', cropName: 'Chilli', category: 'Spice', minPrice: 12500, maxPrice: 15800, modalPrice: 14200, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
  { market: 'Khammam Mandi', state: 'Telangana', district: 'Khammam', cropName: 'Maize', category: 'Grain', minPrice: 1850, maxPrice: 2150, modalPrice: 2010, unit: 'quintal', grade: 'FAQ', dateOffset: 0 },
]

const dateAtOffset = (offset: number) => { const date = new Date(); date.setDate(date.getDate() - offset); date.setHours(0, 0, 0, 0); return date }

export async function ensureSamplePrices(prisma: PrismaClient) {
  if (process.env.MARKET_DATA_MODE === 'live') return
  for (const item of samplePrices) {
    const market = await prisma.market.upsert({ where: { name_state_district: { name: item.market, state: item.state, district: item.district } }, update: {}, create: { name: item.market, state: item.state, district: item.district } })
    await prisma.marketPriceRecord.upsert({ where: { marketId_cropName_priceDate_source: { marketId: market.id, cropName: item.cropName, priceDate: dateAtOffset(item.dateOffset), source: 'DEVELOPMENT_SAMPLE' } }, update: { minPrice: item.minPrice, maxPrice: item.maxPrice, modalPrice: item.modalPrice, retrievedAt: new Date() }, create: { marketId: market.id, cropName: item.cropName, category: item.category, minPrice: item.minPrice, maxPrice: item.maxPrice, modalPrice: item.modalPrice, unit: item.unit, grade: item.grade, priceDate: dateAtOffset(item.dateOffset), source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE' } })
  }
}

export async function getPrices(prisma: PrismaClient, query: MarketPriceQuery) {
  const fromDate = query.fromDate ? new Date(query.fromDate) : undefined
  const toDate = query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : undefined
  return prisma.marketPriceRecord.findMany({ where: { ...(query.crop ? { cropName: { contains: query.crop } } : {}), ...(query.state || query.district || query.market ? { market: { ...(query.state ? { state: query.state } : {}), ...(query.district ? { district: query.district } : {}), ...(query.market ? { name: { contains: query.market } } : {}) } } : {}), ...(fromDate || toDate ? { priceDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}) }, include: { market: true }, orderBy: [{ cropName: 'asc' }, { modalPrice: 'desc' }, { priceDate: 'desc' }] })
}
