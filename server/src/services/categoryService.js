import prisma from '../lib/prisma.js'
import {
  CategoryNotFoundError,
  DomainError,
  InvalidCategoryTypeError,
} from '../errors/domainErrors.js'

/**
 * Category Domain Service
 * Handles category taxonomies (expense, income, transfer, custom categories).
 * System default categories (isCustom: false) are global to all users.
 * Custom categories (isCustom: true) belong strictly to the creating user.
 */

export const DEFAULT_SYSTEM_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f59e0b', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { id: 'bills', name: 'Bills', icon: '🧾', color: '#6366f1', type: 'expense' },
  { id: 'education', name: 'Education', icon: '📚', color: '#8b5cf6', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#f43f5e', type: 'expense' },
  { id: 'health', name: 'Health', icon: '💊', color: '#10b981', type: 'expense' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#0ea5e9', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱', color: '#a855f7', type: 'expense' },
  { id: 'salary', name: 'Salary', icon: '💼', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
  { id: 'business', name: 'Business', icon: '🏢', color: '#f59e0b', type: 'income' },
  { id: 'investment', name: 'Investment', icon: '📈', color: '#6366f1', type: 'income' },
  { id: 'gift', name: 'Gift', icon: '🎁', color: '#ec4899', type: 'income' },
  { id: 'other', name: 'Other', icon: '📦', color: '#78716c', type: 'both' },
  { id: 'savings', name: 'Savings Transfer', icon: '🎯', color: '#10b981', type: 'transfer' },
]

export async function ensureDefaultSystemCategories(client = prisma) {
  const count = await client.category.count({ where: { isCustom: false } })
  if (count < DEFAULT_SYSTEM_CATEGORIES.length) {
    for (const cat of DEFAULT_SYSTEM_CATEGORIES) {
      await client.category.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isCustom: false,
        },
        create: {
          id: cat.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isCustom: false,
          userId: null,
        },
      })
    }
  }
}

export async function getCategories(type = 'all', userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
  }

  try {
    await ensureDefaultSystemCategories(dbClient)
  } catch (e) {
    // Non-fatal if read-only or concurrent
  }

  const where = {
    OR: [{ isCustom: false }, { userId }],
  }

  if (type === 'income') {
    where.type = { in: ['income', 'both'] }
  } else if (type === 'expense') {
    where.type = { in: ['expense', 'both'] }
  } else if (type === 'transfer') {
    where.type = 'transfer'
  }

  return dbClient.category.findMany({
    where,
    orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
  })
}

export async function getCategoryById(id, userIdOrClient = null, client = prisma) {
  if (!id) return null
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
  }

  const where = { id }
  if (userId) {
    where.OR = [{ isCustom: false }, { userId }]
  }

  let cat = await dbClient.category.findFirst({
    where,
  })

  if (!cat && DEFAULT_SYSTEM_CATEGORIES.some((c) => c.id === id)) {
    try {
      await ensureDefaultSystemCategories(dbClient)
      cat = await dbClient.category.findFirst({ where })
    } catch (e) {}
  }

  return cat
}

export async function createCategory(data, userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = data.userId || 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = data.userId || userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
  }

  const name = String(data.name || '').trim()
  if (!name) {
    throw new DomainError('Category name is required.')
  }

  const type = String(data.type || 'expense').toLowerCase()
  if (!['expense', 'income', 'both', 'transfer'].includes(type)) {
    throw new InvalidCategoryTypeError(`Invalid category type "${data.type}".`)
  }

  const id = data.id || `cat-custom-${Date.now()}`
  return dbClient.category.create({
    data: {
      id,
      userId,
      name,
      type,
      icon: data.icon || '🏷️',
      color: data.color || '#6B7280',
      isCustom: true,
    },
  })
}

export async function updateCategory(id, data, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
  }

  const category = await getCategoryById(id, userId, dbClient)
  if (!category) {
    throw new CategoryNotFoundError(`Category with ID "${id}" not found.`)
  }

  if (!category.isCustom) {
    throw new DomainError('System default categories cannot be modified.')
  }

  if (userId && category.userId && category.userId !== userId) {
    throw new CategoryNotFoundError(`Category with ID "${id}" not found.`)
  }

  const updateData = {}
  if (data.name !== undefined) updateData.name = String(data.name).trim()
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.color !== undefined) updateData.color = data.color
  if (data.type !== undefined) {
    const t = String(data.type).toLowerCase()
    if (!['expense', 'income', 'both', 'transfer'].includes(t)) {
      throw new InvalidCategoryTypeError(`Invalid category type "${data.type}".`)
    }
    updateData.type = t
  }

  return dbClient.category.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteCategory(id, userIdOrClient = null, client = prisma) {
  let userId = null
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
  }

  const category = await getCategoryById(id, userId, dbClient)
  if (!category) {
    throw new CategoryNotFoundError(`Category with ID "${id}" not found.`)
  }

  if (!category.isCustom) {
    throw new DomainError('System default categories cannot be deleted.')
  }

  if (userId && category.userId && category.userId !== userId) {
    throw new CategoryNotFoundError(`Category with ID "${id}" not found.`)
  }

  return dbClient.category.delete({
    where: { id },
  })
}
