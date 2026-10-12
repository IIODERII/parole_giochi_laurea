import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Loader from '../../components/Loader'
import { MM_PER_PUNTO } from '../shared/stampa'
import {
  calcolaMisure,
  caricaFontTitolo,
  COLORI,
  corniceComePng,
  dimensioniFrasi,
  disponi,
  FONT_TITOLO,
  INTERLINEA,
  spezzaConCanvas,
  type Disposizione,
  type Scritta,
} from './cartella'
import type { Cartella, FormaCartella } from './generator'

interface Props {
  /** Tutte le cartelle: la dimensione del testo si sceglie su tutte, come nel PDF. */
  cartelle: Cartella[]
  forma: FormaCartella
  perFoglio: number
  quante: number
}

interface Pronta {
  chiave: string
  d: Disposizione
  cornice: string
}

/**
 * Le cartelle come usciranno dalla stampante: stessa cornice del PDF (a
 * risoluzione da schermo) con sopra i testi, in proporzione alla cartella.
 */
export default function AnteprimaCartelle({ cartelle, forma, perFoglio, quante }: Props) {
  const chiave = `${forma.colonne}x${forma.righe}-${perFoglio}`
  const [pronta, setPronta] = useState<Pronta | null>(null)
  const [errore, setErrore] = useState(false)

  useEffect(() => {
    let attivo = true
    caricaFontTitolo()
      .then(() => {
        if (!attivo) return
        const d = disponi(calcolaMisure({ colonne: forma.colonne, righe: forma.righe }, perFoglio), {
          colonne: forma.colonne,
          righe: forma.righe,
        })
        setPronta({ chiave, d, cornice: corniceComePng(d, 'fronte', 110) })
        setErrore(false)
      })
      .catch(() => attivo && setErrore(true))
    return () => {
      attivo = false
    }
  }, [chiave, forma.colonne, forma.righe, perFoglio])

  const dimensioni = useMemo(
    () =>
      pronta
        ? dimensioniFrasi(cartelle.flatMap((c) => c.caselle), pronta.d.testi[0], spezzaConCanvas())
        : null,
    [pronta, cartelle],
  )

  if (errore) return null
  if (!pronta || pronta.chiave !== chiave || !dimensioni) return <Loader testo="Preparo l'anteprima…" />

  const { d, cornice } = pronta
  const larga = d.larghezza / d.altezza > 1.3
  // misure in percentuale della cartella e caratteri in proporzione alla larghezza
  const px = (x: number) => `${(x / d.larghezza) * 100}%`
  const py = (y: number) => `${(y / d.altezza) * 100}%`
  const corpo = (punti: number) => `${((punti * MM_PER_PUNTO) / d.larghezza) * 100}cqw`

  const scritta = (s: Scritta): CSSProperties => ({
    position: 'absolute',
    left: px(s.x),
    top: py(s.y),
    transform: `translate(${s.allinea === 'center' ? '-50%' : '0'}, -80%)`,
    fontFamily: `"${FONT_TITOLO}", Georgia, serif`,
    fontSize: corpo(s.dimensione),
    lineHeight: 1,
    color: COLORI.bordeaux,
    whiteSpace: 'nowrap',
  })

  const mostrate = cartelle.slice(0, Math.min(4, quante))

  return (
    <>
      <p className="mb-2 text-xs font-semibold text-inchiostro/50">
        Anteprima delle prime {mostrate.length} cartelle
      </p>
      <div className={`grid gap-4 ${larga ? '' : 'sm:grid-cols-2'}`}>
        {mostrate.map((cartella) => (
          <div
            key={cartella.numero}
            className="relative w-full overflow-hidden shadow-sm"
            style={{
              aspectRatio: `${d.larghezza} / ${d.altezza}`,
              containerType: 'inline-size',
              backgroundImage: `url(${cornice})`,
              backgroundSize: '100% 100%',
            }}
          >
            <span style={scritta(d.titolo)}>{d.titolo.testo}</span>
            <span style={scritta(d.sottotitolo)}>Cartella n. {cartella.numero}</span>
            <span style={scritta(d.nome)}>{d.nome.testo}</span>

            {cartella.caselle.map((testo, i) => {
              const t = d.testi[i]
              return (
                <div
                  key={i}
                  className="absolute flex items-center justify-center text-center"
                  style={{
                    left: px(t.x),
                    top: py(t.y),
                    width: px(t.l),
                    height: py(t.a),
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    fontSize: corpo(dimensioni.dimensionePer(testo)),
                    lineHeight: INTERLINEA,
                    color: COLORI.inchiostro,
                  }}
                >
                  {testo}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
