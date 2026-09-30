/**
 * Health Service
 * Provides health status and operational metrics for the FinTrack API.
 */
export function getHealthStatus() {
  return {
    status: 'ok',
    service: 'FinTrack API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }
}
