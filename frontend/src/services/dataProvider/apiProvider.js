import { accountApi } from '../api/accountApi.js'
import { transactionApi } from '../api/transactionApi.js'
import { goalApi } from '../api/goalApi.js'
import { budgetApi } from '../api/budgetApi.js'
import { categoryApi } from '../api/categoryApi.js'
import * as storage from '../storage.js'

/**
 * REST API Data Provider
 * Delegates data operations to the centralized FinTrack REST API adapters.
 * Backend serves as the authoritative source of truth for all financial state.
 */

export const apiProvider = {
  // Accounts
  getAccounts: async () => accountApi.getAccounts(),
  createAccount: async (data) => accountApi.createAccount(data),
  updateAccount: async (id, data) => accountApi.updateAccount(id, data),
  deleteAccount: async (id) => accountApi.deleteAccount(id),
  getNetWorth: async () => accountApi.getNetWorth(),

  // Transactions
  getTransactions: async (filters) => transactionApi.getTransactions(filters),
  createTransaction: async (data) => transactionApi.createTransaction(data),
  updateTransaction: async (id, data) => transactionApi.updateTransaction(id, data),
  deleteTransaction: async (id) => transactionApi.deleteTransaction(id),

  // Goals
  getGoals: async () => goalApi.getGoals(),
  createGoal: async (data) => goalApi.createGoal(data),
  updateGoal: async (id, data) => goalApi.updateGoal(id, data),
  deleteGoal: async (id) => goalApi.deleteGoal(id),
  depositToGoal: async ({ goalId, amount, sourceAccountId, notes }) =>
    goalApi.depositToGoal(goalId, { accountId: sourceAccountId, amount, notes }),
  withdrawFromGoal: async ({ goalId, amount, destinationAccountId, notes }) =>
    goalApi.withdrawFromGoal(goalId, { accountId: destinationAccountId, amount, notes }),

  // Budgets
  getBudgets: async (month) => budgetApi.getBudgets(month),
  createBudget: async (data) => budgetApi.createBudget(data),
  updateBudget: async (id, data) => budgetApi.updateBudget(id, data),
  deleteBudget: async (id) => budgetApi.deleteBudget(id),

  // Categories
  getCategories: async (type) => categoryApi.getCategories(type),
  createCategory: async (data) => categoryApi.createCategory(data),
  updateCategory: async (id, data) => categoryApi.updateCategory(id, data),
  deleteCategory: async (id) => categoryApi.deleteCategory(id),

  // Settings (Client-side / local as specified in Section 10)
  getSettings: async () => storage.getSettings(),
  updateSettings: async (data) => storage.saveSettings(data),
}

export default apiProvider
