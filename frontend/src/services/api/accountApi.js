import { apiClient } from './apiClient.js'

/**
 * Account API Service
 * Handles HTTP requests to the /api/accounts endpoint.
 * Backend is authoritative for ledger-derived balances.
 */

export function normalizeAccount(acc) {
  if (!acc) return acc
  const openingBalance = Number(acc.openingBalance) || 0
  const balance = acc.balance !== undefined ? Number(acc.balance) : openingBalance
  const availableBalance = acc.availableBalance !== undefined ? Number(acc.availableBalance) : balance

  return {
    ...acc,
    openingBalance,
    balance,
    availableBalance,
  }
}

export async function getAccounts() {
  const res = await apiClient.get('/accounts')
  const accounts = Array.isArray(res?.data) ? res.data : []
  return accounts.map(normalizeAccount)
}

export async function getAccount(id) {
  const res = await apiClient.get(`/accounts/${id}`)
  return normalizeAccount(res?.data)
}

export async function getNetWorth() {
  const res = await apiClient.get('/accounts/net-worth')
  return res?.data?.totalNetWorth !== undefined ? Number(res.data.totalNetWorth) : 0
}

export async function createAccount(data) {
  const payload = {
    ...data,
    openingBalance: Number(data.openingBalance) || 0,
  }
  const res = await apiClient.post('/accounts', payload)
  return normalizeAccount(res?.data)
}

export async function updateAccount(id, data) {
  const payload = {
    ...data,
    openingBalance: data.openingBalance !== undefined ? Number(data.openingBalance) : undefined,
  }
  const res = await apiClient.put(`/accounts/${id}`, payload)
  return normalizeAccount(res?.data)
}

export async function deleteAccount(id) {
  const res = await apiClient.delete(`/accounts/${id}`)
  return res?.data
}

export const accountApi = {
  getAccounts,
  getAccount,
  getNetWorth,
  createAccount,
  updateAccount,
  deleteAccount,
  normalizeAccount,
}

export default accountApi
