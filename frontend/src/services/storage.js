const STORAGE_KEY = 'fintrack_transactions'
const SETTINGS_KEY = 'fintrack_settings'

const DEFAULT_SETTINGS = {
  currency: 'INR',
  currencySymbol: '₹',
  theme: 'dark',
}

// ─── Safe JSON helpers ────────────────────────────────────────────────────────

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    console.warn(`[storage] Failed to parse key "${key}", returning fallback.`)
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`[storage] Failed to write key "${key}":`, err)
    return false
  }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function getTransactions() {
  const data = safeRead(STORAGE_KEY, [])
  if (!Array.isArray(data)) return []
  return data
}

export function addTransaction(transaction) {
  const transactions = getTransactions()
  const updated = [transaction, ...transactions]
  safeWrite(STORAGE_KEY, updated)
  return updated
}

export function updateTransaction(id, updatedFields) {
  const transactions = getTransactions()
  const updated = transactions.map((t) =>
    t.id === id ? { ...t, ...updatedFields, id } : t
  )
  safeWrite(STORAGE_KEY, updated)
  return updated
}

export function deleteTransaction(id) {
  const transactions = getTransactions()
  const updated = transactions.filter((t) => t.id !== id)
  safeWrite(STORAGE_KEY, updated)
  return updated
}

export function clearTransactions() {
  localStorage.removeItem(STORAGE_KEY)
  return []
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export function exportTransactions() {
  const transactions = getTransactions()
  const settings = getSettings()
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings, transactions }, null, 2)
}

/**
 * Validates and imports transaction data from a JSON string.
 * Returns { success, transactions, error }
 */
export function importTransactions(jsonString) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid JSON file. Please provide a valid backup file.' }
  }

  // Accept both { transactions: [...] } and bare arrays
  const rawTransactions = Array.isArray(parsed) ? parsed : parsed?.transactions

  if (!Array.isArray(rawTransactions)) {
    return { success: false, error: 'No transactions array found in the file.' }
  }

  // Validate each transaction has required fields
  const required = ['id', 'type', 'amount', 'description', 'category', 'date']
  const invalid = rawTransactions.filter(
    (t) => !required.every((k) => t[k] !== undefined && t[k] !== null && t[k] !== '')
  )

  if (invalid.length > 0) {
    return {
      success: false,
      error: `${invalid.length} transaction(s) have missing required fields (id, type, amount, description, category, date).`,
    }
  }

  // Validate types
  const validTypes = ['income', 'expense']
  const badTypes = rawTransactions.filter((t) => !validTypes.includes(t.type))
  if (badTypes.length > 0) {
    return { success: false, error: 'Some transactions have invalid type. Must be "income" or "expense".' }
  }

  // Deduplicate by ID — existing transactions win on conflict
  const existing = getTransactions()
  const existingIds = new Set(existing.map((t) => t.id))
  const newOnly = rawTransactions.filter((t) => !existingIds.has(t.id))
  const merged = [...newOnly, ...existing]

  safeWrite(STORAGE_KEY, merged)

  // Import settings if present and valid
  if (parsed?.settings && typeof parsed.settings === 'object') {
    const currentSettings = getSettings()
    safeWrite(SETTINGS_KEY, { ...currentSettings, ...parsed.settings })
  }

  return { success: true, transactions: merged, imported: newOnly.length }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeRead(SETTINGS_KEY, {}) }
}

export function saveSettings(settings) {
  const current = getSettings()
  const merged = { ...current, ...settings }
  safeWrite(SETTINGS_KEY, merged)
  return merged
}
