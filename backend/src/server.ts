import 'dotenv/config'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ensureSamplePrices, getPrices } from './marketPrices.js'
import { ensureLogisticsSamples } from './logistics.js'
import { createInferenceProvider } from './cropInference.js'

const prisma = new PrismaClient()
const app = express()
const port = Number(process.env.PORT || 4000)
const jwtSecret = process.env.JWT_SECRET || 'development-only-secret'
const privateUploadDir = path.resolve(process.env.CROP_UPLOAD_DIR || 'private-uploads')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) })
const inferenceProvider = createInferenceProvider()

type Role = 'FARMER' | 'BUYER'
type AuthRequest = Request & { user?: { id: string; role: Role } }

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174').split(',')
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }))
app.use(express.json({ limit: '2mb' }))
app.use('/private-uploads', (_request, response) => response.status(404).json({ error: 'Private files are not public' }))

const asyncRoute = (handler: (request: AuthRequest, response: Response) => Promise<unknown>) => (request: AuthRequest, response: Response, next: NextFunction) => Promise.resolve(handler(request, response)).catch(next)
const tokenFor = (user: { id: string; role: string }) => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' })
const required = (value: unknown, label: string) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`); return value.trim() }
const positive = (value: unknown, label: string) => { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be greater than zero`); return parsed }

const auth = (request: AuthRequest, response: Response, next: NextFunction) => {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' })
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as { sub: string; role: Role }
    request.user = { id: payload.sub, role: payload.role }
    next()
  } catch { response.status(401).json({ error: 'Invalid or expired session' }) }
}
const role = (expected: Role) => (request: AuthRequest, response: Response, next: NextFunction) => request.user?.role === expected ? next() : response.status(403).json({ error: `${expected.toLowerCase()} access required` })
const publicUser = (user: { id: string; role: string; name: string; mobile: string; email: string | null; language: string }) => ({ id: user.id, role: user.role, name: user.name, mobile: user.mobile, email: user.email, language: user.language })

app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'agriconnect-api' }))

app.post('/api/auth/register/farmer', asyncRoute(async (request, response) => {
  const { name, mobile, password, language = 'en', state, district, village, farmSize, crops } = request.body
  if (!password || password.length < 6) return response.status(400).json({ error: 'Password must contain at least 6 characters' })
  const user = await prisma.user.create({ data: { name: required(name, 'Name'), mobile: required(mobile, 'Mobile'), passwordHash: await bcrypt.hash(password, 12), language, role: 'FARMER', farmerProfile: { create: { state: required(state, 'State'), district: required(district, 'District'), village: required(village, 'Village'), farmSize: positive(farmSize, 'Farm size'), crops: required(crops, 'Crops') } } }, include: { farmerProfile: true } })
  response.status(201).json({ token: tokenFor(user), user: publicUser(user), profile: user.farmerProfile })
}))

app.post('/api/auth/register/buyer', asyncRoute(async (request, response) => {
  const { name, mobile, email, password, language = 'en', businessName, buyerType, state, district, location } = request.body
  if (!password || password.length < 6) return response.status(400).json({ error: 'Password must contain at least 6 characters' })
  const user = await prisma.user.create({ data: { name: required(name, 'Name'), mobile: required(mobile, 'Mobile'), email: email?.trim() || null, passwordHash: await bcrypt.hash(password, 12), language, role: 'BUYER', buyerProfile: { create: { businessName: required(businessName, 'Business name'), buyerType: required(buyerType, 'Buyer type'), state: required(state, 'State'), district: required(district, 'District'), location: required(location, 'Location') } } }, include: { buyerProfile: true } })
  response.status(201).json({ token: tokenFor(user), user: publicUser(user), profile: user.buyerProfile })
}))

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const { mobile, password, role: requestedRole } = request.body
  const user = await prisma.user.findUnique({ where: { mobile: required(mobile, 'Mobile') } })
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)) || (requestedRole && user.role !== requestedRole)) return response.status(401).json({ error: 'Mobile, password, or account type is incorrect' })
  response.json({ token: tokenFor(user), user: publicUser(user) })
}))

