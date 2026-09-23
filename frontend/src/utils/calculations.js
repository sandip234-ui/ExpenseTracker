/**
 * Financial calculations — all derived from a transactions array.
 * No side effects, no localStorage access.
 */

export function getTotalIncome(transactions) {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

export function getTotalExpenses(transactions) {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

export function getBalance(transactions) {
  return getTotalIncome(transactions) - getTotalExpenses(transactions)
}

export function getThisMonthTransactions(transactions) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
}

export function getThisMonthExpenses(transactions) {
  return getTotalExpenses(getThisMonthTransactions(transactions))
}

export function getThisMonthIncome(transactions) {
  return getTotalIncome(getThisMonthTransactions(transactions))
}

/**
 * Returns the last N months of income/expense data for charts.
 * Each entry: { month: 'Sep 2026', income: 0, expenses: 0, net: 0 }
 */
export function getMonthlyData(transactions, months = 6) {
  const result = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

    const monthTxns = transactions.filter((t) => {
      const td = new Date(t.date)
      return td.getFullYear() === year && td.getMonth() === month
    })

    const income = getTotalIncome(monthTxns)
    const expenses = getTotalExpenses(monthTxns)

    result.push({ month: label, income, expenses, net: income - expenses })
  }

  return result
}

/**
 * Returns spending grouped by category for a given type.
 * Each entry: { category, amount, percentage }
 */
export function getCategoryData(transactions, type = 'expense') {
  const filtered = transactions.filter((t) => t.type === type)
  const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0)

  const grouped = {}
  filtered.forEach((t) => {
    grouped[t.category] = (grouped[t.category] || 0) + Number(t.amount)
  })

  return Object.entries(grouped)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Returns recent transactions sorted by date descending.
 */
export function getRecentTransactions(transactions, limit = 5) {
  return [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
}

/**
 * Returns monthly data for the current calendar year.
 */
export function getYearlyMonthlyData(transactions) {
  const now = new Date()
  const year = now.getFullYear()
  const result = []

  for (let m = 0; m <= now.getMonth(); m++) {
    const label = new Date(year, m, 1).toLocaleDateString('en-IN', { month: 'short' })
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === m
    })
    result.push({
      month: label,
      income: getTotalIncome(monthTxns),
      expenses: getTotalExpenses(monthTxns),
    })
  }

  return result
}
