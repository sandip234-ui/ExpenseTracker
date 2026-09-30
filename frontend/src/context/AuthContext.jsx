import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, getAuthToken, clearAuthToken } from '../services/api/index.js'
import { isApiMode } from '../services/dataProvider/config.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => getAuthToken())
  const [isLoading, setIsLoading] = useState(true)

  // Verify active session on mount
  useEffect(() => {
    async function initAuth() {
      if (!isApiMode()) {
        // In local-only mode, mock local user
        setUser({ id: 'local-user', email: 'local@fintrack.offline', name: 'Offline User' })
        setIsLoading(false)
        return
      }

      try {
        const profile = await authApi.getMe()
        setUser(profile)
        setToken(getAuthToken())
      } catch {
        clearAuthToken()
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    if (!isApiMode()) {
      const mock = { id: 'local-user', email, name: email.split('@')[0] }
      setUser(mock)
      return { user: mock }
    }

    const res = await authApi.login({ email, password })
    setUser(res.data)
    setToken(res.token)
    return res
  }, [])

  const register = useCallback(async (email, password, name) => {
    if (!isApiMode()) {
      const mock = { id: 'local-user', email, name }
      setUser(mock)
      return { user: mock }
    }

    const res = await authApi.register({ email, password, name })
    setUser(res.data)
    setToken(res.token)
    return res
  }, [])

  const logout = useCallback(async () => {
    try {
      if (isApiMode()) {
        await authApi.logout()
      }
    } finally {
      clearAuthToken()
      setUser(null)
      setToken(null)
    }
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
    }
  }
  return context
}
