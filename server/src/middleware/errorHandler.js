import { config } from '../config/index.js'

/**
 * 404 Not Found Middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    },
  })
}

/**
 * Centralized Production Error Handling Middleware
 * Sanitizes internal database and runtime errors in production so no internals leak to clients.
 */
export function errorHandler(err, req, res, next) {
  // Handle PostgreSQL / Prisma Unique Constraint Violations
  if (err.code === 'P2002') {
    const target = err.meta?.target || []
    const isAccountNameConstraint = Array.isArray(target)
      ? target.some((t) => t.includes('normalized') || t.includes('name'))
      : String(target).includes('normalized') || String(target).includes('name')

    if (isAccountNameConstraint) {
      return res.status(409).json({
        status: 'error',
        error: {
          code: 'ACCOUNT_NAME_EXISTS',
          message: 'An account with this name already exists.',
        },
      })
    }
  }

  const statusCode = err.statusCode || err.status || 500
  const isDomainOrValidation = err.code && statusCode < 500

  let message = err.message
  let code = err.code || 'ERROR'
  let details = err.details || null

  if (statusCode >= 500) {
    code = 'INTERNAL_SERVER_ERROR'
    if (config.isProduction) {
      message = 'An unexpected server error occurred. Please try again later.'
      details = null // Never leak database or execution internals in production
    } else {
      message = err.message || 'Internal Server Error'
    }
  } else if (!isDomainOrValidation) {
    code = statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST'
  }

  const response = {
    status: 'error',
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  }

  // Internal logging for operations & monitoring
  if (config.nodeEnv !== 'test' || statusCode >= 500) {
    console.error(`[API Error] [${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode} - ${err.message}`)
    if (statusCode >= 500 && err.stack) {
      console.error(err.stack)
    }
  }

  res.status(statusCode).json(response)
}
