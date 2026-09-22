import { useState } from 'react'
import Loader from '../../components/Loader'
import { impronta, validaTesto, type DatiFrase, type Frase, TESTO_MAX } from './types'
import { messaggioErroreFirestore } from './useFrasi'

interface Props {
  frasi: Frase[]
  caricamento: boolean
  isAdmin: boolean
  modifica: (id: string, dati: DatiFrase) => Promise<void>
  elimina: (id: string) => Promise<void>
}

function dataLeggibile(frase: Frase): string {
  const quando = frase.createdAt?.toDate?.()
  if (!quando) return ''
  return quando.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

export default function PhraseList({ frasi, caricamento, isAdmin, modifica, elimina }: Props) {
  const [filtro, setFiltro] = useState('')
  const [inModifica, setInModifica] = useState<string | null>(null)
  const [daEliminare, setDaEliminare] = useState<string | null>(null)
  const [bozzaTesto, setBozzaTesto] = useState('')
  const [bozzaAutore, setBozzaAutore] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  const cercato = impronta(filtro)
  const visibili = cercato
    ? frasi.filter(
        (f) => impronta(f.testo).includes(cercato) || impronta(f.autore ?? '').includes(cercato),
      )
    : frasi

  function apriModifica(f: Frase) {
    setInModifica(f.id)
    setDaEliminare(null)
    setErrore(null)
    setBozzaTesto(f.testo)
    setBozzaAutore(f.autore ?? '')
  }

  async function salva(id: string) {
    const t = validaTesto(bozzaTesto)
    if (!t.ok) return setErrore(t.errore ?? null)
    try {
      await modifica(id, { testo: t.valore, autore: bozzaAutore.trim() })
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
      <h2 className="mb-4 text-2xl font-semibold text-bordeaux-800">
        Previsioni raccolte{' '}
        <span className="text-base font-normal text-inchiostro/50">({frasi.length})</span>
      </h2>

      {frasi.length > 6 && (
        <input
          className="field mb-4"
          placeholder="Cerca tra le previsioni…"
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
        <Loader testo="Carico le previsioni…" />
      ) : visibili.length === 0 ? (
        <p className="py-8 text-center text-sm text-inchiostro/55">
          {frasi.length === 0
            ? 'Ancora nessuna previsione: scrivine una qui accanto!'
            : 'Nessuna previsione corrisponde alla ricerca.'}
        </p>
      ) : (
        <ul className="divide-y divide-crema-200">
          {visibili.map((f) => (
            <li key={f.id} className="py-3">
              {inModifica === f.id ? (
                <div className="space-y-2">
                  <textarea
                    className="field min-h-20 resize-y"
                    value={bozzaTesto}
                    maxLength={TESTO_MAX}
                    onChange={(e) => setBozzaTesto(e.target.value)}
                  />
                  <input
                    className="field"
                    placeholder="Autore"
                    value={bozzaAutore}
                    onChange={(e) => setBozzaAutore(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => salva(f.id)}>
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
                    <p className="text-sm text-inchiostro/90">{f.testo}</p>
                    <p className="mt-1 text-xs text-inchiostro/45">
                      {f.autore ? f.autore : 'anonimo'}
                      {dataLeggibile(f) && ` · ${dataLeggibile(f)}`}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => apriModifica(f)}>
                        Modifica
                      </button>
                      {daEliminare === f.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            className="btn-danger px-2 py-1 text-xs"
                            onClick={() => conferma(f.id)}
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
                          onClick={() => setDaEliminare(f.id)}
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
