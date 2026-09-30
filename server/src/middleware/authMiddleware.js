import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { UnauthorizedError } from '../errors/domainErrors.js'

/**
 * Authentication Middleware
 * Enforces valid JWT on protected routes via:
 * 1. Authorization: Bearer <token> (API / Mobile / Automation)
 * 2. HttpOnly Cookie: fintrack_token (Hardened Browser Sessions)
 *
 * Injects authenticated user payload into `req.user` and `req.userId`.
 */
export function authenticate(req, res, next) {
  let token = null

  // 1. Extract from Authorization Header
  const authHeader = req.headers.authorization
  if (authHeader) {
    const parts = authHeader.split(' ')
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1]
    } else {
      return next(new UnauthorizedError('Malformed Authorization header. Format must be "Bearer <token>".'))
    }
  }

  // 2. Extract from HttpOnly Secure Cookie if no header token
  if (!token && req.cookies && req.cookies[config.cookieName]) {
    token = req.cookies[config.cookieName]
  }

  if (!token) {
    return next(new UnauthorizedError('Authentication required. Missing token or session cookie.'))
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    req.user = decoded
    req.userId = decoded.id
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token has expired. Please log in again.'))
    }
    return next(new UnauthorizedError('Invalid authentication token.'))
  }
}
