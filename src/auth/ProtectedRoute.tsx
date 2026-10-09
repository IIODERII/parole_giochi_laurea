import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import { useAuth } from './authContext'

export default function ProtectedRoute() {
  const { user, loading, isAnonimo } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader testo="Un attimo…" />
      </div>
    )
  }

  // gli ospiti entrati dal QR restano nel loro gioco: il resto del sito
  // richiede utente e password
  if (user && isAnonimo) {
    return <Navigate to="/gioca" replace />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
