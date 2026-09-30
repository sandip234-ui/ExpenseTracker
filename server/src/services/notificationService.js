import prisma from '../lib/prisma.js'

/**
 * Notification Service
 * Manages user-isolated notification states (read/unread, dismissed) in PostgreSQL.
 */

/**
 * Retrieve all notification states for an authenticated user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getNotificationStates(userId) {
  return prisma.notificationState.findMany({
    where: { userId },
  })
}

/**
 * Mark notifications as read.
 *
 * @param {string} userId
 * @param {string[]} alertIds
 * @returns {Promise<Array>}
 */
export async function markAsRead(userId, alertIds = []) {
  if (!alertIds || alertIds.length === 0) return []
  const now = new Date()

  const results = []
  for (const alertId of alertIds) {
    const record = await prisma.notificationState.upsert({
      where: {
        userId_alertId: { userId, alertId },
      },
      update: {
        isRead: true,
        readAt: now,
      },
      create: {
        userId,
        alertId,
        isRead: true,
        readAt: now,
      },
    })
    results.push(record)
  }
  return results
}

/**
 * Dismiss a single notification.
 *
 * @param {string} userId
 * @param {string} alertId
 * @returns {Promise<object>}
 */
export async function dismissNotification(userId, alertId) {
  if (!alertId) return null
  const now = new Date()
  return prisma.notificationState.upsert({
    where: {
      userId_alertId: { userId, alertId },
    },
    update: {
      isDismissed: true,
      dismissedAt: now,
    },
    create: {
      userId,
      alertId,
      isDismissed: true,
      dismissedAt: now,
    },
  })
}

/**
 * Dismiss multiple notifications (Clear All).
 *
 * @param {string} userId
 * @param {string[]} alertIds
 * @returns {Promise<Array>}
 */
export async function dismissAll(userId, alertIds = []) {
  if (!alertIds || alertIds.length === 0) return []
  const now = new Date()

  const results = []
  for (const alertId of alertIds) {
    const record = await prisma.notificationState.upsert({
      where: {
        userId_alertId: { userId, alertId },
      },
      update: {
        isDismissed: true,
        dismissedAt: now,
      },
      create: {
        userId,
        alertId,
        isDismissed: true,
        dismissedAt: now,
      },
    })
    results.push(record)
  }
  return results
}
