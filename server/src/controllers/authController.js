import * as authService from '../services/authService.js'
import { config } from '../config/index.js'

/**
 * Returns hardened cookie options for authentication session storage.
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  }
}

/**
 * Auth Controller
 * Handles HTTP requests for user authentication.
 * Sets HttpOnly Secure cookies while also returning token for API clients.
 */

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body)
    res.cookie(config.cookieName, result.token, getCookieOptions())
    return res.status(201).json({
      data: result.user,
      token: result.token,
      message: 'User registered successfully.',
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body)
    res.cookie(config.cookieName, result.token, getCookieOptions())
    return res.status(200).json({
      data: result.user,
      token: result.token,
      message: 'Logged in successfully.',
    })
  } catch (error) {
    next(error)
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.userId)
    return res.status(200).json({ data: user })
  } catch (error) {
    next(error)
  }
}

export async function logout(req, res, next) {
  try {
    res.clearCookie(config.cookieName, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
    })
    return res.status(200).json({
      data: { success: true },
      message: 'Logged out successfully.',
    })
  } catch (error) {
    next(error)
  }
}
