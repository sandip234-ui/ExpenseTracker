import { isApiMode, getDataSourceMode, setDataSourceMode, DATA_SOURCE } from './config.js'
import { localProvider } from './localProvider.js'
import { apiProvider } from './apiProvider.js'

/**
 * Transparent Data Provider Facade
 * Routes operations to localProvider (localStorage) or apiProvider (REST API)
 * depending on the active DATA_SOURCE mode.
 */

export const dataProvider = {
  // Accounts
  getAccounts: () => (isApiMode() ? apiProvider.getAccounts() : localProvider.getAccounts()),
  createAccount: (data) => (isApiMode() ? apiProvider.createAccount(data) : localProvider.createAccount(data)),
  updateAccount: (id, data) => (isApiMode() ? apiProvider.updateAccount(id, data) : localProvider.updateAccount(id, data)),
  deleteAccount: (id) => (isApiMode() ? apiProvider.deleteAccount(id) : localProvider.deleteAccount(id)),
  getNetWorth: () => (isApiMode() ? apiProvider.getNetWorth() : localProvider.getNetWorth()),

  // Transactions
  getTransactions: (filters) => (isApiMode() ? apiProvider.getTransactions(filters) : localProvider.getTransactions(filters)),
  createTransaction: (data) => (isApiMode() ? apiProvider.createTransaction(data) : localProvider.createTransaction(data)),
  updateTransaction: (id, data) => (isApiMode() ? apiProvider.updateTransaction(id, data) : localProvider.updateTransaction(id, data)),
  deleteTransaction: (id) => (isApiMode() ? apiProvider.deleteTransaction(id) : localProvider.deleteTransaction(id)),

  // Goals
  getGoals: () => (isApiMode() ? apiProvider.getGoals() : localProvider.getGoals()),
  createGoal: (data) => (isApiMode() ? apiProvider.createGoal(data) : localProvider.createGoal(data)),
  updateGoal: (id, data) => (isApiMode() ? apiProvider.updateGoal(id, data) : localProvider.updateGoal(id, data)),
  deleteGoal: (id) => (isApiMode() ? apiProvider.deleteGoal(id) : localProvider.deleteGoal(id)),
  depositToGoal: (params) => (isApiMode() ? apiProvider.depositToGoal(params) : localProvider.depositToGoal(params)),
  withdrawFromGoal: (params) => (isApiMode() ? apiProvider.withdrawFromGoal(params) : localProvider.withdrawFromGoal(params)),

  // Budgets
  getBudgets: (month) => (isApiMode() ? apiProvider.getBudgets(month) : localProvider.getBudgets(month)),
  createBudget: (data) => (isApiMode() ? apiProvider.createBudget(data) : localProvider.createBudget(data)),
  updateBudget: (id, data) => (isApiMode() ? apiProvider.updateBudget(id, data) : localProvider.updateBudget(id, data)),
  deleteBudget: (id) => (isApiMode() ? apiProvider.deleteBudget(id) : localProvider.deleteBudget(id)),

  // Recurring
  getRecurring: (filters) => (isApiMode() ? apiProvider.getRecurring(filters) : localProvider.getRecurring(filters)),
  createRecurring: (data) => (isApiMode() ? apiProvider.createRecurring(data) : localProvider.createRecurring(data)),
  updateRecurring: (id, data) => (isApiMode() ? apiProvider.updateRecurring(id, data) : localProvider.updateRecurring(id, data)),
  deleteRecurring: (id) => (isApiMode() ? apiProvider.deleteRecurring(id) : localProvider.deleteRecurring(id)),

  // Categories
  getCategories: (type) => (isApiMode() ? apiProvider.getCategories(type) : localProvider.getCategories(type)),
  createCategory: (data) => (isApiMode() ? apiProvider.createCategory(data) : localProvider.createCategory(data)),
  updateCategory: (id, data) => (isApiMode() ? apiProvider.updateCategory(id, data) : localProvider.updateCategory(id, data)),
  deleteCategory: (id, reassignTo) =>
    isApiMode() ? apiProvider.deleteCategory(id) : localProvider.deleteCategory(id, reassignTo),

  // Settings
  getSettings: () => localProvider.getSettings(),
  updateSettings: (data) => localProvider.updateSettings(data),
}

export { isApiMode, getDataSourceMode, setDataSourceMode, DATA_SOURCE, localProvider, apiProvider }
export default dataProvider
