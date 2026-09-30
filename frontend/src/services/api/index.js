/**
 * Centralized API Layer Index
 * FinTrack Phase 5 Frontend REST API Adapters
 */

export { apiClient, ApiError, getApiBaseUrl, request, setAuthToken, getAuthToken, clearAuthToken } from './apiClient.js'
export { authApi } from './authApi.js'
export { accountApi, normalizeAccount } from './accountApi.js'
export { transactionApi, normalizeTransaction } from './transactionApi.js'
export { goalApi, normalizeGoal } from './goalApi.js'
export { budgetApi, normalizeBudget } from './budgetApi.js'
export { recurringApi, normalizeRecurring } from './recurringApi.js'
export { categoryApi, normalizeCategory } from './categoryApi.js'
export { notificationApi } from './notificationApi.js'

import apiClient from './apiClient.js'
import authApi from './authApi.js'
import accountApi from './accountApi.js'
import transactionApi from './transactionApi.js'
import goalApi from './goalApi.js'
import budgetApi from './budgetApi.js'
import recurringApi from './recurringApi.js'
import categoryApi from './categoryApi.js'
import notificationApi from './notificationApi.js'

export const api = {
  client: apiClient,
  auth: authApi,
  accounts: accountApi,
  transactions: transactionApi,
  goals: goalApi,
  budgets: budgetApi,
  recurring: recurringApi,
  categories: categoryApi,
  notifications: notificationApi,
}

export default api
