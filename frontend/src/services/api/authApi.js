import apiClient, { setAuthToken, clearAuthToken } from './apiClient.js'

/**
 * Authentication API Client
 */
export const authApi = {
  async login({ email, password }) {
    const res = await apiClient.post('/auth/login', { email, password })
    if (res?.token) {
      setAuthToken(res.token)
    }
    return res
  },

  async register({ email, password, name }) {
    const res = await apiClient.post('/auth/register', { email, password, name })
    if (res?.token) {
      setAuthToken(res.token)
    }
    return res
  },

  async getMe() {
    const res = await apiClient.get('/auth/me')
    return res?.data || res
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken()
    }
    return { success: true }
  },
}

export default authApi
