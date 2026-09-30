import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config/index.js'
import apiRouter from './routes/index.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // API server does not render HTML
      crossOriginEmbedderPolicy: false,
    })
  )

  // 2. Strict CORS Configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true)

      const allowedOrigins = Array.isArray(config.clientOrigin)
        ? config.clientOrigin
        : [config.clientOrigin]

      if (
        allowedOrigins.includes(origin) ||
        (!config.isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1')))
      ) {
        return callback(null, true)
      }

      const corsError = new Error(`CORS error: Origin "${origin}" is not authorized.`)
      corsError.statusCode = 403
      corsError.code = 'CORS_FORBIDDEN'
      return callback(corsError)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }
  app.use(cors(corsOptions))

  // 3. Cookie Parsing
  app.use(cookieParser())

  // 4. Request Body Size Limits (1mb protection against memory exhaustion)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // 5. Mount API Routes
  app.use('/api', apiRouter)

  // 6. 404 Handler for Unmatched Routes
  app.use(notFoundHandler)

  // 7. Centralized Error Handling & Sanitization
  app.use(errorHandler)

  return app
}

export const app = createApp()
export default app
