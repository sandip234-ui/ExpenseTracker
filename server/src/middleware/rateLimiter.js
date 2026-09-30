import rateLimit from 'express-rate-limit'
import { config } from '../config/index.js'

/**
 * Authentication Endpoint Rate Limiter
 * Guards against automated password brute-force and credential stuffing attacks.
 * Relaxed during automated test runs to prevent test suite interference.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 20, // 20 attempts per 15m window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    status: 'error',
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
  },
})

/**
 * Creates an instance-level rate limiter for security verification tests.
 */
export function createTestRateLimiter(maxRequests = 3, windowMs = 15000) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded for test verification.',
      },
    },
  })
}
