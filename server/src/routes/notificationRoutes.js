import { Router } from 'express'
import * as notificationController from '../controllers/notificationController.js'

const router = Router()

router.get('/', notificationController.getNotificationStates)
router.post('/read', notificationController.markAsRead)
router.post('/dismiss', notificationController.dismissNotification)
router.post('/dismiss-all', notificationController.dismissAll)

export default router
