import { apiClient } from './apiClient.js'

/**
 * Recurring Transactions API Service
 * Handles HTTP requests to the /api/recurring endpoint.
 */

export function normalizeRecurring(rec) {
  if (!rec) return rec
  const formatDate = (val) => {
    if (!val) return null
    if (val instanceof Date) return val.toISOString().split('T')[0]
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0]
    return val
  }

  return {
    ...rec,
    amount: Number(rec.amount) || 0,
    startDate: formatDate(rec.startDate),
    endDate: formatDate(rec.endDate),
    nextOccurrence: formatDate(rec.nextOccurrence),
    lastGeneratedDate: formatDate(rec.lastGeneratedDate),
  }
}

export async function getRecurring(filters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.active !== undefined) queryParams.set('active', String(filters.active))
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  const res = await apiClient.get(`/recurring${queryString}`)
  const recurringList = Array.isArray(res?.data) ? res.data : []
  return recurringList.map(normalizeRecurring)
}

export async function getRecurringById(id) {
  const res = await apiClient.get(`/recurring/${id}`)
  return normalizeRecurring(res?.data)
}

export async function createRecurring(data) {
  const payload = {
    ...data,
    amount: Number(data.amount),
    categoryId: data.categoryId || data.category,
  }
  const res = await apiClient.post('/recurring', payload)
  return normalizeRecurring(res?.data)
}

export async function updateRecurring(id, data) {
  const payload = {
    ...data,
    amount: data.amount !== undefined ? Number(data.amount) : undefined,
    categoryId: data.categoryId || data.category || undefined,
  }
  const res = await apiClient.put(`/recurring/${id}`, payload)
  return normalizeRecurring(res?.data)
}

export async function deleteRecurring(id) {
  const res = await apiClient.delete(`/recurring/${id}`)
  return res?.data
}

export const recurringApi = {
  getRecurring,
  getRecurringById,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  normalizeRecurring,
}

export default recurringApi
