import prisma from '../lib/prisma.js'
import {
  RecurringNotFoundError,
  AccountNotFoundError,
  InvalidAmountError,
} from '../errors/domainErrors.js'

/**
 * Computes next date based on frequency.
 */
export function getNextDate(dateObj, frequency) {
  const d = new Date(dateObj)
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    default:
      d.setMonth(d.getMonth() + 1)
  }
  return d
}

export async function getRecurring(filterOrClient = {}, maybeClient = prisma) {
  let filter = {}
  let client = maybeClient
  let userId = 'user_default_primary'

  if (filterOrClient && filterOrClient.recurringTransaction) {
    client = filterOrClient
    filter = {}
  } else if (typeof filterOrClient === 'object') {
    filter = filterOrClient || {}
    if (filter.userId) userId = filter.userId
  } else if (typeof filterOrClient === 'string') {
    userId = filterOrClient
  }

  const where = { userId }
  if (filter.active !== undefined) {
    where.active = filter.active
  }
  return client.recurringTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { account: true, category: true },
  })
}

export async function getRecurringById(id, userIdOrClient = null, client = prisma) {
  if (!id) return null
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.recurringTransaction) {
    dbClient = userIdOrClient
  }

  const where = { id }
  if (userId) where.userId = userId

  return dbClient.recurringTransaction.findFirst({
    where,
    include: { account: true, category: true },
  })
}

export async function createRecurring(data, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = data.userId || 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = data.userId || userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.recurringTransaction) {
    dbClient = userIdOrClient
  }

  const amount = Number(data.amount) || 0
  if (amount <= 0) {
    throw new InvalidAmountError('Recurring transaction amount must be greater than zero.')
  }

  if (!data.accountId) {
    throw new AccountNotFoundError('accountId is required.')
  }

  const account = await dbClient.account.findFirst({ where: { id: data.accountId, userId } })
  if (!account) {
    throw new AccountNotFoundError(`Account with ID "${data.accountId}" not found.`)
  }

  const startDate = data.startDate ? new Date(data.startDate) : new Date()
  const nextOccurrence = data.nextOccurrence ? new Date(data.nextOccurrence) : new Date(startDate)

  const id = data.id || `rec-${Date.now()}`
  return dbClient.recurringTransaction.create({
    data: {
      id,
      userId,
      description: String(data.description || 'Recurring Transaction').trim(),
      amount,
      type: String(data.type || 'expense').toLowerCase(),
      frequency: String(data.frequency || 'monthly').toLowerCase(),
      startDate,
      endDate: data.endDate ? new Date(data.endDate) : null,
      nextOccurrence,
      lastGeneratedDate: data.lastGeneratedDate ? new Date(data.lastGeneratedDate) : null,
      paymentMethod: data.paymentMethod || 'Recurring',
      notes: data.notes || '',
      active: data.active !== undefined ? Boolean(data.active) : true,
      accountId: account.id,
      categoryId: data.categoryId || null,
    },
    include: { account: true, category: true },
  })
}

export async function updateRecurring(id, data, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.recurringTransaction) {
    dbClient = userIdOrClient
  }

  const rule = await getRecurringById(id, userId, dbClient)
  if (!rule) {
    throw new RecurringNotFoundError(`Recurring transaction with ID "${id}" not found.`)
  }

  const updateData = {}
  if (data.amount !== undefined) {
    const amt = Number(data.amount)
    if (isNaN(amt) || amt <= 0) throw new InvalidAmountError('Amount must be greater than zero.')
    updateData.amount = amt
  }
  if (data.description !== undefined) updateData.description = String(data.description).trim()
  if (data.frequency !== undefined) updateData.frequency = data.frequency
  if (data.active !== undefined) updateData.active = Boolean(data.active)
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
  if (data.nextOccurrence !== undefined) updateData.nextOccurrence = new Date(data.nextOccurrence)
  if (data.lastGeneratedDate !== undefined) {
    updateData.lastGeneratedDate = data.lastGeneratedDate ? new Date(data.lastGeneratedDate) : null
  }

  return dbClient.recurringTransaction.update({
    where: { id },
    data: updateData,
    include: { account: true, category: true },
  })
}

export async function deleteRecurring(id, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.recurringTransaction) {
    dbClient = userIdOrClient
  }

  const rule = await getRecurringById(id, userId, dbClient)
  if (!rule) {
    throw new RecurringNotFoundError(`Recurring transaction with ID "${id}" not found.`)
  }

  return dbClient.recurringTransaction.delete({
    where: { id },
  })
}
