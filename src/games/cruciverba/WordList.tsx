import { useState } from 'react'
import Loader from '../../components/Loader'
import { normalizzaParola, validaDefinizione, validaParola } from './normalize'
import type { DatiParola, Parola } from './types'
import { messaggioErroreFirestore } from './useParole'

interface Props {
  parole: Parola[]
  caricamento: boolean
  isAdmin: boolean
  modifica: (id: string, dati: DatiParola) => Promise<void>
  elimina: (id: string) => Promise<void>
}

function dataLeggibile(parola: Parola): string {
  const quando = parola.createdAt?.toDate?.()
  if (!quando) return ''
  return quando.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

export default function WordList({ parole, caricamento, isAdmin, modifica, elimina }: Props) {
  const [filtro, setFiltro] = useState('')
  const [inModifica, setInModifica] = useState<string | null>(null)
  const [daEliminare, setDaEliminare] = useState<string | null>(null)
  const [bozzaParola, setBozzaParola] = useState('')
  const [bozzaDefinizione, setBozzaDefinizione] = useState('')
  const [bozzaAutore, setBozzaAutore] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  const cercato = normalizzaParola(filtro)
  const visibili = cercato
    ? parole.filter(
        (p) =>
          normalizzaParola(p.parola).includes(cercato) ||
          normalizzaParola(p.definizione).includes(cercato) ||
          normalizzaParola(p.autore ?? '').includes(cercato),
      )
    : parole

  function apriModifica(p: Parola) {
    setInModifica(p.id)
    setDaEliminare(null)
    setErrore(null)
    setBozzaParola(p.parola)
    setBozzaDefinizione(p.definizione)
    setBozzaAutore(p.autore ?? '')
  }

  async function salva(id: string) {
    const p = validaParola(bozzaParola)
    if (!p.ok) return setErrore(p.errore ?? null)
    const d = validaDefinizione(bozzaDefinizione)
    if (!d.ok) return setErrore(d.errore ?? null)
    try {
      await modifica(id, { parola: p.valore, definizione: d.valore, autore: bozzaAutore.trim() })
      setInModifica(null)
      setErrore(null)
    } catch (err) {
      setErrore(messaggioErroreFirestore(err))
    }
  }

  async function conferma(id: string) {
    try {
      await elimina(id)
      setDaEliminare(null)
      setErrore(null)
    } catch (err) {
      setErrore(messaggioErroreFirestore(err))
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-bordeaux-800">
          Parole inserite{' '}
          <span className="text-base font-normal text-inchiostro/50">({parole.length})</span>
        </h2>
      </div>

      {parole.length > 6 && (
        <input
          className="field mb-4"
          placeholder="Cerca tra le parole…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      )}

      {errore && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errore}
        </p>
      )}

      {caricamento ? (
        <Loader testo="Carico le parole…" />
      ) : visibili.length === 0 ? (
        <p className="py-8 text-center text-sm text-inchiostro/55">
          {parole.length === 0
            ? 'Ancora nessuna parola: sii il primo a inserirne una!'
            : 'Nessuna parola corrisponde alla ricerca.'}
        </p>
      ) : (
        <ul className="divide-y divide-crema-200">
          {visibili.map((p) => (
            <li key={p.id} className="py-3">
              {inModifica === p.id ? (
                <div className="space-y-2">
                  <input
                    className="field uppercase"
                    value={bozzaParola}
                    onChange={(e) => setBozzaParola(e.target.value)}
                  />
                  <textarea
                    className="field min-h-20 resize-y"
                    value={bozzaDefinizione}
                    onChange={(e) => setBozzaDefinizione(e.target.value)}
                  />
                  <input
                    className="field"
                    placeholder="Autore"
                    value={bozzaAutore}
                    onChange={(e) => setBozzaAutore(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => salva(p.id)}>
                      Salva
                    </button>
                    <button className="btn-ghost" onClick={() => setInModifica(null)}>
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-semibold tracking-wide text-bordeaux-700">
                      {normalizzaParola(p.parola)}
                    </p>
                    <p className="mt-0.5 text-sm text-inchiostro/85">{p.definizione}</p>
                    <p className="mt-1 text-xs text-inchiostro/45">
                      {p.autore ? p.autore : 'anonimo'}
                      {dataLeggibile(p) && ` · ${dataLeggibile(p)}`}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => apriModifica(p)}
                      >
                        Modifica
                      </button>
                      {daEliminare === p.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            className="btn-danger px-2 py-1 text-xs"
                            onClick={() => conferma(p.id)}
                          >
                            Confermi?
                          </button>
                          <button
                            className="btn-ghost px-2 py-1 text-xs"
                            onClick={() => setDaEliminare(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          className="btn-ghost px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => setDaEliminare(p.id)}
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
