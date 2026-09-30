/**
 * Centralized API Client for FinTrack Frontend
 * Communicates with the Node.js/Express REST backend using native fetch.
 * Normalizes errors and preserves backend error codes, messages, and details.
 * Manages JWT Bearer token authentication.
 */

export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR', details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusCode = status
    this.code = code
    this.details = details
  }
}

let inMemoryToken = null

export function setAuthToken(token) {
  inMemoryToken = token
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      window.localStorage.setItem('fintrack_auth_token', token)
    } else {
      window.localStorage.removeItem('fintrack_auth_token')
    }
  }
}

export function getAuthToken() {
  if (inMemoryToken) return inMemoryToken
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('fintrack_auth_token')
  }
  return null
}

export function clearAuthToken() {
  inMemoryToken = null
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('fintrack_auth_token')
  }
}

/**
 * Resolves the API base URL from Vite or Node environment.
 */
export function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  }
  // In production builds, use relative /api for reverse proxy and custom domain compatibility
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    return '/api'
  }
  return 'http://localhost:5001/api'
}

/**
 * Executes an HTTP request against the FinTrack API.
 *
 * @param {string} endpoint - API endpoint relative to base URL (e.g. '/accounts' or 'accounts')
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>}
 */
export async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`

  const token = options.token || getAuthToken()

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(url, {
      credentials: options.credentials || 'include',
      ...options,
      headers,
    })
  } catch (netErr) {
    throw new ApiError(
      'Unable to connect to FinTrack API server. Please check your network or server status.',
      0,
      'NETWORK_ERROR',
      { originalError: netErr.message }
    )
  }

  // Parse response
  let data
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else {
    try {
      data = await response.text()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const errorObj = data && typeof data === 'object' && data.error ? data.error : null
    const message = errorObj?.message || (typeof data === 'string' && data) || response.statusText || 'Request failed'
    const code = errorObj?.code || (response.status === 404 ? 'NOT_FOUND' : response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR')
    const details = errorObj?.details || null
    throw new ApiError(message, response.status, code, details)
  }

  return data
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: (endpoint, options = {}) => request(endpoint, { method: 'DELETE', ...options }),
  setToken: setAuthToken,
  getToken: getAuthToken,
  clearToken: clearAuthToken,
}

export default apiClient
