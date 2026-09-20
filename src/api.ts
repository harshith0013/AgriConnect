const API_URL = import.meta.env.VITE_API_URL || '/api'

export type Role = 'FARMER' | 'BUYER'
export type Session = { token: string; user: { id: string; role: Role; name: string; mobile: string; email?: string | null; language: string } }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  } catch {
    throw new Error('The AgriConnect API is not running. Start the project with: npm run dev:all')
  }
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Request failed') }
  return response.status === 204 ? undefined as T : response.json()
}
export const api = {
  registerFarmer: (data: Record<string, unknown>) => request<Session>('/auth/register/farmer', { method: 'POST', body: JSON.stringify(data) }),
  registerBuyer: (data: Record<string, unknown>) => request<Session>('/auth/register/buyer', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: Record<string, unknown>) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  listings: (query = '') => request<{ listings: Listing[] }>(`/listings${query}`),
  myListings: (token: string) => request<{ listings: Listing[] }>('/listings/mine', {}, token),
  createListing: (data: Record<string, unknown>, token: string) => request<{ listing: Listing }>('/listings', { method: 'POST', body: JSON.stringify(data) }, token),
  updateListing: (id: string, data: Record<string, unknown>, token: string) => request<{ listing: Listing }>(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  deleteListing: (id: string, token: string) => request<void>(`/listings/${id}`, { method: 'DELETE' }, token),
  offersForListing: (id: string, token: string) => request<{ offers: Offer[] }>(`/listings/${id}/offers`, {}, token),
  createOffer: (id: string, data: Record<string, unknown>, token: string) => request<{ offer: Offer }>(`/listings/${id}/offers`, { method: 'POST', body: JSON.stringify(data) }, token),
  myOffers: (token: string) => request<{ offers: Offer[] }>('/offers/mine', {}, token),
  respondOffer: (id: string, status: string, token: string) => request<{ offer: Offer; order?: Order }>(`/offers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  orders: (token: string) => request<{ orders: Order[] }>('/orders/mine', {}, token),
  marketPrices: (filters: { crop?: string; state?: string; district?: string; market?: string } = {}) => { const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))); return request<PriceResponse>(`/market-prices${params.toString() ? `?${params}` : ''}`) },
  marketHistory: (filters: { crop: string; market?: string }) => { const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))); return request<PriceResponse>(`/market-prices/history?${params}`) },
  offerComparison: (offerId: string, token: string, market?: string) => request<{ offer: Offer; records: MarketPriceRecord[]; dataStatus: string; source: string }>(`/market-prices/offer-comparison?offerId=${encodeURIComponent(offerId)}${market ? `&market=${encodeURIComponent(market)}` : ''}`, {}, token),
  coldStorage: (filters: Record<string, string> = {}) => request<LogisticsResponse<ColdStorageFacility>>(`/cold-storage?${new URLSearchParams(filters)}`),
  storageRequest: (data: Record<string, unknown>, token: string) => request<{ request: StorageRequest }>('/storage-requests', { method: 'POST', body: JSON.stringify(data) }, token),
  myStorageRequests: (token: string) => request<{ requests: StorageRequest[] }>('/storage-requests/mine', {}, token),
  cancelStorageRequest: (id: string, token: string) => request<{ request: StorageRequest }>(`/storage-requests/${id}/cancel`, { method: 'PATCH' }, token),
  transportProviders: (filters: Record<string, string> = {}) => request<LogisticsResponse<TransportProvider>>(`/transport-providers?${new URLSearchParams(filters)}`),
  transportRequest: (data: Record<string, unknown>, token: string) => request<{ request: TransportRequest }>('/transport-requests', { method: 'POST', body: JSON.stringify(data) }, token),
  myTransportRequests: (token: string) => request<{ requests: TransportRequest[] }>('/transport-requests/mine', {}, token),
  cancelTransportRequest: (id: string, token: string) => request<{ request: TransportRequest }>(`/transport-requests/${id}/cancel`, { method: 'PATCH' }, token),
  submitDiagnosis: async (cropName: string, image: File, token: string, language: string) => { const body = new FormData(); body.append('cropName', cropName); body.append('language', language); body.append('image', image); const response = await fetch(`${API_URL}/crop-diagnoses`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Diagnosis request failed') } return response.json() as Promise<{ diagnosis: Diagnosis; analysis: { explanation: string; observedSymptoms: string[]; recommendedNextSteps: string[]; whenToSeekExpertHelp: string; language: string }; demo: boolean }> },
  diagnosisHistory: (token: string) => request<{ diagnoses: Diagnosis[]; demo: boolean }>('/crop-diagnoses/mine', {}, token),
  voiceTts: async (text: string, language: 'en' | 'te', token: string) => {
    const response = await fetch(`${API_URL}/voice/tts`, { method: 'POST', body: JSON.stringify({ text, language }), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Voice service unavailable') }
    return response.blob()
  },
}
export type Listing = { id: string; cropName: string; category: string; quantity: number; unit: string; quality?: string | null; expectedPrice: number; availabilityDate: string; pickupLocation: string; description?: string | null; status: string; farmer?: { name: string; farmerProfile?: { state: string; district: string; village: string } } }
export type Offer = { id: string; offeredPrice: number; requestedQuantity: number; message?: string | null; status: string; buyer?: { name: string; buyerProfile?: { businessName: string } }; listing?: Listing }
export type Order = { id: string; agreedPrice: number; quantity: number; status: string; listing: Listing; farmer: { name: string }; buyer: { name: string } }
export type MarketPriceRecord = { id: string; cropName: string; category?: string | null; minPrice?: number | null; maxPrice?: number | null; modalPrice?: number | null; unit: string; grade?: string | null; priceDate: string; source: string; dataStatus: string; retrievedAt: string; market: { id: string; name: string; state: string; district: string } }
export type PriceResponse = { records: MarketPriceRecord[]; dataStatus: string; source: string; retrievedAt: string }
export type ColdStorageFacility = { id: string; name: string; state: string; district: string; location: string; address?: string | null; supportedCrops: string; capacity?: number | null; capacityUnit?: string | null; availabilityStatus?: string | null; rentalCharge?: number | null; rentalUnit?: string | null; contact?: string | null; source: string; dataStatus: string; retrievedAt: string }
export type TransportProvider = { id: string; name: string; contact?: string | null; vehicleType: string; capacity?: number | null; capacityUnit?: string | null; serviceAreas: string; estimatedCharge?: number | null; availabilityStatus?: string | null; source: string; dataStatus: string; retrievedAt: string }
export type StorageRequest = { id: string; cropName: string; quantity: number; unit: string; startDate: string; endDate: string; notes?: string | null; status: string; facility: ColdStorageFacility }
export type TransportRequest = { id: string; cropName: string; quantity: number; unit: string; pickupLocation: string; destination: string; pickupDate: string; vehicleRequirements?: string | null; notes?: string | null; status: string; provider?: TransportProvider | null }
export type LogisticsResponse<T> = { facilities?: T[]; providers?: T[]; dataStatus: string; source: string; retrievedAt: string }
export type Diagnosis = { id: string; cropName: string; prediction?: string | null; confidence?: number | null; resultStatus: string; guidanceKey?: string | null; modelName: string; modelVersion: string; provider: string; createdAt: string; analysis?: { explanation: string; observedSymptoms: string[]; recommendedNextSteps: string[]; whenToSeekExpertHelp: string; language: string } }
