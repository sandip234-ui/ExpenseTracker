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

export async function getCategories(type = 'all', userIdOrClient = 'user_default_primary', client = prisma) {
  let userId = 'user_default_primary'
  let dbClient = client
  if (typeof userIdOrClient === 'string') {
    userId = userIdOrClient
  } else if (userIdOrClient && typeof userIdOrClient === 'object' && userIdOrClient.category) {
    dbClient = userIdOrClient
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

  return dbClient.category.findFirst({
    where,
  })
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
