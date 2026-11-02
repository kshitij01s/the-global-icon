import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAccessToken, type AuthUser, type Session } from './api'

interface AuthState {
  user: AuthUser | null
  /** true while the initial silent refresh is in flight */
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<AuthUser>
  register: (input: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<AuthUser>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((session: Session) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
    return session.user
  }, [])

  // The refresh token is an httpOnly cookie; try to restore a session silently.
  useEffect(() => {
    let alive = true
    api
      .refresh()
      .then((s) => alive && apply(s))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [apply])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (identifier, password) => apply(await api.login(identifier, password)),
      register: async (input) => apply(await api.register(input)),
      signOut: async () => {
        try {
          await api.logout()
        } finally {
          setAccessToken(null)
          setUser(null)
        }
      },
    }),
    [user, loading, apply],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
