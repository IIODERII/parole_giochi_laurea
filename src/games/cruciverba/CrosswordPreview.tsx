import { useState } from 'react'
import { scaricaImmagine } from './exportImage'
import { scaricaPdf } from './exportPdf'
import type { Cruciverba, MotivoScarto } from './generator'
import type { FormatoFoglio } from './poster'

const LATO = 34

const MOTIVI: Record<MotivoScarto, string> = {
  duplicata: 'già presente',
  lunghezza: 'lunghezza non adatta',
  'nessun-incastro': 'non si incastra con le altre',
}

interface Props {
  cruciverba: Cruciverba
  isAdmin: boolean
  onRigenera: () => void
}

export default function CrosswordPreview({ cruciverba, isAdmin, onRigenera }: Props) {
  // parte sempre nascosto: ricaricando la pagina lo spoiler torna coperto
  const [visibile, setVisibile] = useState(false)
  const [soluzioni, setSoluzioni] = useState(true)
  const [formato, setFormato] = useState<FormatoFoglio>('a4')
  const [esportazione, setEsportazione] = useState<'pdf' | 'png' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function esporta(tipo: 'pdf' | 'png') {
    setErrore(null)
    setEsportazione(tipo)
    try {
      if (tipo === 'pdf') await scaricaPdf(cruciverba, formato)
      else await scaricaImmagine(cruciverba, formato)
    } catch {
      setErrore('Non sono riuscito a creare il file. Riprova.')
    } finally {
      setEsportazione(null)
    }
  }

  if (!visibile) {
    return (
      <section className="card border-dashed border-oro-300 bg-oro-100/40 p-6 text-center">
        <p className="text-3xl">🤫</p>
        <h2 className="mt-2 text-2xl font-semibold text-bordeaux-800">Attenzione, spoiler!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-inchiostro/70">
          Qui sotto c'è il cruciverba già risolto, con tutte le parole al loro posto. Se vuoi
          giocarci alla festa senza sapere niente, meglio non guardare.
        </p>
        <button className="btn-secondary mt-5" onClick={() => setVisibile(true)}>
          Mostra comunque il cruciverba
        </button>
      </section>
    )
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-bordeaux-800">Anteprima del cruciverba</h2>
          <p className="text-sm text-inchiostro/60">
            {cruciverba.piazzate.length} parole incastrate · griglia {cruciverba.larghezza} ×{' '}
            {cruciverba.altezza}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => setSoluzioni((v) => !v)}
          >
            {soluzioni ? 'Nascondi le lettere' : 'Mostra le lettere'}
          </button>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setVisibile(false)}>
            Nascondi il cruciverba
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-oro-200 bg-crema-50 p-3">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={onRigenera}>
            Rigenera griglia
          </button>

          <span className="ml-1 text-xs text-inchiostro/55">Formato:</span>
          <div className="flex overflow-hidden rounded-lg border border-bordeaux-300">
            {(['a4', 'a3'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormato(f)}
                className={`cursor-pointer px-3 py-2 text-xs font-semibold transition ${
                  formato === f
                    ? 'bg-bordeaux-700 text-crema-50'
                    : 'bg-white text-bordeaux-700 hover:bg-bordeaux-50'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            className="btn-primary px-3 py-2 text-xs"
            disabled={esportazione !== null || cruciverba.piazzate.length === 0}
            onClick={() => esporta('pdf')}
          >
            {esportazione === 'pdf' ? 'Creo il PDF…' : 'Scarica PDF'}
          </button>
          <button
            className="btn-primary px-3 py-2 text-xs"
            disabled={esportazione !== null || cruciverba.piazzate.length === 0}
            onClick={() => esporta('png')}
          >
            {esportazione === 'png' ? 'Creo l immagine…' : 'Scarica immagine'}
          </button>

          {errore && <span className="text-xs text-red-700">{errore}</span>}
        </div>
      )}

      {cruciverba.piazzate.length === 0 ? (
        <p className="py-8 text-center text-sm text-inchiostro/55">
          Servono almeno un paio di parole per costruire il cruciverba.
        </p>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto pb-2">
            <svg
              viewBox={`0 0 ${cruciverba.larghezza * LATO} ${cruciverba.altezza * LATO}`}
              width={cruciverba.larghezza * LATO}
              height={cruciverba.altezza * LATO}
              className="mx-auto block h-auto max-w-none"
              style={{ minWidth: cruciverba.larghezza * 22 }}
              role="img"
              aria-label="Griglia del cruciverba"
            >
              {cruciverba.celle.map((riga, r) =>
                riga.map((cella, c) =>
                  cella ? (
                    <g key={`${r}-${c}`}>
                      <rect
                        x={c * LATO}
                        y={r * LATO}
                        width={LATO}
                        height={LATO}
                        fill="#ffffff"
                        stroke="#c9a227"
                        strokeWidth="1"
                      />
                      {cella.numero !== null && (
                        <text
                          x={c * LATO + 3}
                          y={r * LATO + 10}
                          fontSize="9"
                          fill="#9c2f4e"
                          fontFamily="Inter, sans-serif"
                        >
                          {cella.numero}
                        </text>
                      )}
                      {soluzioni && (
                        <text
                          x={c * LATO + LATO / 2}
                          y={r * LATO + LATO * 0.74}
                          fontSize="17"
                          textAnchor="middle"
                          fill="#2b2320"
                          fontWeight="600"
                          fontFamily="Inter, sans-serif"
                        >
                          {cella.lettera}
                        </text>
                      )}
                    </g>
                  ) : null,
                ),
              )}
            </svg>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              { titolo: 'Orizzontali', elenco: cruciverba.orizzontali },
              { titolo: 'Verticali', elenco: cruciverba.verticali },
            ].map((gruppo) => (
              <div key={gruppo.titolo}>
                <h3 className="mb-2 border-b border-oro-200 pb-1 text-lg font-semibold text-bordeaux-800">
                  {gruppo.titolo}
                </h3>
                <ol className="space-y-1.5 text-sm">
                  {gruppo.elenco.map((p) => (
                    <li key={p.id} className="flex gap-2">
                      <span className="shrink-0 font-semibold text-bordeaux-600">{p.numero}.</span>
                      <span className="text-inchiostro/85">{p.definizione}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && cruciverba.scartate.length > 0 && (
        <div className="mt-6 rounded-lg border border-oro-300 bg-oro-100/50 p-4">
          <h3 className="text-sm font-semibold text-bordeaux-800">
            Parole rimaste fuori ({cruciverba.scartate.length})
          </h3>
          <p className="mt-1 text-xs text-inchiostro/60">
            Visibile solo a te. Puoi modificarle o eliminarle dall'elenco.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {cruciverba.scartate.map((s) => (
              <li key={s.voce.id} className="flex flex-wrap gap-x-2">
                <span className="font-mono font-semibold text-bordeaux-700">{s.voce.parola}</span>
                <span className="text-inchiostro/55">— {MOTIVI[s.motivo]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
