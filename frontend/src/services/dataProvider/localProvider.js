import * as accountService from '../accountService.js'
import * as storage from '../storage.js'
import * as goalService from '../goalService.js'
import * as budgetService from '../budgetService.js'
import * as categoryService from '../categoryService.js'

/**
 * Local Data Provider
 * Delegates directly to existing localStorage service implementations.
 * Guarantees zero regression when VITE_DATA_SOURCE=local.
 */

export const localProvider = {
  // Accounts
  getAccounts: async () => accountService.getAccounts(),
  createAccount: async (data) => accountService.addAccount(data),
  updateAccount: async (id, data) => accountService.updateAccount(id, data),
  deleteAccount: async (id) => accountService.deleteAccount(id),
  getNetWorth: async () => {
    const accs = accountService.getAccounts()
    const txns = storage.getTransactions()
    return accountService.getTotalNetWorth(accs, txns)
  },

  // Transactions
  getTransactions: async (filters = {}) => {
    let txns = storage.getTransactions()
    if (filters.accountId) {
      txns = txns.filter((t) => t.accountId === filters.accountId)
    }
    if (filters.type) {
      txns = txns.filter((t) => t.type === filters.type)
    }
    if (filters.categoryId || filters.category) {
      const cat = filters.categoryId || filters.category
      txns = txns.filter((t) => t.category === cat)
    }
    return txns
  },
  createTransaction: async (data) => storage.addTransaction(data),
  updateTransaction: async (id, data) => storage.updateTransaction(id, data),
  deleteTransaction: async (id) => storage.deleteTransaction(id),

  // Goals
  getGoals: async () => goalService.getGoals(),
  createGoal: async (data) => goalService.addGoal(data),
  updateGoal: async (id, data) => goalService.updateGoal(id, data),
  deleteGoal: async (id) => goalService.deleteGoal(id),
  depositToGoal: async (params) => goalService.depositToGoal(params),
  withdrawFromGoal: async (params) => goalService.withdrawFromGoal(params),

  // Budgets
  getBudgets: async (month = null) => {
    const budgets = budgetService.getBudgets()
    if (month) {
      return budgets.filter((b) => b.month === month)
    }
    return budgets
  },
  createBudget: async (data) => budgetService.addBudget(data),
  updateBudget: async (id, data) => budgetService.updateBudget(id, data),
  deleteBudget: async (id) => budgetService.deleteBudget(id),

  // Categories
  getCategories: async (type = 'all') => {
    const custom = categoryService.getCustomCategories()
    return categoryService.getAllCategories(type, custom)
  },
  createCategory: async (data) => categoryService.addCategory(data),
  updateCategory: async (id, data) => categoryService.updateCategory(id, data),
  deleteCategory: async (id) => categoryService.deleteCategory(id),

  // Settings
  getSettings: async () => storage.getSettings(),
  updateSettings: async (data) => storage.saveSettings(data),

  // Legacy Data Utilities (for offline fallback/migration support)
  clearAllData: () => storage.clearAllData(),
  importBackupData: (json) => storage.importBackupData(json),
  exportFullBackup: () => storage.exportFullBackup(),
  migrateStorage: () => storage.migrateStorage(),
}

export default localProvider
