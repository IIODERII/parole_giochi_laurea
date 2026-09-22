import { useEffect, useState, type FormEvent } from 'react'
import { leggiAutore, salvaAutore } from '../shared/autore'
import {
  AUTORE_MAX,
  TESTO_COMODO,
  TESTO_MAX,
  impronta,
  validaAutore,
  validaTesto,
  type DatiFrase,
  type Frase,
} from './types'
import { messaggioErroreFirestore } from './useFrasi'

interface Props {
  frasi: Frase[]
  aggiungi: (dati: DatiFrase) => Promise<void>
}

export default function PhraseForm({ frasi, aggiungi }: Props) {
  const [testo, setTesto] = useState('')
  const [autore, setAutore] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => setAutore(leggiAutore()), [])

  const rimasti = TESTO_MAX - testo.trim().length
  const lunghetta = testo.trim().length > TESTO_COMODO

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setConferma(null)

    const t = validaTesto(testo)
    if (!t.ok) return setErrore(t.errore ?? null)

    const a = validaAutore(autore)
    if (!a.ok) return setErrore(a.errore ?? null)

    if (frasi.some((altra) => impronta(altra.testo) === impronta(t.valore))) {
      return setErrore('Questa previsione l’ha già scritta qualcun altro. Provane un’altra!')
    }

    setErrore(null)
    setInCorso(true)
    try {
      await aggiungi({ testo: t.valore, autore: a.valore })
      salvaAutore(a.valore)
      setTesto('')
      setConferma('Previsione aggiunta. Ora speriamo che si avveri!')
    } catch (err) {
      setErrore(messaggioErroreFirestore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="mb-1 text-2xl font-semibold text-bordeaux-800">Cosa succederà stasera?</h2>
      <p className="mb-5 text-sm text-inchiostro/60">
        Scrivi una cosa che secondo te capiterà durante la festa. Finirà nelle cartelle del bingo
        che gireranno fra i tavoli.
      </p>

      <div className="mb-4">
        <label htmlFor="frase" className="field-label">
          La tua previsione
        </label>
        <textarea
          id="frase"
          className="field min-h-20 resize-y"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="es. Qualcuno chiede a Sara cosa sono le scienze nutraceutiche"
          maxLength={TESTO_MAX}
        />
        <p
          className={`mt-1.5 text-xs ${lunghetta ? 'text-bordeaux-600' : 'text-inchiostro/50'}`}
        >
          {lunghetta
            ? `Ancora ${rimasti} caratteri, ma più è corta meglio si legge nella casella.`
            : `Ancora ${rimasti} caratteri.`}
        </p>
      </div>

      <div className="mb-5">
        <label htmlFor="autore-bingo" className="field-label">
          Il tuo nome <span className="font-normal text-inchiostro/45">(facoltativo)</span>
        </label>
        <input
          id="autore-bingo"
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
        {inCorso ? 'Salvataggio…' : 'Aggiungi al bingo'}
      </button>
    </form>
  )
}
