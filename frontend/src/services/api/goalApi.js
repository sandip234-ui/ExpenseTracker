import { apiClient } from './apiClient.js'
import { normalizeTransaction } from './transactionApi.js'

/**
 * Goal API Service
 * Handles HTTP requests to the /api/goals endpoint.
 * Encapsulates atomic physical deposits and withdrawals to savings goals.
 */

export function normalizeGoal(goal) {
  if (!goal) return goal
  let targetDate = goal.targetDate
  if (targetDate instanceof Date) {
    targetDate = targetDate.toISOString().split('T')[0]
  } else if (typeof targetDate === 'string' && targetDate.includes('T')) {
    targetDate = targetDate.split('T')[0]
  }

  return {
    ...goal,
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    targetDate: targetDate || '',
  }
}

export async function getGoals() {
  const res = await apiClient.get('/goals')
  const goals = Array.isArray(res?.data) ? res.data : []
  return goals.map(normalizeGoal)
}

export async function getGoal(id) {
  const res = await apiClient.get(`/goals/${id}`)
  return normalizeGoal(res?.data)
}

export async function createGoal(data) {
  const payload = {
    ...data,
    targetAmount: Number(data.targetAmount),
    currentAmount: data.currentAmount !== undefined ? Number(data.currentAmount) : 0,
    targetDate: data.targetDate || null,
  }
  const res = await apiClient.post('/goals', payload)
  return normalizeGoal(res?.data)
}

export async function updateGoal(id, data) {
  const payload = {
    ...data,
    targetAmount: data.targetAmount !== undefined ? Number(data.targetAmount) : undefined,
    currentAmount: data.currentAmount !== undefined ? Number(data.currentAmount) : undefined,
    targetDate: data.targetDate !== undefined ? (data.targetDate || null) : undefined,
  }
  const res = await apiClient.put(`/goals/${id}`, payload)
  return normalizeGoal(res?.data)
}

export async function deleteGoal(id) {
  const res = await apiClient.delete(`/goals/${id}`)
  return res?.data
}

export async function depositToGoal(id, data) {
  const accountId = data.accountId || data.sourceAccountId
  const payload = {
    accountId,
    amount: Number(data.amount),
  }
  const res = await apiClient.post(`/goals/${id}/deposit`, payload)
  const result = res?.data || {}
  const normalizedGoal = normalizeGoal(result.goal || result.updatedGoal)
  const normalizedTxn = normalizeTransaction(result.transaction || result.transactionRecord)

  return {
    ...result,
    goal: normalizedGoal,
    updatedGoal: normalizedGoal,
    transaction: normalizedTxn,
    transactionRecord: normalizedTxn,
  }
}

export async function withdrawFromGoal(id, data) {
  const accountId = data.accountId || data.destinationAccountId
  const payload = {
    accountId,
    amount: Number(data.amount),
  }
  const res = await apiClient.post(`/goals/${id}/withdraw`, payload)
  const result = res?.data || {}
  const normalizedGoal = normalizeGoal(result.goal || result.updatedGoal)
  const normalizedTxn = normalizeTransaction(result.transaction || result.transactionRecord)

  return {
    ...result,
    goal: normalizedGoal,
    updatedGoal: normalizedGoal,
    transaction: normalizedTxn,
    transactionRecord: normalizedTxn,
  }
}

export const goalApi = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  depositToGoal,
  withdrawFromGoal,
  normalizeGoal,
}

export default goalApi
