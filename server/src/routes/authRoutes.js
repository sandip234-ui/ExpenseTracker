import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'
import { registerSchema, loginSchema } from '../validations/authSchema.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// Public auth endpoints protected by rate limiting & validation
router.post('/register', authRateLimiter, validate(registerSchema), authController.register)
router.post('/login', authRateLimiter, validate(loginSchema), authController.login)

// Protected auth endpoints
router.get('/me', authenticate, authController.getMe)
router.post('/logout', authenticate, authController.logout)

export default router
