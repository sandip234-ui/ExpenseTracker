import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

/**
 * Validates production environment configuration.
 * Throws a fatal exception if mandatory production secrets are absent or weak.
 */
export function validateEnvironmentConfig(env = process.env) {
  const currentEnv = env.NODE_ENV || nodeEnv
  if (currentEnv === 'production') {
    if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
      throw new Error(
        '[FATAL CONFIG ERROR] In production, JWT_SECRET must be set to a cryptographically secure key of at least 32 characters.'
      )
    }
    if (env.JWT_SECRET.includes('dev_key') || env.JWT_SECRET === 'your-super-secret-jwt-key-here') {
      throw new Error(
        '[FATAL CONFIG ERROR] In production, JWT_SECRET cannot use default or development placeholder keys.'
      )
    }
    if (!env.DATABASE_URL) {
      throw new Error('[FATAL CONFIG ERROR] In production, DATABASE_URL must be configured.')
    }
  }
}

// Validate on load
validateEnvironmentConfig(process.env)

// Determine client origins (supports comma-separated list of production domains)
const rawOrigins = process.env.CLIENT_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const parsedOrigins = rawOrigins.includes(',')
  ? rawOrigins.split(',').map((o) => o.trim())
  : [rawOrigins.trim()]

// In development, warn if fallback secret is used
let secret = process.env.JWT_SECRET
if (!secret) {
  if (isProduction) {
    throw new Error('[FATAL CONFIG ERROR] Missing JWT_SECRET in production.')
  }
  secret = 'fintrack_jwt_secret_dev_key_super_secure_2026_safe'
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv,
  isProduction,
  clientOrigin: parsedOrigins,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: secret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'fintrack_token',
}

export default config
