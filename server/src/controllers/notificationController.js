import * as notificationService from '../services/notificationService.js'

export async function getNotificationStates(req, res, next) {
  try {
    const userId = req.user.id
    const states = await notificationService.getNotificationStates(userId)
    res.json({
      success: true,
      data: states,
    })
  } catch (error) {
    next(error)
  }
}

export async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id
    const { alertIds } = req.body
    if (!Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'alertIds must be an array' },
      })
    }
    const result = await notificationService.markAsRead(userId, alertIds)
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function dismissNotification(req, res, next) {
  try {
    const userId = req.user.id
    const { alertId } = req.body
    if (!alertId || typeof alertId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'alertId string is required' },
      })
    }
    const result = await notificationService.dismissNotification(userId, alertId)
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export async function dismissAll(req, res, next) {
  try {
    const userId = req.user.id
    const { alertIds } = req.body
    if (!Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'alertIds must be an array' },
      })
    }
    const result = await notificationService.dismissAll(userId, alertIds)
    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
