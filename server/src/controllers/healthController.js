import { getHealthStatus } from '../services/healthService.js'

/**
 * Health Controller
 * Handles GET /api/health endpoint requests.
 */
export function getHealth(req, res, next) {
  try {
    const health = getHealthStatus()
    return res.status(200).json(health)
  } catch (error) {
    next(error)
  }
}
