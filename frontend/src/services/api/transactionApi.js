import { apiClient } from './apiClient.js'

/**
 * Transaction API Service
 * Handles HTTP requests to the /api/transactions endpoint.
 * Normalizes category IDs, dates, and amounts for full frontend compatibility.
 */

export function normalizeTransaction(txn) {
  if (!txn) return txn
  const categoryId = txn.categoryId || txn.category?.id || txn.category || 'other'
  
  let dateStr = txn.date
  if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString().split('T')[0]
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0]
  }

  return {
    ...txn,
    amount: Number(txn.amount),
    category: categoryId,
    categoryId,
    date: dateStr || new Date().toISOString().split('T')[0],
    paymentMethod: txn.paymentMethod || 'Other',
    notes: txn.notes || '',
  }
}

export function prepareTransactionPayload(data) {
  const payload = {
    ...data,
    amount: Number(data.amount),
    categoryId: data.categoryId || data.category || null,
  }
  return payload
}

export async function getTransactions(filters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.accountId) queryParams.set('accountId', filters.accountId)
  if (filters.type) queryParams.set('type', filters.type)
  if (filters.categoryId || filters.category) queryParams.set('categoryId', filters.categoryId || filters.category)
  if (filters.startDate) queryParams.set('startDate', filters.startDate)
  if (filters.endDate) queryParams.set('endDate', filters.endDate)
  if (filters.transferType) queryParams.set('transferType', filters.transferType)

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''
  const res = await apiClient.get(`/transactions${queryString}`)
  const transactions = Array.isArray(res?.data) ? res.data : []
  return transactions.map(normalizeTransaction)
}

export async function getTransaction(id) {
  const res = await apiClient.get(`/transactions/${id}`)
  return normalizeTransaction(res?.data)
}

export async function createTransaction(data) {
  const payload = prepareTransactionPayload(data)
  const res = await apiClient.post('/transactions', payload)
  return normalizeTransaction(res?.data)
}

export async function updateTransaction(id, data) {
  const payload = prepareTransactionPayload(data)
  const res = await apiClient.put(`/transactions/${id}`, payload)
  return normalizeTransaction(res?.data)
}

export async function deleteTransaction(id) {
  const res = await apiClient.delete(`/transactions/${id}`)
  return res?.data
}

export const transactionApi = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  normalizeTransaction,
  prepareTransactionPayload,
}

export default transactionApi
