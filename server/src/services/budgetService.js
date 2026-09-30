import prisma from '../lib/prisma.js'
import {
  BudgetNotFoundError,
  CategoryNotFoundError,
  DuplicateBudgetError,
  InvalidAmountError,
} from '../errors/domainErrors.js'

/**
 * Budget Domain Service
 * Enforces monthly category spending caps and calculates budget utilization.
 */

export async function getBudgets(monthString = null, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.budget) {
    dbClient = userIdOrClient
  }

  const where = { userId }
  if (monthString) {
    where.month = monthString
  }
  return dbClient.budget.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { category: true },
  })
}

export async function getBudgetById(id, userIdOrClient = null, client = prisma) {
  if (!id) return null
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.budget) {
    dbClient = userIdOrClient
  }

  const where = { id }
  if (userId) where.userId = userId

  return dbClient.budget.findFirst({
    where,
    include: { category: true },
  })
}

export async function createBudget(data, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = data.userId || 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = data.userId || userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.budget) {
    dbClient = userIdOrClient
  }

  const amount = Number(data.amount) || 0
  if (amount <= 0) {
    throw new InvalidAmountError('Budget amount must be greater than zero.')
  }

  if (!data.categoryId) {
    throw new CategoryNotFoundError('categoryId is required for a budget.')
  }

  const category = await dbClient.category.findUnique({ where: { id: data.categoryId } })
  if (!category) {
    throw new CategoryNotFoundError(`Category with ID "${data.categoryId}" not found.`)
  }

  let month = data.month
  if (!month) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // Check uniqueness constraint per user
  const existing = await dbClient.budget.findUnique({
    where: {
      userId_categoryId_month: {
        userId,
        categoryId: data.categoryId,
        month,
      },
    },
  })
  if (existing) {
    throw new DuplicateBudgetError(
      `A budget for category "${category.name}" in month "${month}" already exists.`
    )
  }

  const id = data.id || `budget-${Date.now()}`
  return dbClient.budget.create({
    data: {
      id,
      userId,
      categoryId: data.categoryId,
      month,
      amount,
    },
    include: { category: true },
  })
}

export async function updateBudget(id, data, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.budget) {
    dbClient = userIdOrClient
  }

  const budget = await getBudgetById(id, userId, dbClient)
  if (!budget) {
    throw new BudgetNotFoundError(`Budget with ID "${id}" not found.`)
  }

  const updateData = {}
  if (data.amount !== undefined) {
    const amt = Number(data.amount)
    if (isNaN(amt) || amt <= 0) throw new InvalidAmountError('Budget amount must be greater than zero.')
    updateData.amount = amt
  }
  if (data.month !== undefined) updateData.month = data.month

  return dbClient.budget.update({
    where: { id },
    data: updateData,
    include: { category: true },
  })
}

export async function deleteBudget(id, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.budget) {
    dbClient = userIdOrClient
  }

  const budget = await getBudgetById(id, userId, dbClient)
  if (!budget) {
    throw new BudgetNotFoundError(`Budget with ID "${id}" not found.`)
  }

  return dbClient.budget.delete({
    where: { id },
  })
}

/**
 * Calculates spending and utilization for a specific budget against ledger transactions.
 */
export async function calculateBudgetStatus(budget, client = prisma) {
  if (!budget) return null
  const budgetAmount = Number(budget.amount) || 0

  const [year, month] = budget.month.split('-').map(Number)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  const where = {
    type: 'expense',
    categoryId: budget.categoryId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  }
  if (budget.userId) {
    where.userId = budget.userId
  }

  const transactions = await client.transaction.findMany({
    where,
    select: { amount: true },
  })

  const spent = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
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
