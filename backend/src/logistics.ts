import { PrismaClient } from '@prisma/client'

const storageSamples = [
  { name: 'Warangal Fresh Store', state: 'Telangana', district: 'Warangal', location: 'Kazipet', address: 'Development sample location, Kazipet', supportedCrops: 'Paddy, potato, onion, vegetables', capacity: 500, capacityUnit: 'tonnes', availabilityStatus: 'Unverified - contact facility', rentalCharge: null, rentalUnit: 'per tonne/month', contact: null },
  { name: 'Hanamkonda Agri Cold Hub', state: 'Telangana', district: 'Warangal', location: 'Hanamkonda', address: 'Development sample location, Hanamkonda', supportedCrops: 'Fruits, vegetables, chilli', capacity: 250, capacityUnit: 'tonnes', availabilityStatus: 'Unverified - contact facility', rentalCharge: null, rentalUnit: 'per tonne/month', contact: null },
  { name: 'Khammam Produce Store', state: 'Telangana', district: 'Khammam', location: 'Khammam town', address: 'Development sample location, Khammam', supportedCrops: 'Paddy, maize, vegetables', capacity: 400, capacityUnit: 'tonnes', availabilityStatus: 'Unverified - contact facility', rentalCharge: null, rentalUnit: 'per tonne/month', contact: null },
]
const transportSamples = [
  { name: 'Local Farm Freight - Sample', contact: null, vehicleType: 'Small goods vehicle', capacity: 3, capacityUnit: 'tonnes', serviceAreas: 'Warangal, Hanamkonda, Jangaon', estimatedCharge: null, availabilityStatus: 'Unverified', },
  { name: 'Telangana Agri Movers - Sample', contact: null, vehicleType: 'Medium truck', capacity: 8, capacityUnit: 'tonnes', serviceAreas: 'Telangana districts', estimatedCharge: null, availabilityStatus: 'Unverified', },
  { name: 'Village Produce Carrier - Sample', contact: null, vehicleType: 'Mini truck', capacity: 1.5, capacityUnit: 'tonnes', serviceAreas: 'Warangal and nearby villages', estimatedCharge: null, availabilityStatus: 'Unverified', },
]

export async function ensureLogisticsSamples(prisma: PrismaClient) {
  if (process.env.LOGISTICS_DATA_MODE === 'live') return
  for (const facility of storageSamples) await prisma.coldStorageFacility.upsert({ where: { id: `sample-${facility.name}` }, update: { ...facility, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE', retrievedAt: new Date() }, create: { id: `sample-${facility.name}`, ...facility, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE' } }).catch(async () => { await prisma.coldStorageFacility.create({ data: { ...facility, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE' } }).catch(() => undefined) })
  for (const provider of transportSamples) await prisma.transportProvider.upsert({ where: { id: `sample-${provider.name}` }, update: { ...provider, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE', retrievedAt: new Date() }, create: { id: `sample-${provider.name}`, ...provider, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE' } }).catch(async () => { await prisma.transportProvider.create({ data: { ...provider, source: 'DEVELOPMENT_SAMPLE', dataStatus: 'SAMPLE' } }).catch(() => undefined) })
}
