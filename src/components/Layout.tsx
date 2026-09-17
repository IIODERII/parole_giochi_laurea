import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { CORSO_DI_LAUREA, FESTEGGIATA, TITOLO_SITO } from '../config'
import { giochiAttivi } from '../games/registry'
import Tocco from './Tocco'

export default function Layout() {
  const { username, isAdmin, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-bordeaux-800 text-crema-50 shadow-md">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <Tocco className="h-7 w-9 shrink-0 text-oro-400" />
              <span className="truncate font-display text-xl font-semibold sm:text-2xl">
                {TITOLO_SITO}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-crema-50/70 sm:inline">
                {username}
                {isAdmin && ' · admin'}
              </span>
              <button
                onClick={() => logout()}
                className="rounded-lg border border-crema-50/30 px-3 py-1.5 text-xs font-semibold
                           transition hover:bg-crema-50/10"
              >
                Esci
              </button>
            </div>
          </div>

          {giochiAttivi.length > 1 && (
            <nav className="mt-3 flex flex-wrap gap-2">
              {giochiAttivi.map((gioco) => (
                <NavLink
                  key={gioco.id}
                  to={gioco.percorso}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-oro-400 text-bordeaux-900'
                        : 'bg-crema-50/10 text-crema-50 hover:bg-crema-50/20'
                    }`
                  }
                >
                  {gioco.titolo}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="h-1 bg-oro-500" />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-crema-300 bg-crema-50 py-5 text-center text-xs text-inchiostro/45">
        {FESTEGGIATA} · {CORSO_DI_LAUREA}
      </footer>
    </div>
  )
}
