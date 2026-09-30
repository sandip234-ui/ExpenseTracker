import { apiClient } from './apiClient.js'

/**
 * Budget API Service
 * Handles HTTP requests to the /api/budgets endpoint.
 * Backend enforces unique budget per category per month.
 */

export function normalizeBudget(budget) {
  if (!budget) return budget
  return {
    ...budget,
    amount: Number(budget.amount) || 0,
  }
}

export async function getBudgets(month = null) {
  const query = month ? `?month=${month}` : ''
  const res = await apiClient.get(`/budgets${query}`)
  const budgets = Array.isArray(res?.data) ? res.data : []
  return budgets.map(normalizeBudget)
}

export async function getBudget(id) {
  const res = await apiClient.get(`/budgets/${id}`)
  return normalizeBudget(res?.data)
}

export async function createBudget(data) {
  const payload = {
    categoryId: data.categoryId,
    month: data.month,
    amount: Number(data.amount),
  }
  const res = await apiClient.post('/budgets', payload)
  return normalizeBudget(res?.data)
}

export async function updateBudget(id, data) {
  const payload = {
    ...data,
    amount: data.amount !== undefined ? Number(data.amount) : undefined,
  }
  const res = await apiClient.put(`/budgets/${id}`, payload)
  return normalizeBudget(res?.data)
}

export async function deleteBudget(id) {
  const res = await apiClient.delete(`/budgets/${id}`)
  return res?.data
}

export const budgetApi = {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  normalizeBudget,
}

export default budgetApi
