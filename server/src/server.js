import { app } from './app.js'
import { config } from './config/index.js'
import prisma from './lib/prisma.js'

const server = app.listen(config.port, () => {
  console.log(`[FinTrack API] Server running on port ${config.port} in ${config.nodeEnv} mode`)
  console.log(`[FinTrack API] Health check available at http://localhost:${config.port}/api/health`)
})

// Graceful shutdown handling
let isShuttingDown = false

async function handleShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n[FinTrack API] Received ${signal}. Initiating graceful shutdown...`)

  // Force close after 10s if graceful termination hangs
  const forceTimer = setTimeout(() => {
    console.error('[FinTrack API] Graceful shutdown timed out. Forcing process exit.')
    process.exit(1)
  }, 10000)
  forceTimer.unref()

  server.close(async () => {
    console.log('[FinTrack API] HTTP server connections closed.')
    try {
      await prisma.$disconnect()
      console.log('[FinTrack API] PostgreSQL database connection pool closed cleanly.')
    } catch (dbErr) {
      console.error('[FinTrack API] Error disconnecting PostgreSQL:', dbErr.message)
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

export default server
