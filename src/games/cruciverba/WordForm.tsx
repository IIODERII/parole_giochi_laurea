import { useEffect, useState, type FormEvent } from 'react'
import { leggiAutore, salvaAutore } from '../shared/autore'
import {
  AUTORE_MAX,
  DEFINIZIONE_MAX,
  normalizzaParola,
  validaAutore,
  validaDefinizione,
  validaParola,
} from './normalize'
import type { DatiParola, Parola } from './types'
import { messaggioErroreFirestore } from './useParole'

interface Props {
  parole: Parola[]
  aggiungi: (dati: DatiParola) => Promise<void>
}

export default function WordForm({ parole, aggiungi }: Props) {
  const [parola, setParola] = useState('')
  const [definizione, setDefinizione] = useState('')
  const [autore, setAutore] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => setAutore(leggiAutore()), [])

  const anteprima = normalizzaParola(parola)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setConferma(null)

    const p = validaParola(parola)
    if (!p.ok) return setErrore(p.errore ?? null)

    const d = validaDefinizione(definizione)
    if (!d.ok) return setErrore(d.errore ?? null)

    const a = validaAutore(autore)
    if (!a.ok) return setErrore(a.errore ?? null)

    if (parole.some((altra) => normalizzaParola(altra.parola) === p.valore)) {
      return setErrore(`"${p.valore}" è già stata inserita da qualcuno. Provane un'altra!`)
    }

    setErrore(null)
    setInCorso(true)
    try {
      await aggiungi({ parola: p.valore, definizione: d.valore, autore: a.valore })
      salvaAutore(a.valore)
      setParola('')
      setDefinizione('')
      setConferma(`"${p.valore}" aggiunta al cruciverba. Grazie!`)
    } catch (err) {
      setErrore(messaggioErroreFirestore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="mb-1 text-2xl font-semibold text-bordeaux-800">Aggiungi una parola</h2>
      <p className="mb-5 text-sm text-inchiostro/60">
        Una parola legata a Sara, ai suoi studi o a un vostro ricordo, con la sua definizione.
      </p>

      <div className="mb-4">
        <label htmlFor="parola" className="field-label">
          Parola
        </label>
        <input
          id="parola"
          className="field uppercase"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
          placeholder="es. Nutraceutica"
          autoComplete="off"
          maxLength={40}
        />
        {anteprima && (
          <p className="mt-1.5 text-xs text-inchiostro/55">
            Nel cruciverba diventa{' '}
            <span className="font-mono font-semibold tracking-wider text-bordeaux-700">
              {anteprima}
            </span>{' '}
            ({anteprima.length} lettere)
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="definizione" className="field-label">
          Definizione
        </label>
        <textarea
          id="definizione"
          className="field min-h-24 resize-y"
          value={definizione}
          onChange={(e) => setDefinizione(e.target.value)}
          placeholder="Come la spiegheresti a chi deve indovinarla?"
          maxLength={DEFINIZIONE_MAX}
        />
      </div>

      <div className="mb-5">
        <label htmlFor="autore" className="field-label">
          Il tuo nome <span className="font-normal text-inchiostro/45">(facoltativo)</span>
        </label>
        <input
          id="autore"
          className="field"
          value={autore}
          onChange={(e) => setAutore(e.target.value)}
          placeholder="es. Marco"
          autoComplete="name"
          maxLength={AUTORE_MAX}
        />
      </div>

      {errore && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errore}
        </p>
      )}
      {conferma && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {conferma}
        </p>
      )}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={inCorso}>
        {inCorso ? 'Salvataggio…' : 'Aggiungi al cruciverba'}
      </button>
    </form>
  )
}
