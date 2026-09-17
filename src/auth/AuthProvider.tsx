import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ADMIN_EMAIL, emailToUsername, usernameToEmail } from '../config'
import { auth } from '../firebase'
import { AuthContext, type AuthState } from './authContext'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (utente) => {
      setUser(utente)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      username: emailToUsername(user?.email),
      isAdmin: (user?.email ?? '').toLowerCase() === ADMIN_EMAIL,
      loading,
      login: async (username: string, password: string) => {
        await signInWithEmailAndPassword(auth, usernameToEmail(username), password)
      },
      logout: async () => {
        await signOut(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
