import { STORAGE_KEYS, safeRead, safeWrite } from './storageService'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories'

export function getCustomCategories() {
  const custom = safeRead(STORAGE_KEYS.CATEGORIES, [])
  return Array.isArray(custom) ? custom : []
}

export function saveCustomCategories(categories) {
  safeWrite(STORAGE_KEYS.CATEGORIES, categories)
  return categories
}

export function addCategory(category) {
  const categories = getCustomCategories()
  const updated = [...categories, category]
  safeWrite(STORAGE_KEYS.CATEGORIES, updated)
  return updated
}

export function updateCategory(id, updatedFields) {
  const categories = getCustomCategories()
  const updated = categories.map((c) => (c.id === id ? { ...c, ...updatedFields, id } : c))
  safeWrite(STORAGE_KEYS.CATEGORIES, updated)
  return updated
}

export function deleteCategory(id) {
  const categories = getCustomCategories()
  const updated = categories.filter((c) => c.id !== id)
  safeWrite(STORAGE_KEYS.CATEGORIES, updated)
  return updated
}

/**
 * Returns merged category list (default + custom) for a given type or all.
 */
export function getAllCategories(type = 'all', customCategories = []) {
  let defaults = []
  if (type === 'income') {
    defaults = INCOME_CATEGORIES
  } else if (type === 'expense') {
    defaults = EXPENSE_CATEGORIES
  } else {
    defaults = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  }

  const customFiltered = (customCategories || []).filter((c) => {
    if (type === 'all') return true
    return c.type === type || c.type === 'both'
  })

  // Deduplicate by ID
  const map = new Map()
  defaults.forEach((c) => map.set(c.id, c))
  customFiltered.forEach((c) => map.set(c.id, c))

  return Array.from(map.values())
}

/**
 * Finds a category object by id across standard and custom categories.
 */
export function findCategory(id, type = 'expense', customCategories = []) {
  if (!id) return { id: 'other', label: 'Other', icon: '📦', color: '#78716C' }
  const all = getAllCategories(type, customCategories)
  const found = all.find((c) => c.id === id)
  if (found) return found

  // Check in all types if not found
  const allUnrestricted = getAllCategories('all', customCategories)
  const fallback = allUnrestricted.find((c) => c.id === id)
  return fallback || { id, label: id, icon: '📦', color: '#78716C' }
}

/**
 * Checks if a category is used in any transaction.
 */
export function getCategoryUsageCount(id, transactions = []) {
  return transactions.filter((t) => t.category === id).length
}
