import {
  STORAGE_KEYS,
  safeRead,
  safeWrite,
  DEFAULT_SETTINGS,
  migrateStorage,
} from './storageService'

export { migrateStorage }
import { getAccounts, saveAccounts } from './accountService'
import { getCustomCategories, saveCustomCategories, findCategory } from './categoryService'
import { getBudgets, saveBudgets } from './budgetService'
import { getGoals, saveGoals } from './goalService'
import { getRecurringTransactions, saveRecurringTransactions } from './recurringService'

// ─── Transactions ─────────────────────────────────────────────────────────────

export function getTransactions() {
  const data = safeRead(STORAGE_KEYS.TRANSACTIONS, [])
  if (!Array.isArray(data)) return []
  return data
}

export function addTransaction(transaction) {
  const transactions = getTransactions()
  const updated = [transaction, ...transactions]
  safeWrite(STORAGE_KEYS.TRANSACTIONS, updated)
  return updated
}

export function updateTransaction(id, updatedFields) {
  const transactions = getTransactions()
  const updated = transactions.map((t) =>
    t.id === id ? { ...t, ...updatedFields, id } : t
  )
  safeWrite(STORAGE_KEYS.TRANSACTIONS, updated)
  return updated
}

export function deleteTransaction(id) {
  const transactions = getTransactions()
  const updated = transactions.filter((t) => t.id !== id)
  safeWrite(STORAGE_KEYS.TRANSACTIONS, updated)
  return updated
}

export function clearTransactions() {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
  return []
}

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
  migrateStorage()
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeRead(STORAGE_KEYS.SETTINGS, {}) }
}

export function saveSettings(settings) {
  const current = getSettings()
  const merged = { ...current, ...settings }
  safeWrite(STORAGE_KEYS.SETTINGS, merged)
  return merged
}

// ─── CSV & JSON Export / Import ───────────────────────────────────────────────

/**
 * Generates CSV string for given transactions array.
 * Columns: Date, Type, Description, Category, Account, Payment Method, Amount, Notes
 */
export function exportTransactionsToCSV(transactions = [], accounts = [], customCategories = []) {
  const headers = ['Date', 'Type', 'Description', 'Category', 'Account', 'Payment Method', 'Amount', 'Notes']
  
  const rows = transactions.map((t) => {
    const cat = findCategory(t.category, t.type, customCategories)
    const acc = accounts.find((a) => a.id === t.accountId) || { name: 'Unknown' }
    
    const escapeCsv = (str) => {
      const val = str === null || str === undefined ? '' : String(str)
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    return [
      escapeCsv(t.date),
      escapeCsv(t.type),
      escapeCsv(t.description),
      escapeCsv(cat.label || t.category),
      escapeCsv(acc.name),
      escapeCsv(t.paymentMethod || 'Other'),
      escapeCsv(t.amount),
      escapeCsv(t.notes || ''),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Creates full V2 application backup JSON string.
 */
export function exportFullBackup() {
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions: getTransactions(),
      categories: getCustomCategories(),
      budgets: getBudgets(),
      accounts: getAccounts(),
      goals: getGoals(),
      recurringTransactions: getRecurringTransactions(),
      settings: getSettings(),
    },
    null,
    2
  )
}

/**
 * Backwards-compatible export function
 */
export function exportTransactions() {
  return exportFullBackup()
}

/**
 * Validates and imports full application backup JSON or V1 transaction list.
 */
export function importBackupData(jsonString) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid JSON format. Please upload a valid JSON backup file.' }
  }

  const rawTxns = Array.isArray(parsed) ? parsed : parsed?.transactions
  if (!Array.isArray(rawTxns)) {
    return { success: false, error: 'No transactions found in the file.' }
  }

  // Validate transaction structure
  const required = ['id', 'type', 'amount', 'description', 'category', 'date']
  const invalidTxns = rawTxns.filter(
    (t) => !required.every((k) => t[k] !== undefined && t[k] !== null && t[k] !== '') ||
      isNaN(Number(t.amount)) ||
      !['income', 'expense'].includes(t.type)
  )

  if (invalidTxns.length > 0) {
    return {
      success: false,
      error: `${invalidTxns.length} transaction(s) failed schema validation.`,
    }
  }

  // Deduplicate and merge transactions
  const existingTxns = getTransactions()
  const existingIds = new Set(existingTxns.map((t) => t.id))
  const newTxns = rawTxns.filter((t) => !existingIds.has(t.id))
  const mergedTxns = [...newTxns, ...existingTxns]
  safeWrite(STORAGE_KEYS.TRANSACTIONS, mergedTxns)

  // Merge Accounts if present
  if (Array.isArray(parsed?.accounts) && parsed.accounts.length > 0) {
    const existingAccounts = getAccounts()
    const accIds = new Set(existingAccounts.map((a) => a.id))
    const newAccounts = parsed.accounts.filter((a) => !accIds.has(a.id) && a.id && a.name)
    saveAccounts([...existingAccounts, ...newAccounts])
  }

  // Merge Categories if present
  if (Array.isArray(parsed?.categories)) {
    const existingCats = getCustomCategories()
    const catIds = new Set(existingCats.map((c) => c.id))
    const newCats = parsed.categories.filter((c) => !catIds.has(c.id) && c.id && c.label)
    saveCustomCategories([...existingCats, ...newCats])
  }

  // Merge Budgets if present
  if (Array.isArray(parsed?.budgets)) {
    const existingBudgets = getBudgets()
    const bIds = new Set(existingBudgets.map((b) => b.id))
    const newBudgets = parsed.budgets.filter((b) => !bIds.has(b.id) && b.categoryId && b.month)
    saveBudgets([...existingBudgets, ...newBudgets])
  }

  // Merge Goals if present
  if (Array.isArray(parsed?.goals)) {
    const existingGoals = getGoals()
    const gIds = new Set(existingGoals.map((g) => g.id))
    const newGoals = parsed.goals.filter((g) => !gIds.has(g.id) && g.id && g.name)
    saveGoals([...existingGoals, ...newGoals])
  }

  // Merge Recurring Transactions if present
  if (Array.isArray(parsed?.recurringTransactions)) {
    const existingRec = getRecurringTransactions()
    const rIds = new Set(existingRec.map((r) => r.id))
    const newRec = parsed.recurringTransactions.filter((r) => !rIds.has(r.id) && r.id && r.description)
    saveRecurringTransactions([...existingRec, ...newRec])
  }

  // Merge Settings if present
  if (parsed?.settings && typeof parsed.settings === 'object') {
    saveSettings(parsed.settings)
  }

  return {
    success: true,
    importedTxnsCount: newTxns.length,
    transactions: mergedTxns,
  }
}

export function importTransactions(jsonString) {
  return importBackupData(jsonString)
}
