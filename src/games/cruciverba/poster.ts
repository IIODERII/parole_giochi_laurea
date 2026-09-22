import { MM_PER_PUNTO } from '../shared/stampa'
import type { Cruciverba } from './generator'

export type FormatoFoglio = 'a4' | 'a3'

/** Misure del foglio in millimetri. */
const FOGLI: Record<FormatoFoglio, { larghezza: number; altezza: number }> = {
  a4: { larghezza: 210, altezza: 297 },
  a3: { larghezza: 297, altezza: 420 },
}

export { MM_PER_PUNTO }

export const TITOLO_POSTER = 'CruciSara'

/**
 * Spezza il testo in righe che stanno dentro la larghezza data (in mm).
 * Ogni formato di uscita ha il suo: jsPDF e il canvas misurano diversamente.
 */
export interface Misuratore {
  (testo: string, larghezzaMax: number, dimensione: number): string[]
}

export interface CellaPoster {
  x: number
  y: number
  numero: number | null
}

export interface ColonnaPoster {
  titolo: string
  x: number
  blocchi: string[][]
}

/** Tutte le posizioni gia' calcolate, in millimetri. */
export interface Poster {
  larghezza: number
  altezza: number
  margine: number
  centro: number
  titolo: { testo: string; y: number; dimensione: number }
  sottotitolo: { testo: string; y: number; dimensione: number }
  linea: { x1: number; x2: number; y: number }
  lato: number
  celle: CellaPoster[]
  dimensioneNumero: number
  yColonne: number
  colonne: ColonnaPoster[]
  dimensioneTesto: number
  interlinea: number
}

/** Sotto questa dimensione le definizioni diventano faticose da leggere. */
const TESTO_COMODO: Record<FormatoFoglio, number> = { a4: 8, a3: 10 }
/** Sotto questo lato non ci si scrive dentro una lettera a mano. */
const CELLA_MINIMA: Record<FormatoFoglio, number> = { a4: 7, a3: 9 }

export function calcolaPoster(
  cruciverba: Cruciverba,
  formato: FormatoFoglio,
  misura: Misuratore,
): Poster {
  const foglio = FOGLI[formato]
  const grande = formato === 'a3'
  const margine = grande ? 18 : 13
  const utile = foglio.larghezza - margine * 2
  const centro = foglio.larghezza / 2

  const titolo = {
    testo: TITOLO_POSTER,
    y: margine + (grande ? 15 : 11),
    dimensione: grande ? 48 : 34,
  }
  const sottotitolo = {
    testo: ``,
    y: titolo.y + (grande ? 10 : 8),
    dimensione: grande ? 15 : 12,
  }
  const linea = {
    x1: centro - (grande ? 34 : 25),
    x2: centro + (grande ? 34 : 25),
    y: sottotitolo.y + (grande ? 5 : 4),
  }

  const yGriglia = linea.y + (grande ? 13 : 10)
  const spazio = grande ? 10 : 7
  const larghezzaColonna = (utile - spazio) / 2

  /** Compone griglia e definizioni a partire dal lato scelto per le caselle. */
  function componi(lato: number) {
    const celle: CellaPoster[] = []
    const xGriglia = centro - (lato * cruciverba.larghezza) / 2
    for (let r = 0; r < cruciverba.altezza; r++) {
      for (let c = 0; c < cruciverba.larghezza; c++) {
        const cella = cruciverba.celle[r][c]
        if (!cella) continue
        celle.push({ x: xGriglia + c * lato, y: yGriglia + r * lato, numero: cella.numero })
      }
    }

    const yColonne = yGriglia + lato * cruciverba.altezza + (grande ? 13 : 10)
    const disponibile = foglio.altezza - margine - yColonne - 4
    const base = grande ? 14 : 11

    let dimensioneTesto = base
    let orizzontali: string[][] = []
    let verticali: string[][] = []

    for (const prova of [base, base - 1, base - 2, base - 3, base - 4, 7, 6]) {
      dimensioneTesto = prova
      orizzontali = cruciverba.orizzontali.map((p) =>
        misura(`${p.numero}. ${p.definizione}`, larghezzaColonna, prova),
      )
      verticali = cruciverba.verticali.map((p) =>
        misura(`${p.numero}. ${p.definizione}`, larghezzaColonna, prova),
      )
      const interlinea = prova * MM_PER_PUNTO * 1.25
      const altezzaDi = (blocchi: string[][]) =>
        blocchi.reduce((tot, righe) => tot + righe.length, 0) * interlinea +
        blocchi.length * interlinea * 0.3 +
        interlinea * 2.2
      if (Math.max(altezzaDi(orizzontali), altezzaDi(verticali)) <= disponibile) break
    }

    return { lato, celle, yColonne, dimensioneTesto, orizzontali, verticali }
  }

  let composizione = componi(0)
  if (cruciverba.larghezza > 0) {
    const spazioGriglia = (foglio.altezza - yGriglia - margine) * 0.62
    const naturale = Math.min(
      utile / cruciverba.larghezza,
      spazioGriglia / cruciverba.altezza,
      grande ? 17 : 12,
    )
    const minimo = Math.min(naturale, CELLA_MINIMA[formato])

    // Se le definizioni finirebbero troppo piccole, si restringe la griglia
    // (fino al minimo scrivibile) invece di rimpicciolire il testo.
    const passi = 6
    for (let i = 0; i <= passi; i++) {
      composizione = componi(naturale - ((naturale - minimo) * i) / passi)
      if (composizione.dimensioneTesto >= TESTO_COMODO[formato]) break
    }
  }

  return {
    larghezza: foglio.larghezza,
    altezza: foglio.altezza,
    margine,
    centro,
    titolo,
    sottotitolo,
    linea,
    lato: composizione.lato,
    celle: composizione.celle,
    // il numerino dentro la casella: circa un quarto del lato, convertito in punti
    dimensioneNumero: Math.max(4, Math.min(11, (composizione.lato * 0.26) / MM_PER_PUNTO)),
    yColonne: composizione.yColonne,
    colonne: [
      { titolo: 'ORIZZONTALI', x: margine, blocchi: composizione.orizzontali },
      { titolo: 'VERTICALI', x: margine + larghezzaColonna + spazio, blocchi: composizione.verticali },
    ],
    dimensioneTesto: composizione.dimensioneTesto,
    interlinea: composizione.dimensioneTesto * MM_PER_PUNTO * 1.25,
  }
}
