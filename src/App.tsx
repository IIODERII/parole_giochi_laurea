import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import LoginPage from './auth/LoginPage'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import { giochiAttivi } from './games/registry'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    // HashRouter: gli indirizzi diventano .../#/cruciverba, cosi' il sito
    // funziona anche su GitHub Pages senza dare 404 al ricaricamento.
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              {giochiAttivi.map((gioco) => (
                <Route key={gioco.id} path={gioco.percorso} element={<gioco.Componente />} />
              ))}
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
