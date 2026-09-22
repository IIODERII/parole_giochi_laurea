import { useMemo, useState } from 'react'
import {
  scaricaCartelle,
  stimaStampa,
  TITOLO_BINGO,
  type CartellePerFoglio,
  type LatoRilegatura,
} from './exportCartelle'
import { fraseNecessarie, generaCartelle } from './generator'
import type { Frase } from './types'

const COLONNE = [3, 4, 5, 6]
const RIGHE = [2, 3, 4, 5]
const PER_FOGLIO: CartellePerFoglio[] = [1, 2, 3, 4, 6, 8]
const ANTEPRIMA_MAX = 4

function Scelta<T extends string | number>({
  valore,
  opzioni,
  onChange,
  etichetta,
}: {
  valore: T
  opzioni: readonly T[]
  onChange: (v: T) => void
  etichetta: (v: T) => string
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-bordeaux-300">
      {opzioni.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`flex-1 cursor-pointer px-2.5 py-2 text-xs font-semibold transition ${
            valore === o
              ? 'bg-bordeaux-700 text-crema-50'
              : 'bg-white text-bordeaux-700 hover:bg-bordeaux-50'
          }`}
        >
          {etichetta(o)}
        </button>
      ))}
    </div>
  )
}

interface Props {
  frasi: Frase[]
}

export default function CardsPanel({ frasi }: Props) {
  const [colonne, setColonne] = useState(5)
  const [righe, setRighe] = useState(3)
  const [quante, setQuante] = useState(40)
  const [perFoglio, setPerFoglio] = useState<CartellePerFoglio>(3)
  const [regole, setRegole] = useState(true)
  const [rilegatura, setRilegatura] = useState<LatoRilegatura>('lungo')
  const [seme, setSeme] = useState(1)
  const [inCorso, setInCorso] = useState(false)
  const [errorePdf, setErrorePdf] = useState<string | null>(null)

  const forma = useMemo(() => ({ colonne, righe }), [colonne, righe])
  const esito = useMemo(
    () => generaCartelle(frasi, { colonne, righe, quante, seme }),
    [frasi, colonne, righe, quante, seme],
  )
  const stima = useMemo(
    () => stimaStampa(forma, perFoglio, quante),
    [forma, perFoglio, quante],
  )

  const necessarie = fraseNecessarie(forma)

  async function esporta() {
    setErrorePdf(null)
    setInCorso(true)
    try {
      await scaricaCartelle(esito.cartelle, { forma, perFoglio, regole, rilegatura })
    } catch {
      setErrorePdf('Non sono riuscito a creare il PDF. Riprova.')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold text-bordeaux-800">Cartelle da stampare</h2>
        <span className="rounded-full bg-bordeaux-50 px-2.5 py-1 text-xs font-semibold text-bordeaux-700">
          solo per te
        </span>
      </div>
      <p className="mb-5 text-sm text-inchiostro/60">
        Le cartelle si costruiscono dalle previsioni raccolte, distribuite in parti uguali. Ogni
        cartella è diversa dalle altre.
      </p>

      <div className="mb-5 grid gap-4 rounded-lg border border-oro-200 bg-crema-50 p-4 sm:grid-cols-2">
        <div>
          <span className="field-label">Colonne</span>
          <Scelta valore={colonne} opzioni={COLONNE} onChange={setColonne} etichetta={(v) => String(v)} />
        </div>
        <div>
          <span className="field-label">Righe</span>
          <Scelta valore={righe} opzioni={RIGHE} onChange={setRighe} etichetta={(v) => String(v)} />
        </div>

        <div>
          <span className="field-label">Cartelle per foglio A4</span>
          <Scelta
            valore={perFoglio}
            opzioni={PER_FOGLIO}
            onChange={setPerFoglio}
            etichetta={(v) => String(v)}
          />
        </div>

        <div>
          <label htmlFor="quante" className="field-label">
            Quante cartelle
          </label>
          <input
            id="quante"
            type="number"
            min={1}
            max={100}
            className="field w-28"
            value={quante}
            onChange={(e) => setQuante(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          />
        </div>

        <div className="space-y-2 border-t border-oro-200 pt-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-inchiostro/75">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#7b1e3a]"
              checked={regole}
              onChange={(e) => setRegole(e.target.checked)}
            />
            Stampa le regole sul retro di ogni cartella
          </label>
          {regole && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-inchiostro/55">
                La stampante gira il foglio sul lato
              </span>
              <div className="w-44">
                <Scelta
                  valore={rilegatura}
                  opzioni={['lungo', 'corto'] as const}
                  onChange={setRilegatura}
                  etichetta={(v) => (v === 'lungo' ? 'lungo' : 'corto')}
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-inchiostro/55 sm:col-span-2">
          {necessarie} caselle da riempire
          {stima &&
            ` · cartella ${stima.larghezzaCartella.toFixed(0)}×${stima.altezzaCartella.toFixed(
              0,
            )} mm, casella ${stima.cella.toFixed(1)} mm · ${
              regole ? stima.fogli * 2 : stima.fogli
            } facciate da stampare`}
        </p>
      </div>

      {esito.errore ? (
        <p className="rounded-lg border border-oro-300 bg-oro-100/60 px-4 py-3 text-sm text-bordeaux-800">
          {esito.errore}
        </p>
      ) : (
        <>
          {esito.avviso && (
            <p className="mb-4 rounded-lg border border-oro-300 bg-oro-100/50 px-4 py-2.5 text-xs text-inchiostro/70">
              {esito.avviso}
            </p>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => setSeme((s) => s + 1)}
            >
              Rimescola le cartelle
            </button>
            <button className="btn-primary px-3 py-2 text-xs" disabled={inCorso} onClick={esporta}>
              {inCorso ? 'Creo il PDF…' : `Scarica ${quante} cartelle in PDF`}
            </button>
            {errorePdf && <span className="text-xs text-red-700">{errorePdf}</span>}
          </div>

          <p className="mb-2 text-xs font-semibold text-inchiostro/50">
            Anteprima delle prime {Math.min(ANTEPRIMA_MAX, esito.cartelle.length)} cartelle
          </p>
          <div className={`grid gap-4 ${colonne >= 5 ? '' : 'sm:grid-cols-2'}`}>
            {esito.cartelle.slice(0, ANTEPRIMA_MAX).map((cartella) => (
              <div key={cartella.numero} className="rounded-lg border border-oro-300 bg-white p-3">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-display text-base font-semibold text-bordeaux-700">
                    {TITOLO_BINGO}
                  </span>
                  <span className="text-[10px] text-inchiostro/45">n. {cartella.numero}</span>
                </div>
                <div
                  className="grid gap-px bg-crema-300"
                  style={{ gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))` }}
                >
                  {cartella.caselle.map((testo, i) => (
                    <div
                      key={i}
                      className="flex aspect-square flex-col items-center justify-center gap-1 bg-white p-1 text-center text-[9px] leading-tight text-inchiostro/85"
                    >
                      <span>{testo}</span>
                      <span className="h-2 w-2 shrink-0 rounded-full border border-inchiostro/35" />
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 border-t border-crema-200 pt-1 text-[10px] italic text-inchiostro/40">
                  Nome: ______________
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
