import { FirebaseError } from 'firebase/app'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import Tocco from '../components/Tocco'
import { CORSO_DI_LAUREA, FESTEGGIATA, SOTTOTITOLO_SITO, TITOLO_SITO } from '../config'
import { useAuth } from './authContext'

function messaggioErrore(errore: unknown): string {
  if (errore instanceof FirebaseError) {
    switch (errore.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Nome utente o password non corretti.'
      case 'auth/invalid-email':
        return 'Il nome utente contiene caratteri non validi.'
      case 'auth/user-disabled':
        return 'Questo utente è stato disabilitato.'
      case 'auth/too-many-requests':
        return 'Troppi tentativi falliti. Aspetta qualche minuto e riprova.'
      case 'auth/network-request-failed':
        return 'Connessione assente: controlla la rete e riprova.'
      default:
        return `Accesso non riuscito (${errore.code}).`
    }
  }
  return 'Accesso non riuscito. Riprova.'
}

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setErrore('Inserisci nome utente e password.')
      return
    }
    setErrore(null)
    setInCorso(true)
    try {
      await login(username, password)
    } catch (err) {
      setErrore(messaggioErrore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-crema-100 px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <Tocco className="mx-auto mb-4 h-12 w-16 text-bordeaux-700" />
          <h1 className="text-3xl font-semibold text-bordeaux-800 sm:text-4xl">{TITOLO_SITO}</h1>
          <p className="mt-1 text-sm text-inchiostro/60">{SOTTOTITOLO_SITO}</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6">
          <div className="mb-4">
            <label htmlFor="username" className="field-label">
              Nome utente
            </label>
            <input
              id="username"
              className="field"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="es. ospiti"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              className="field"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errore && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errore}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={inCorso}>
            {inCorso ? 'Accesso in corso…' : 'Entra'}
          </button>

          <p className="mt-4 text-center text-xs text-inchiostro/50">
            Usa il nome utente e la password che ti sono stati dati nell'invito.
          </p>
        </form>

        <p className="mt-8 text-center text-xs text-inchiostro/45">
          {FESTEGGIATA} · {CORSO_DI_LAUREA}
        </p>
      </div>
    </div>
  )
}
