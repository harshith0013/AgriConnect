const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export type Role = 'FARMER' | 'BUYER'
export type Session = { token: string; user: { id: string; role: Role; name: string; mobile: string; email?: string | null; language: string } }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
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
}
export type Listing = { id: string; cropName: string; category: string; quantity: number; unit: string; quality?: string | null; expectedPrice: number; availabilityDate: string; pickupLocation: string; description?: string | null; status: string; farmer?: { name: string; farmerProfile?: { state: string; district: string; village: string } } }
export type Offer = { id: string; offeredPrice: number; requestedQuantity: number; message?: string | null; status: string; buyer?: { name: string; buyerProfile?: { businessName: string } }; listing?: Listing }
export type Order = { id: string; agreedPrice: number; quantity: number; status: string; listing: Listing; farmer: { name: string }; buyer: { name: string } }
