'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import type { AuthUser, SignInBody, SignUpBody } from '@/lib/types'

type AuthContextValue = {
  isAuthenticated: boolean
  user: AuthUser | null
  signIn: (body: SignInBody) => Promise<AuthUser>
  signUp: (body: SignUpBody) => Promise<AuthUser>
  signOut: () => Promise<void>
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
  initialAuthenticated,
}: {
  children: ReactNode
  initialAuthenticated: boolean
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated)
  const [user, setUser] = useState<AuthUser | null>(null)

  const signIn = useCallback(async (body: SignInBody) => {
    const res = await api.signIn(body)
    setUser(res.user)
    setIsAuthenticated(true)
    return res.user
  }, [])

  const signUp = useCallback(async (body: SignUpBody) => {
    const res = await api.signUp(body)
    setUser(res.user)
    setIsAuthenticated(true)
    return res.user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.signOut()
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, user, signIn, signUp, signOut, setUser }),
    [isAuthenticated, user, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
