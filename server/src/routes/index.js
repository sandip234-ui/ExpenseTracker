import { Router } from 'express'
import healthRoutes from './healthRoutes.js'
import authRoutes from './authRoutes.js'
import accountRoutes from './accountRoutes.js'
import transactionRoutes from './transactionRoutes.js'
import goalRoutes from './goalRoutes.js'
import budgetRoutes from './budgetRoutes.js'
import recurringRoutes from './recurringRoutes.js'
import categoryRoutes from './categoryRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import { authenticate } from '../middleware/authMiddleware.js'

const apiRouter = Router()

// Public endpoints
apiRouter.use('/health', healthRoutes)
apiRouter.use('/auth', authRoutes)

// Protected financial resources (enforces authentication and user context)
apiRouter.use('/accounts', authenticate, accountRoutes)
apiRouter.use('/transactions', authenticate, transactionRoutes)
apiRouter.use('/goals', authenticate, goalRoutes)
apiRouter.use('/budgets', authenticate, budgetRoutes)
apiRouter.use('/recurring', authenticate, recurringRoutes)
apiRouter.use('/categories', authenticate, categoryRoutes)
apiRouter.use('/notifications', authenticate, notificationRoutes)

export default apiRouter
