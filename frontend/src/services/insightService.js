import { getCategoryData, getTotalIncome, getTotalExpenses } from '../utils/calculations'
import { calculateBudgetStatus } from './budgetService'
import { calculateAccountBalance } from './accountService'
import { calculateGoalMetrics } from './goalService'
import { findCategory } from './categoryService'

/**
 * Returns month-over-month comparison insights if sufficient data exists.
 */
export function generateSpendingInsights(transactions = [], customCategories = []) {
  const insights = []
  if (!transactions || transactions.length === 0) {
    insights.push({
      type: 'info',
      title: 'Not enough data',
      message: 'Add more transactions to generate meaningful spending comparisons.',
      icon: 'ℹ️',
    })
    return insights
  }

  // 1. Largest expense category this month
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthTxns = transactions.filter((t) => t.date && t.date.startsWith(currentMonthStr))
  
  const categoryData = getCategoryData(thisMonthTxns.length > 0 ? thisMonthTxns : transactions, 'expense')
  if (categoryData.length > 0) {
    const topCategory = categoryData[0]
    const catObj = findCategory(topCategory.category, 'expense', customCategories)
    insights.push({
      type: 'info',
      title: `${catObj.icon || '📊'} ${catObj.label} is your top expense`,
      message: `₹${Number(topCategory.amount).toLocaleString('en-IN')} (${topCategory.percentage}% of total spending) ${
        thisMonthTxns.length > 0 ? 'this month' : 'overall'
      }.`,
      icon: catObj.icon || '🏷️',
    })
  }

  // 2. Month-over-month comparison if at least 2 months with transactions exist
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const lastMonthTxns = transactions.filter((t) => t.date && t.date.startsWith(lastMonthStr))

  if (thisMonthTxns.length > 0 && lastMonthTxns.length > 0) {
    const thisMonthExp = getTotalExpenses(thisMonthTxns)
    const lastMonthExp = getTotalExpenses(lastMonthTxns)

    if (lastMonthExp > 0) {
      const diffPct = Math.round(((thisMonthExp - lastMonthExp) / lastMonthExp) * 100)
      if (diffPct > 0) {
        insights.push({
          type: 'warning',
          title: 'Spending increased',
          message: `You spent ${diffPct}% more this month compared with last month.`,
          icon: '📈',
        })
      } else if (diffPct < 0) {
        insights.push({
          type: 'success',
          title: 'Spending decreased',
          message: `Great job! You spent ${Math.abs(diffPct)}% less this month compared with last month.`,
          icon: '📉',
        })
      }
    }
  }

  // 3. Savings Rate insight
  const totalInc = getTotalIncome(thisMonthTxns.length > 0 ? thisMonthTxns : transactions)
  const totalExp = getTotalExpenses(thisMonthTxns.length > 0 ? thisMonthTxns : transactions)

  if (totalInc > 0) {
    const rate = Math.round(((totalInc - totalExp) / totalInc) * 100)
    if (rate > 20) {
      insights.push({
        type: 'success',
        title: 'Healthy savings rate',
        message: `You saved ${rate}% of your income ${thisMonthTxns.length > 0 ? 'this month' : 'overall'}.`,
        icon: '💰',
      })
    } else if (rate < 0) {
      insights.push({
        type: 'warning',
        title: 'Expenses exceed income',
        message: `Your spending exceeds income by ₹${Math.abs(totalInc - totalExp).toLocaleString('en-IN')}.`,
        icon: '⚠️',
      })
    }
  }

  return insights
}

/**
 * Generates smart warnings and alerts across all financial subsystems.
 * Severity: 'info' | 'warning' | 'critical' | 'success'
 */
export function generateSmartWarnings({
  transactions = [],
  budgets = [],
  accounts = [],
  recurring = [],
  goals = [],
  customCategories = [],
}) {
  const warnings = []
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. Budget Warnings (Current Month)
  const monthBudgets = budgets.filter((b) => b.month === currentMonthStr)
  monthBudgets.forEach((b) => {
    const status = calculateBudgetStatus(b, transactions)
    const cat = findCategory(b.categoryId, 'expense', customCategories)
    
    if (status.state === 'critical') {
      warnings.push({
        id: `budget-crit-${b.id}`,
        severity: 'critical',
        title: 'Budget Exceeded',
        message: `${cat.icon} ${cat.label} budget exceeded by ₹${status.overAmount.toLocaleString('en-IN')} (${Math.round(status.percentage)}% used).`,
        link: '/budgets',
        createdAt: new Date().toISOString(),
      })
    } else if (status.state === 'warning') {
      warnings.push({
        id: `budget-warn-${b.id}`,
        severity: 'warning',
        title: 'Budget Near Limit',
        message: `${cat.icon} You've used ${Math.round(status.percentage)}% of your ${cat.label} budget.`,
        link: '/budgets',
        createdAt: new Date().toISOString(),
      })
    }
  })

  // 2. Negative Account Balances
  accounts.forEach((acc) => {
    const bal = calculateAccountBalance(acc, transactions)
    if (bal < 0) {
      warnings.push({
        id: `acc-neg-${acc.id}`,
        severity: 'critical',
        title: 'Negative Account Balance',
        message: `${acc.icon || '💳'} ${acc.name} has a negative balance of -₹${Math.abs(bal).toLocaleString('en-IN')}.`,
        link: '/accounts',
        createdAt: new Date().toISOString(),
      })
    }
  })

  // 3. Upcoming Recurring Transactions (Due in next 3 days)
  const todayMs = new Date().setHours(0, 0, 0, 0)
  recurring.filter((r) => r.active).forEach((r) => {
    if (r.nextOccurrence) {
      const nextDate = new Date(r.nextOccurrence).setHours(0, 0, 0, 0)
      const daysUntil = Math.ceil((nextDate - todayMs) / (1000 * 60 * 60 * 24))
      
      if (daysUntil >= 0 && daysUntil <= 3) {
        const timeText = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
        warnings.push({
          id: `rec-due-${r.id}`,
          severity: 'info',
          title: 'Recurring Transaction Due',
          message: `🔔 "${r.description}" (₹${Number(r.amount).toLocaleString('en-IN')}) is due ${timeText}.`,
          link: '/recurring',
          createdAt: new Date().toISOString(),
        })
      }
    }
  })

  // 4. Savings Goals Milestones (≥ 75% or 100% complete)
  goals.forEach((g) => {
    const metrics = calculateGoalMetrics(g)
    if (metrics.isCompleted) {
      warnings.push({
        id: `goal-comp-${g.id}`,
        severity: 'success',
        title: 'Goal Achieved!',
        message: `🎉 You've reached your target for "${g.name}" (₹${metrics.targetAmount.toLocaleString('en-IN')}).`,
        link: '/goals',
        createdAt: new Date().toISOString(),
      })
    } else if (metrics.percentage >= 75) {
      warnings.push({
        id: `goal-near-${g.id}`,
        severity: 'info',
        title: 'Goal Milestone',
        message: `🎯 You're ${Math.round(metrics.percentage)}% of the way to your "${g.name}" goal!`,
        link: '/goals',
        createdAt: new Date().toISOString(),
      })
    }
  })

  return warnings
}