app.get('/api/me', auth, asyncRoute(async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: request.user!.id }, include: { farmerProfile: true, buyerProfile: true } })
  if (!user) return response.status(404).json({ error: 'Account not found' })
  response.json({ user: publicUser(user), profile: user.farmerProfile || user.buyerProfile })
}))

app.get('/api/listings', asyncRoute(async (request, response) => {
  const { search, category, location, minPrice, maxPrice, minQuantity } = request.query
  const listings = await prisma.produceListing.findMany({ where: { status: 'AVAILABLE', ...(search ? { cropName: { contains: String(search) } } : {}), ...(category ? { category: String(category) } : {}), ...(location ? { pickupLocation: { contains: String(location) } } : {}), ...(minPrice ? { expectedPrice: { gte: Number(minPrice) } } : {}), ...(maxPrice ? { expectedPrice: { lte: Number(maxPrice) } } : {}), ...(minQuantity ? { quantity: { gte: Number(minQuantity) } } : {}) }, include: { farmer: { select: { name: true, farmerProfile: { select: { state: true, district: true, village: true } } } }, _count: { select: { offers: true } } }, orderBy: { createdAt: 'desc' } })
  response.json({ listings })
}))

app.get('/api/listings/mine', auth, role('FARMER'), asyncRoute(async (request, response) => { response.json({ listings: await prisma.produceListing.findMany({ where: { farmerId: request.user!.id }, include: { _count: { select: { offers: true } } }, orderBy: { createdAt: 'desc' } }) }) }))

app.post('/api/listings', auth, role('FARMER'), asyncRoute(async (request, response) => {
  const { cropName, category, quantity, unit, quality, expectedPrice, availabilityDate, pickupLocation, description, imageUrl } = request.body
  const listing = await prisma.produceListing.create({ data: { farmerId: request.user!.id, cropName: required(cropName, 'Crop name'), category: required(category, 'Category'), quantity: positive(quantity, 'Quantity'), unit: required(unit, 'Unit'), quality: quality?.trim() || null, expectedPrice: positive(expectedPrice, 'Expected price'), availabilityDate: new Date(availabilityDate), pickupLocation: required(pickupLocation, 'Pickup location'), description: description?.trim() || null, imageUrl: imageUrl?.trim() || null } })
  response.status(201).json({ listing })
}))

app.get('/api/listings/:id', asyncRoute(async (request, response) => {
  const listing = await prisma.produceListing.findUnique({ where: { id: String(request.params.id) }, include: { farmer: { select: { id: true, name: true, farmerProfile: true } } } })
  if (!listing || listing.status !== 'AVAILABLE') return response.status(404).json({ error: 'Available listing not found' })
  response.json({ listing })
}))

app.patch('/api/listings/:id', auth, role('FARMER'), asyncRoute(async (request, response) => {
  const current = await prisma.produceListing.findUnique({ where: { id: String(request.params.id) } })
  if (!current) return response.status(404).json({ error: 'Listing not found' })
  if (current.farmerId !== request.user!.id) return response.status(403).json({ error: 'You can edit only your own listings' })
  const data = request.body
  const listing = await prisma.produceListing.update({ where: { id: current.id }, data: { ...(data.cropName !== undefined ? { cropName: required(data.cropName, 'Crop name') } : {}), ...(data.category !== undefined ? { category: required(data.category, 'Category') } : {}), ...(data.quantity !== undefined ? { quantity: positive(data.quantity, 'Quantity') } : {}), ...(data.unit !== undefined ? { unit: required(data.unit, 'Unit') } : {}), ...(data.expectedPrice !== undefined ? { expectedPrice: positive(data.expectedPrice, 'Expected price') } : {}), ...(data.pickupLocation !== undefined ? { pickupLocation: required(data.pickupLocation, 'Pickup location') } : {}), ...(data.quality !== undefined ? { quality: data.quality?.trim() || null } : {}), ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}), ...(data.status !== undefined ? { status: data.status } : {}) } })
  response.json({ listing })
}))

app.delete('/api/listings/:id', auth, role('FARMER'), asyncRoute(async (request, response) => { const listing = await prisma.produceListing.findUnique({ where: { id: String(request.params.id) } }); if (!listing) return response.status(404).json({ error: 'Listing not found' }); if (listing.farmerId !== request.user!.id) return response.status(403).json({ error: 'You can delete only your own listings' }); await prisma.produceListing.update({ where: { id: listing.id }, data: { status: 'INACTIVE' } }); response.status(204).send() }))

