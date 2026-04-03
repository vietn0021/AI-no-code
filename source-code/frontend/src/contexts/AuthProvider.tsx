import { useMemo, useState, type PropsWithChildren } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken: string) => {
        localStorage.setItem('access_token', nextToken)
        setToken(nextToken)
      },
      logout: () => {
        localStorage.removeItem('access_token')
        setToken(null)
      },
    }),
    [token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
