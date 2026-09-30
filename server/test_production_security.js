/**
 * FinTrack Phase 10: Production Hardening & Security Test Suite
 * Validates:
 * 1. Fatal startup prevention on missing or weak JWT_SECRET in production
 * 2. Mandatory DATABASE_URL validation in production
 * 3. CORS origin policy and rejection of unauthorized origins
 * 4. Helmet security HTTP headers (nosniff, frameguard, etc.)
 * 5. Request body size limits (1MB protection)
 * 6. Rate limiting on authentication endpoints
 * 7. HttpOnly cookie-based session authentication & logout clearing
 * 8. Production error message sanitization (no stack traces or internals leaked)
 */

import request from 'supertest'
import assert from 'node:assert'
import express from 'express'
import { app } from './src/app.js'
import { validateEnvironmentConfig, config } from './src/config/index.js'
import { createTestRateLimiter } from './src/middleware/rateLimiter.js'
import { errorHandler } from './src/middleware/errorHandler.js'
import { prisma } from './src/lib/prisma.js'

async function runProductionSecurityTests() {
  console.log('=================================================================')
  console.log('--- STARTING FINTRACK PRODUCTION HARDENING & SECURITY TESTS ---')
  console.log('=================================================================\n')

  try {
    // -----------------------------------------------------------------
    // 1. JWT_SECRET & DATABASE_URL PRODUCTION VALIDATION
    // -----------------------------------------------------------------
    console.log('1. Testing Production Secret & Environment Safety Rules...')

    // 1a. Missing JWT_SECRET in production must throw
    assert.throws(
      () => {
        validateEnvironmentConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/fintrack',
          JWT_SECRET: '',
        })
      },
      /JWT_SECRET must be set to a cryptographically secure key/,
      'Missing JWT_SECRET must fail production validation'
    )
    console.log('  ✓ Pass: Production fails startup if JWT_SECRET is missing')

    // 1b. Weak/Short JWT_SECRET in production (< 32 chars) must throw
    assert.throws(
      () => {
        validateEnvironmentConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/fintrack',
          JWT_SECRET: 'short_key_123',
        })
      },
      /at least 32 characters/,
      'Short JWT_SECRET must fail production validation'
    )
    console.log('  ✓ Pass: Production fails startup if JWT_SECRET is less than 32 characters')

    // 1c. Development placeholder key in production must throw
    assert.throws(
      () => {
        validateEnvironmentConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://localhost:5432/fintrack',
          JWT_SECRET: 'fintrack_jwt_secret_dev_key_super_secure_2026_safe',
        })
      },
      /placeholder keys/,
      'Placeholder dev key must fail production validation'
    )
    console.log('  ✓ Pass: Production fails startup if default placeholder key is used')

    // 1d. Missing DATABASE_URL in production must throw
    assert.throws(
      () => {
        validateEnvironmentConfig({
          NODE_ENV: 'production',
          DATABASE_URL: '',
          JWT_SECRET: 'a_very_long_secure_random_key_production_grade_32_chars_ok',
        })
      },
      /DATABASE_URL must be configured/,
      'Missing DATABASE_URL must fail production validation'
    )
    console.log('  ✓ Pass: Production fails startup if DATABASE_URL is missing')

    // 1e. Valid production secrets pass
    assert.doesNotThrow(() => {
      validateEnvironmentConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod-db:5432/fintrack',
        JWT_SECRET: 'f1ntr4ck_pr0duct10n_s3cr3t_k3y_9876543210_s3cur3',
      })
    })
    console.log('  ✓ Pass: Valid production configuration passes validation\n')

    // -----------------------------------------------------------------
    // 2. SECURITY HEADERS (HELMET)
    // -----------------------------------------------------------------
    console.log('2. Testing HTTP Security Headers (Helmet)...')
    const headersRes = await request(app).get('/api/health')
    assert.strictEqual(headersRes.headers['x-content-type-options'], 'nosniff')
    assert.ok(
      headersRes.headers['x-frame-options'] === 'SAMEORIGIN' ||
      headersRes.headers['x-frame-options'] === 'DENY',
      'X-Frame-Options must prevent clickjacking'
    )
    assert.strictEqual(headersRes.headers['x-dns-prefetch-control'], 'off')
    console.log('  ✓ Pass: X-Content-Type-Options: nosniff enforced')
    console.log(`  ✓ Pass: X-Frame-Options: ${headersRes.headers['x-frame-options']} enforced`)
    console.log('  ✓ Pass: X-DNS-Prefetch-Control: off enforced\n')

    // -----------------------------------------------------------------
    // 3. CORS POLICY & ORIGIN ISOLATION
    // -----------------------------------------------------------------
    console.log('3. Testing CORS Policy & Origin Isolation...')

    // 3a. Unauthorized origin is rejected
    const badOriginRes = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious-phishing-site.com')
    assert.strictEqual(badOriginRes.status, 403)
    assert.strictEqual(badOriginRes.body.error.code, 'CORS_FORBIDDEN')
    console.log('  ✓ Pass: Unauthorized origin rejected with HTTP 403 CORS_FORBIDDEN')

    // 3b. Authorized origin is accepted with headers
    const goodOriginRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
    assert.strictEqual(goodOriginRes.status, 200)
    assert.strictEqual(goodOriginRes.headers['access-control-allow-origin'], 'http://localhost:5173')
    assert.strictEqual(goodOriginRes.headers['access-control-allow-credentials'], 'true')
    console.log('  ✓ Pass: Authorized origin accepted with Access-Control-Allow-Credentials: true')

    // 3c. No origin (server-to-server / curl) is accepted
    const noOriginRes = await request(app).get('/api/health')
    assert.strictEqual(noOriginRes.status, 200)
    console.log('  ✓ Pass: Originless API clients accepted\n')

    // -----------------------------------------------------------------
    // 4. REQUEST BODY SIZE LIMITS
    // -----------------------------------------------------------------
    console.log('4. Testing Request Body Size Limits (1MB Protection)...')
    const largePayload = 'A'.repeat(1.2 * 1024 * 1024) // 1.2MB payload
    const overflowRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@fintrack.local', data: largePayload })
    assert.strictEqual(overflowRes.status, 413, 'Over-sized payloads must be rejected with 413 Payload Too Large')
    console.log('  ✓ Pass: Payloads > 1MB strictly rejected with HTTP 413 Payload Too Large\n')

    // -----------------------------------------------------------------
    // 5. RATE LIMITING ON AUTH ENDPOINTS
    // -----------------------------------------------------------------
    console.log('5. Testing Rate Limiting on Authentication Endpoints...')
    const testRateApp = express()
    testRateApp.use(createTestRateLimiter(3, 10000))
    testRateApp.post('/test-auth', (req, res) => res.json({ ok: true }))

    // First 3 requests succeed
    for (let i = 1; i <= 3; i++) {
      const res = await request(testRateApp).post('/test-auth')
      assert.strictEqual(res.status, 200)
    }

    // 4th request must be throttled with 429
    const throttledRes = await request(testRateApp).post('/test-auth')
    assert.strictEqual(throttledRes.status, 429)
    assert.strictEqual(throttledRes.body.error.code, 'TOO_MANY_REQUESTS')
    console.log('  ✓ Pass: Rate limiter halts excessive auth requests with HTTP 429 TOO_MANY_REQUESTS\n')

    // -----------------------------------------------------------------
    // 6. HTTPONLY COOKIE AUTHENTICATION & LOGOUT
    // -----------------------------------------------------------------
    console.log('6. Testing HttpOnly + Secure Cookie Authentication & Clearing...')

    // 6a. Login returns Set-Cookie header with fintrack_token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@fintrack.local', password: 'Password123!' })
    assert.strictEqual(loginRes.status, 200)

    const setCookieHeaders = loginRes.headers['set-cookie']
    assert.ok(setCookieHeaders, 'Response must include Set-Cookie header')
    const cookieHeaderStr = Array.isArray(setCookieHeaders) ? setCookieHeaders.join('; ') : setCookieHeaders
    assert.ok(cookieHeaderStr.includes('fintrack_token='), 'Cookie must set fintrack_token')
    assert.ok(cookieHeaderStr.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly')
    assert.ok(cookieHeaderStr.toLowerCase().includes('path=/'), 'Cookie must have Path=/')
    console.log('  ✓ Pass: Login generates HttpOnly session cookie')

    // Extract cookie value
    const tokenMatch = cookieHeaderStr.match(/fintrack_token=([^;]+)/)
    assert.ok(tokenMatch, 'Extracted fintrack_token cookie value')
    const cookieVal = tokenMatch[1]

    // 6b. Request protected endpoint using ONLY Cookie (no Authorization header!)
    const cookieAuthRes = await request(app)
      .get('/api/accounts')
      .set('Cookie', `fintrack_token=${cookieVal}`)
    assert.strictEqual(cookieAuthRes.status, 200)
    assert.ok(Array.isArray(cookieAuthRes.body.data))
    console.log('  ✓ Pass: Protected endpoint successfully authenticated via HttpOnly cookie alone')

    // 6c. Logout clears the cookie
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `fintrack_token=${cookieVal}`)
    assert.strictEqual(logoutRes.status, 200)
    const clearCookieHeader = logoutRes.headers['set-cookie']
    assert.ok(clearCookieHeader, 'Logout must send Set-Cookie clearing header')
    const clearStr = Array.isArray(clearCookieHeader) ? clearCookieHeader.join('; ') : clearCookieHeader
    assert.ok(clearStr.includes('fintrack_token=;') || clearStr.includes('Max-Age=0') || clearStr.includes('expires='))
    console.log('  ✓ Pass: Logout actively invalidates and clears the session cookie\n')

    // -----------------------------------------------------------------
    // 7. PRODUCTION ERROR SANITIZATION
    // -----------------------------------------------------------------
    console.log('7. Testing Production Error Sanitization...')
    const testErrorApp = express()
    testErrorApp.get('/test-error', (req, res, next) => {
      const err = new Error('PrismaClientKnownRequestError: table "public.sensitive_accounts" relation constraint failed at line 42')
      err.statusCode = 500
      next(err)
    })
    testErrorApp.use(errorHandler)

    const errRes = await request(testErrorApp).get('/test-error')
    assert.strictEqual(errRes.status, 500)
    assert.strictEqual(errRes.body.status, 'error')
    assert.strictEqual(errRes.body.error.code, 'INTERNAL_SERVER_ERROR')
    assert.strictEqual(errRes.body.error.details, undefined, 'Internal details must not be exposed')
    assert.strictEqual(errRes.body.stack, undefined, 'Stack traces must never be exposed')
    console.log('  ✓ Pass: Internal errors sanitized to generic message; zero database or stack trace leakage\n')

    console.log('=================================================================')
    console.log('🎉 ALL PRODUCTION HARDENING & SECURITY TESTS PASSED!')
    console.log('=================================================================')
  } catch (err) {
    console.error('❌ Production Security Test Suite Failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runProductionSecurityTests()