app.get('/api/listings/:id/offers', auth, role('FARMER'), asyncRoute(async (request, response) => { const listing = await prisma.produceListing.findUnique({ where: { id: String(request.params.id) } }); if (!listing) return response.status(404).json({ error: 'Listing not found' }); if (listing.farmerId !== request.user!.id) return response.status(403).json({ error: 'You can view offers only for your listings' }); response.json({ offers: await prisma.offer.findMany({ where: { listingId: listing.id }, include: { buyer: { select: { name: true, buyerProfile: true } } }, orderBy: { createdAt: 'desc' } }) }) }))

app.post('/api/listings/:id/offers', auth, role('BUYER'), asyncRoute(async (request, response) => {
  const listing = await prisma.produceListing.findUnique({ where: { id: String(request.params.id) } })
  if (!listing || listing.status !== 'AVAILABLE') return response.status(404).json({ error: 'Listing is no longer available' })
  const requestedQuantity = positive(request.body.requestedQuantity, 'Requested quantity')
  if (requestedQuantity > listing.quantity) return response.status(400).json({ error: 'Requested quantity exceeds available quantity' })
  const offer = await prisma.offer.create({ data: { listingId: listing.id, buyerId: request.user!.id, offeredPrice: positive(request.body.offeredPrice, 'Offered price'), requestedQuantity, message: request.body.message?.trim() || null } })
  await prisma.produceListing.update({ where: { id: listing.id }, data: { status: 'OFFER_RECEIVED' } })
  response.status(201).json({ offer })
}))

app.get('/api/offers/mine', auth, role('BUYER'), asyncRoute(async (request, response) => { response.json({ offers: await prisma.offer.findMany({ where: { buyerId: request.user!.id }, include: { listing: true }, orderBy: { createdAt: 'desc' } }) }) }))

app.patch('/api/offers/:id/status', auth, role('FARMER'), asyncRoute(async (request, response) => {
  const offer = await prisma.offer.findUnique({ where: { id: String(request.params.id) }, include: { listing: true } })
  if (!offer) return response.status(404).json({ error: 'Offer not found' })
  if (offer.listing.farmerId !== request.user!.id) return response.status(403).json({ error: 'You can respond only to offers on your listings' })
  if (offer.status !== 'PENDING') return response.status(409).json({ error: 'This offer has already been resolved' })
  const nextStatus = request.body.status
  if (!['ACCEPTED', 'REJECTED'].includes(nextStatus)) return response.status(400).json({ error: 'Status must be ACCEPTED or REJECTED' })
  if (nextStatus === 'REJECTED') { const rejected = await prisma.offer.update({ where: { id: offer.id }, data: { status: 'REJECTED' } }); return response.json({ offer: rejected }) }
  const result = await prisma.$transaction(async transaction => {
    const listing = await transaction.produceListing.findUnique({ where: { id: offer.listingId } })
    if (!listing || listing.status === 'ORDER_CONFIRMED' || offer.requestedQuantity > listing.quantity) throw new Error('Listing is no longer available for this order')
    await transaction.offer.updateMany({ where: { listingId: offer.listingId, status: 'PENDING', id: { not: offer.id } }, data: { status: 'REJECTED' } })
    const accepted = await transaction.offer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED' } })
    const order = await transaction.order.create({ data: { offerId: accepted.id, listingId: listing.id, farmerId: listing.farmerId, buyerId: accepted.buyerId, agreedPrice: accepted.offeredPrice, quantity: accepted.requestedQuantity } })
    await transaction.produceListing.update({ where: { id: listing.id }, data: { status: 'ORDER_CONFIRMED' } })
    return { offer: accepted, order }
  })
  response.json(result)
}))

