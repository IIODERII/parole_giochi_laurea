import { useMemo, useState } from 'react'
import {
  AUTORE_MAX,
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

interface Scartata {
  riga: string
  motivo: string
}

/** Toglie elenchi puntati e numerati, così si può incollare una lista com'è. */
function pulisciRiga(riga: string): string {
  return riga.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').trim()
}

/** Divide il testo incollato in frasi buone e frasi da scartare, col motivo. */
function analizza(grezzo: string, esistenti: Frase[]) {
  const giaPresenti = new Set(esistenti.map((f) => impronta(f.testo)))
  const buone: string[] = []
  const scartate: Scartata[] = []

  for (const riga of grezzo.split(/\r?\n/).map(pulisciRiga)) {
    if (!riga) continue
    const t = validaTesto(riga)
    if (!t.ok) {
      scartate.push({ riga, motivo: t.errore ?? 'non valida' })
      continue
    }
    const chiave = impronta(t.valore)
    if (giaPresenti.has(chiave)) {
      scartate.push({ riga, motivo: 'c’è già' })
      continue
    }
    giaPresenti.add(chiave)
    buone.push(t.valore)
  }

  return { buone, scartate }
}

async function copiaNegliAppunti(testo: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(testo)
  } catch {
    // senza https (o su browser vecchi) le API degli appunti non ci sono
    const area = document.createElement('textarea')
    area.value = testo
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    if (!ok) throw new Error('copia non riuscita')
  }
}

export default function GestioneFrasi({ frasi, aggiungi }: Props) {
  const [copiato, setCopiato] = useState<string | null>(null)
  const [elenco, setElenco] = useState('')
  const [autore, setAutore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState<string | null>(null)

  const { buone, scartate } = useMemo(() => analizza(elenco, frasi), [elenco, frasi])

  async function copiaTutte() {
    // dalla più vecchia alla più nuova, una per riga
    const testo = [...frasi].reverse().map((f) => f.testo).join('\n')
    try {
      await copiaNegliAppunti(testo)
      setCopiato(`Copiate ${frasi.length} previsioni.`)
    } catch {
      setCopiato('Non sono riuscito a copiare: riprova da un altro browser.')
    }
    setTimeout(() => setCopiato(null), 3000)
  }

  async function inserisci() {
    setConferma(null)
    const a = validaAutore(autore)
    if (!a.ok) return setErrore(a.errore ?? null)

    setErrore(null)
    setInCorso(true)
    let fatte = 0
    try {
      // una alla volta, così restano nell'ordine in cui sono state incollate
      for (const testo of buone) {
        await aggiungi({ testo, autore: a.valore })
        fatte++
      }
      setElenco('')
      setConferma(`Aggiunte ${fatte} previsioni.`)
    } catch (err) {
      setElenco(buone.slice(fatte).join('\n'))
      setErrore(
        `${messaggioErroreFirestore(err)} Aggiunte ${fatte} su ${buone.length}: ` +
          'nel riquadro sono rimaste quelle mancanti.',
      )
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-bordeaux-800">Gestione previsioni</h2>
        <span className="rounded-full bg-bordeaux-50 px-2.5 py-1 text-xs font-semibold text-bordeaux-700">
          solo per te
        </span>
      </div>
      <p className="mb-5 text-sm text-inchiostro/60">
        Copia tutte le previsioni, una per riga, oppure incollane tante insieme.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={copiaTutte}
          disabled={frasi.length === 0}
        >
          Copia tutte ({frasi.length})
        </button>
        {copiato && <span className="text-sm text-inchiostro/65">{copiato}</span>}
      </div>

      <div className="space-y-4 border-t border-crema-200 pt-5">
        <div>
          <label htmlFor="elenco-frasi" className="field-label">
            Aggiungi più previsioni
          </label>
          <textarea
            id="elenco-frasi"
            className="field min-h-40 resize-y"
            value={elenco}
            onChange={(e) => setElenco(e.target.value)}
            placeholder={'Una previsione per riga\nSara piange durante il discorso\nLo zio chiede quando si sposa'}
          />
          {elenco.trim() && (
            <p className="mt-1.5 text-xs text-inchiostro/55">
              {buone.length} da aggiungere
              {scartate.length > 0 && `, ${scartate.length} scartate`}
            </p>
          )}
        </div>

        {scartate.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-oro-200 bg-crema-50 p-3 text-xs">
            {scartate.map((s, i) => (
              <li key={i} className="text-inchiostro/70">
                <span className="font-semibold text-bordeaux-700">{s.motivo}</span> · {s.riga}
              </li>
            ))}
          </ul>
        )}

        <div>
          <label htmlFor="autore-elenco" className="field-label">
            Autore per tutte <span className="font-normal text-inchiostro/45">(facoltativo)</span>
          </label>
          <input
            id="autore-elenco"
            className="field"
            value={autore}
            onChange={(e) => setAutore(e.target.value)}
            placeholder="lascia vuoto per anonimo"
            maxLength={AUTORE_MAX}
          />
        </div>

        {errore && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errore}
          </p>
        )}
        {conferma && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {conferma}
          </p>
        )}

        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          onClick={inserisci}
          disabled={inCorso || buone.length === 0}
        >
          {inCorso
            ? 'Salvataggio…'
            : buone.length > 0
              ? `Aggiungi ${buone.length} al bingo`
              : 'Aggiungi al bingo'}
        </button>
      </div>
    </section>
  )
}
