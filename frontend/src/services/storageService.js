/**
 * Unified LocalStorage Service for FinTrack
 */

export const STORAGE_KEYS = {
  TRANSACTIONS: 'fintrack_transactions',
  ACCOUNTS: 'fintrack_accounts',
  CATEGORIES: 'fintrack_categories',
  BUDGETS: 'fintrack_budgets',
  GOALS: 'fintrack_goals',
  RECURRING: 'fintrack_recurring',
  SETTINGS: 'fintrack_settings',
}

export const DEFAULT_ACCOUNTS = [
  {
    id: 'account-cash',
    name: 'Cash',
    type: 'cash',
    openingBalance: 0,
    currency: 'INR',
    icon: '💵',
    color: '#10B981',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'account-sbi',
    name: 'Bank Account',
    type: 'bank',
    openingBalance: 0,
    currency: 'INR',
    icon: '🏦',
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'account-upi',
    name: 'UPI / Wallet',
    type: 'upi',
    openingBalance: 0,
    currency: 'INR',
    icon: '📱',
    color: '#8B5CF6',
    createdAt: new Date().toISOString(),
  },
]

export const DEFAULT_SETTINGS = {
  currency: 'INR',
  currencySymbol: '₹',
  theme: 'light', // 'light' | 'dark' | 'system'
}

// ─── Safe JSON Helpers ────────────────────────────────────────────────────────

export function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (err) {
    console.warn(`[storageService] Failed to parse key "${key}", returning fallback.`, err)
    return fallback
  }
}

export function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`[storageService] Failed to write key "${key}":`, err)
    return false
  }
}

// ─── Data Migration ───────────────────────────────────────────────────────────

/**
 * Ensures all V2 entities exist in LocalStorage without breaking V1 data.
 * Assigns accountId to older transactions that lacked it.
 */
export function migrateStorage() {
  // 1. Settings
  const currentSettings = safeRead(STORAGE_KEYS.SETTINGS, null)
  if (!currentSettings) {
    safeWrite(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  } else {
    safeWrite(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...currentSettings })
  }

  // 2. Accounts
  let accounts = safeRead(STORAGE_KEYS.ACCOUNTS, null)
  if (!Array.isArray(accounts) || accounts.length === 0) {
    accounts = DEFAULT_ACCOUNTS
    safeWrite(STORAGE_KEYS.ACCOUNTS, accounts)
  }

  // 3. Transactions - ensure each has valid accountId
  const rawTxns = safeRead(STORAGE_KEYS.TRANSACTIONS, [])
  if (Array.isArray(rawTxns) && rawTxns.length > 0) {
    let migratedCount = 0
    const defaultAccountId = accounts[0]?.id || 'account-cash'
    
    const migratedTxns = rawTxns.map((t) => {
      let accountId = t.accountId
      if (!accountId) {
        migratedCount++
        // Map paymentMethod if possible
        const method = (t.paymentMethod || '').toLowerCase()
        if (method.includes('upi') || method.includes('wallet')) {
          const upiAcc = accounts.find((a) => a.type === 'upi')
          accountId = upiAcc ? upiAcc.id : defaultAccountId
        } else if (method.includes('card') || method.includes('bank') || method.includes('net banking')) {
          const bankAcc = accounts.find((a) => a.type === 'bank' || a.type === 'card')
          accountId = bankAcc ? bankAcc.id : defaultAccountId
        } else {
          accountId = defaultAccountId
        }
      }
      return {
        ...t,
        accountId,
        paymentMethod: t.paymentMethod || 'Other',
        notes: t.notes || '',
      }
    })

    if (migratedCount > 0) {
      safeWrite(STORAGE_KEYS.TRANSACTIONS, migratedTxns)
      console.log(`[migrateStorage] Migrated ${migratedCount} transactions with default accounts.`)
    }
  } else if (!Array.isArray(rawTxns)) {
    safeWrite(STORAGE_KEYS.TRANSACTIONS, [])
  }

  // 4. Custom Categories
  const customCategories = safeRead(STORAGE_KEYS.CATEGORIES, null)
  if (!Array.isArray(customCategories)) {
    safeWrite(STORAGE_KEYS.CATEGORIES, [])
  }

  // 5. Budgets
  const budgets = safeRead(STORAGE_KEYS.BUDGETS, null)
  if (!Array.isArray(budgets)) {
    safeWrite(STORAGE_KEYS.BUDGETS, [])
  }

  // 6. Goals
  const goals = safeRead(STORAGE_KEYS.GOALS, null)
  if (!Array.isArray(goals)) {
    safeWrite(STORAGE_KEYS.GOALS, [])
  }

  // 7. Recurring Transactions
  const recurring = safeRead(STORAGE_KEYS.RECURRING, null)
  if (!Array.isArray(recurring)) {
    safeWrite(STORAGE_KEYS.RECURRING, [])
  }
}