app.get('/api/orders/mine', auth, asyncRoute(async (request, response) => { const where = request.user!.role === 'FARMER' ? { farmerId: request.user!.id } : { buyerId: request.user!.id }; response.json({ orders: await prisma.order.findMany({ where, include: { listing: true, offer: true, farmer: { select: { name: true } }, buyer: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }) }) }))

app.get('/api/market-prices', asyncRoute(async (request, response) => {
  await ensureSamplePrices(prisma)
  const records = await getPrices(prisma, { crop: request.query.crop ? String(request.query.crop) : undefined, state: request.query.state ? String(request.query.state) : undefined, district: request.query.district ? String(request.query.district) : undefined, market: request.query.market ? String(request.query.market) : undefined, fromDate: request.query.fromDate ? String(request.query.fromDate) : undefined, toDate: request.query.toDate ? String(request.query.toDate) : undefined })
  response.json({ records, dataStatus: process.env.MARKET_DATA_MODE === 'live' ? 'LIVE' : 'SAMPLE', source: process.env.MARKET_DATA_MODE === 'live' ? 'data.gov.in/Agmarknet' : 'Development sample data', retrievedAt: new Date().toISOString() })
}))

app.get('/api/market-prices/compare', asyncRoute(async (request, response) => {
  await ensureSamplePrices(prisma)
  const crop = required(request.query.crop, 'Crop')
  const records = await getPrices(prisma, { crop, state: request.query.state ? String(request.query.state) : undefined, district: request.query.district ? String(request.query.district) : undefined })
  response.json({ crop, records, dataStatus: process.env.MARKET_DATA_MODE === 'live' ? 'LIVE' : 'SAMPLE', source: process.env.MARKET_DATA_MODE === 'live' ? 'data.gov.in/Agmarknet' : 'Development sample data' })
}))

app.get('/api/market-prices/history', asyncRoute(async (request, response) => {
  await ensureSamplePrices(prisma)
  const records = await getPrices(prisma, { crop: required(request.query.crop, 'Crop'), market: request.query.market ? String(request.query.market) : undefined, fromDate: request.query.fromDate ? String(request.query.fromDate) : undefined, toDate: request.query.toDate ? String(request.query.toDate) : undefined })
  response.json({ records, dataStatus: process.env.MARKET_DATA_MODE === 'live' ? 'LIVE' : 'SAMPLE', source: process.env.MARKET_DATA_MODE === 'live' ? 'data.gov.in/Agmarknet' : 'Development sample data' })
}))

app.get('/api/market-prices/offer-comparison', auth, role('FARMER'), asyncRoute(async (request, response) => {
  await ensureSamplePrices(prisma)
  const offer = await prisma.offer.findUnique({ where: { id: required(request.query.offerId, 'Offer') }, include: { listing: true } })
  if (!offer || offer.listing.farmerId !== request.user!.id) return response.status(404).json({ error: 'Offer not found' })
  const records = await getPrices(prisma, { crop: offer.listing.cropName, market: request.query.market ? String(request.query.market) : undefined })
  response.json({ offer: { id: offer.id, offeredPrice: offer.offeredPrice, requestedQuantity: offer.requestedQuantity, unit: offer.listing.unit }, records, dataStatus: process.env.MARKET_DATA_MODE === 'live' ? 'LIVE' : 'SAMPLE', source: process.env.MARKET_DATA_MODE === 'live' ? 'data.gov.in/Agmarknet' : 'Development sample data' })
}))

app.get('/api/cold-storage', asyncRoute(async (request, response) => {
  await ensureLogisticsSamples(prisma)
  const facilities = await prisma.coldStorageFacility.findMany({ where: { ...(request.query.state ? { state: String(request.query.state) } : {}), ...(request.query.district ? { district: String(request.query.district) } : {}), ...(request.query.location ? { location: { contains: String(request.query.location) } } : {}), ...(request.query.crop ? { supportedCrops: { contains: String(request.query.crop) } } : {}), ...(request.query.name ? { name: { contains: String(request.query.name) } } : {}) }, orderBy: { name: 'asc' } })
  response.json({ facilities, dataStatus: 'SAMPLE', source: 'Development sample data', retrievedAt: new Date().toISOString() })
}))

app.get('/api/cold-storage/:id', asyncRoute(async (request, response) => { await ensureLogisticsSamples(prisma); const facility = await prisma.coldStorageFacility.findUnique({ where: { id: String(request.params.id) } }); if (!facility) return response.status(404).json({ error: 'Facility not found' }); response.json({ facility }) }))

app.post('/api/storage-requests', auth, role('FARMER'), asyncRoute(async (request, response) => {
  const startDate = new Date(request.body.startDate); const endDate = new Date(request.body.endDate)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return response.status(400).json({ error: 'Storage dates are invalid' })
  const facility = await prisma.coldStorageFacility.findUnique({ where: { id: required(request.body.facilityId, 'Facility') } }); if (!facility) return response.status(404).json({ error: 'Facility not found' })
  const quantity = positive(request.body.quantity, 'Quantity')
  const requestRecord = await prisma.storageRequest.create({ data: { farmerId: request.user!.id, facilityId: facility.id, listingId: request.body.listingId || null, orderId: request.body.orderId || null, cropName: required(request.body.cropName, 'Crop'), quantity, unit: required(request.body.unit, 'Unit'), startDate, endDate, notes: request.body.notes?.trim() || null } })
  response.status(201).json({ request: requestRecord })
}))

app.get('/api/storage-requests/mine', auth, role('FARMER'), asyncRoute(async (request, response) => { response.json({ requests: await prisma.storageRequest.findMany({ where: { farmerId: request.user!.id }, include: { facility: true, listing: { select: { cropName: true } } }, orderBy: { createdAt: 'desc' } }) }) }))
app.patch('/api/storage-requests/:id/cancel', auth, role('FARMER'), asyncRoute(async (request, response) => { const record = await prisma.storageRequest.findUnique({ where: { id: String(request.params.id) } }); if (!record || record.farmerId !== request.user!.id) return response.status(404).json({ error: 'Storage request not found' }); if (!['PENDING', 'ACCEPTED'].includes(record.status)) return response.status(409).json({ error: 'This request cannot be cancelled' }); response.json({ request: await prisma.storageRequest.update({ where: { id: record.id }, data: { status: 'CANCELLED' } }) }) }))

app.get('/api/transport-providers', asyncRoute(async (request, response) => { await ensureLogisticsSamples(prisma); const providers = await prisma.transportProvider.findMany({ where: { ...(request.query.vehicleType ? { vehicleType: { contains: String(request.query.vehicleType) } } : {}), ...(request.query.location ? { serviceAreas: { contains: String(request.query.location) } } : {}) }, orderBy: { name: 'asc' } }); response.json({ providers, dataStatus: 'SAMPLE', source: 'Development sample data', retrievedAt: new Date().toISOString() }) }))
app.get('/api/transport-providers/:id', asyncRoute(async (request, response) => { await ensureLogisticsSamples(prisma); const provider = await prisma.transportProvider.findUnique({ where: { id: String(request.params.id) } }); if (!provider) return response.status(404).json({ error: 'Transport provider not found' }); response.json({ provider }) }))

app.post('/api/transport-requests', auth, role('FARMER'), asyncRoute(async (request, response) => { const pickupDate = new Date(request.body.pickupDate); if (Number.isNaN(pickupDate.getTime())) return response.status(400).json({ error: 'Pickup date is invalid' }); const record = await prisma.transportRequest.create({ data: { farmerId: request.user!.id, providerId: request.body.providerId || null, listingId: request.body.listingId || null, orderId: request.body.orderId || null, cropName: required(request.body.cropName, 'Crop'), quantity: positive(request.body.quantity, 'Quantity'), unit: required(request.body.unit, 'Unit'), pickupLocation: required(request.body.pickupLocation, 'Pickup location'), destination: required(request.body.destination, 'Destination'), pickupDate, vehicleRequirements: request.body.vehicleRequirements?.trim() || null, notes: request.body.notes?.trim() || null } }); response.status(201).json({ request: record }) }))
app.get('/api/transport-requests/mine', auth, role('FARMER'), asyncRoute(async (request, response) => { response.json({ requests: await prisma.transportRequest.findMany({ where: { farmerId: request.user!.id }, include: { provider: true, listing: { select: { cropName: true } }, order: { select: { id: true, status: true } } }, orderBy: { createdAt: 'desc' } }) }) }))
app.patch('/api/transport-requests/:id/cancel', auth, role('FARMER'), asyncRoute(async (request, response) => { const record = await prisma.transportRequest.findUnique({ where: { id: String(request.params.id) } }); if (!record || record.farmerId !== request.user!.id) return response.status(404).json({ error: 'Transport request not found' }); if (!['PENDING', 'ACCEPTED'].includes(record.status)) return response.status(409).json({ error: 'This request cannot be cancelled' }); response.json({ request: await prisma.transportRequest.update({ where: { id: record.id }, data: { status: 'CANCELLED' } }) }) }))

app.patch('/api/dev/logistics/:kind/:id/status', asyncRoute(async (request, response) => { if (process.env.NODE_ENV === 'production') return response.status(404).json({ error: 'Development workflow is disabled' }); const status = required(request.body.status, 'Status'); const kind = String(request.params.kind); const id = String(request.params.id); const allowed: Record<string, string[]> = { storage: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'], transport: ['PENDING', 'ACCEPTED', 'PROVIDER_ASSIGNED', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] }; if (!allowed[kind]?.includes(status)) return response.status(400).json({ error: 'Invalid development status' }); if (kind === 'storage') { const updated = await prisma.storageRequest.update({ where: { id }, data: { status } }); return response.json({ request: updated, developmentOnly: true }) } if (kind === 'transport') { const updated = await prisma.transportRequest.update({ where: { id }, data: { status } }); return response.json({ request: updated, developmentOnly: true }) } return response.status(404).json({ error: 'Unknown request type' }) }))

app.post('/api/crop-diagnoses', auth, role('FARMER'), upload.single('image'), asyncRoute(async (request, response) => {
  const cropName = required(request.body.cropName, 'Crop')
  if (!request.file) return response.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' })
  const imageInfo = await sharp(request.file.buffer).metadata().catch(() => null)
  if (!imageInfo?.width || !imageInfo.height) return response.status(400).json({ error: 'The image could not be read' })
  await mkdir(privateUploadDir, { recursive: true })
  const imageKey = `${request.user!.id}/${randomUUID()}.${request.file.mimetype === 'image/png' ? 'png' : request.file.mimetype === 'image/webp' ? 'webp' : 'jpg'}`
  const imagePath = path.join(privateUploadDir, imageKey)
  await mkdir(path.dirname(imagePath), { recursive: true })
  await writeFile(imagePath, request.file.buffer)
  const result = await inferenceProvider.analyze({ crop: cropName, imageBuffer: request.file.buffer, mimeType: request.file.mimetype, language: String(request.body.language || 'en'), symptomDescription: request.body.symptomDescription?.trim() || undefined })
  const diagnosis = await prisma.cropDiagnosis.create({ data: { farmerId: request.user!.id, cropName, imageKey, imageMimeType: request.file.mimetype, imageSize: request.file.size, prediction: result.prediction, confidence: result.confidence, resultStatus: result.status, guidanceKey: null, modelName: result.modelName, modelVersion: result.modelVersion, provider: result.provider } })
  response.status(201).json({ diagnosis: { id: diagnosis.id, cropName: diagnosis.cropName, prediction: diagnosis.prediction, confidence: diagnosis.confidence, resultStatus: diagnosis.resultStatus, guidanceKey: diagnosis.guidanceKey, modelName: diagnosis.modelName, modelVersion: diagnosis.modelVersion, provider: diagnosis.provider, createdAt: diagnosis.createdAt }, analysis: result, demo: false })
}))

app.get('/api/crop-diagnoses/mine', auth, role('FARMER'), asyncRoute(async (request, response) => { const diagnoses = await prisma.cropDiagnosis.findMany({ where: { farmerId: request.user!.id }, select: { id: true, cropName: true, prediction: true, confidence: true, resultStatus: true, guidanceKey: true, modelName: true, modelVersion: true, provider: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); response.json({ diagnoses, demo: false }) }))

app.use(express.static(path.resolve('dist')))
app.use((request, response, next) => { if (request.method !== 'GET' || request.path.startsWith('/api/')) return next(); response.sendFile(path.resolve('dist/index.html')) })

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => { if (error.message.includes('Unique constraint')) return response.status(409).json({ error: 'An account with these details already exists' }); response.status(400).json({ error: error.message || 'Request failed' }) })

app.listen(port, '0.0.0.0', () => console.log(`AgriConnect API listening on port ${port}`))
