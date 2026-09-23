import { STORAGE_KEYS, safeRead, safeWrite } from './storageService'

export function getBudgets() {
  const budgets = safeRead(STORAGE_KEYS.BUDGETS, [])
  return Array.isArray(budgets) ? budgets : []
}

export function saveBudgets(budgets) {
  safeWrite(STORAGE_KEYS.BUDGETS, budgets)
  return budgets
}

export function addBudget(budget) {
  const budgets = getBudgets()
  // If budget for this category and month already exists, update it instead of duplicate
  const existingIndex = budgets.findIndex(
    (b) => b.categoryId === budget.categoryId && b.month === budget.month
  )
  let updated
  if (existingIndex >= 0) {
    updated = [...budgets]
    updated[existingIndex] = { ...updated[existingIndex], ...budget }
  } else {
    updated = [...budgets, budget]
  }
  safeWrite(STORAGE_KEYS.BUDGETS, updated)
  return updated
}

export function updateBudget(id, updatedFields) {
  const budgets = getBudgets()
  const updated = budgets.map((b) => (b.id === id ? { ...b, ...updatedFields, id } : b))
  safeWrite(STORAGE_KEYS.BUDGETS, updated)
  return updated
}

export function deleteBudget(id) {
  const budgets = getBudgets()
  const updated = budgets.filter((b) => b.id !== id)
  safeWrite(STORAGE_KEYS.BUDGETS, updated)
  return updated
}

export function getBudgetsForMonth(budgets = [], monthString) {
  if (!monthString) {
    const now = new Date()
    monthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  return budgets.filter((b) => b.month === monthString)
}

/**
 * Calculates spending and utilization for a specific budget.
 */
export function calculateBudgetStatus(budget, transactions = []) {
  if (!budget) return null
  const budgetAmount = Number(budget.amount) || 0
  
  // Filter transactions for category, type expense, and matching year-month
  const spent = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false
      if (t.category !== budget.categoryId) return false
      if (!t.date) return false
      return t.date.startsWith(budget.month)
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const remaining = budgetAmount - spent
  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
  const isOver = spent > budgetAmount
  const overAmount = isOver ? spent - budgetAmount : 0

  let state = 'normal'
  if (percentage >= 100) {
    state = 'critical'
  } else if (percentage >= 80) {
    state = 'warning'
  }

  return {
    ...budget,
    budgetAmount,
    spent,
    remaining,
    percentage,
    state,
    isOver,
    overAmount,
  }
}

/**
 * Calculates overall budget overview for a month.
 */
export function calculateOverallBudget(budgetsForMonth = [], transactions = [], monthString) {
  if (budgetsForMonth.length === 0) {
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentage: 0,
      exceededCount: 0,
      items: [],
    }
  }

  const items = budgetsForMonth.map((b) => calculateBudgetStatus(b, transactions))
  const totalBudget = items.reduce((sum, item) => sum + item.budgetAmount, 0)
  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0)
  const remaining = totalBudget - totalSpent
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const exceededCount = items.filter((item) => item.isOver).length

  return {
    totalBudget,
    totalSpent,
    remaining,
    percentage,
    exceededCount,
    items,
  }
}
