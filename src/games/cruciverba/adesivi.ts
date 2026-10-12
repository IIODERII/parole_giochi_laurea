import { mescola, mulberry32 } from '../shared/random'
import { MM_PER_PUNTO, righeDefinizioni, type FormatoFoglio, type Poster } from './poster'

/**
 * Le foto di Sara gia' scontornate, col bordo bianco da adesivo: si
 * appiccicano negli spazi liberi del cartellone, senza coprire caselle e
 * definizioni.
 */
const FILE = Object.values(
  import.meta.glob('./adesivi/*.webp', { eager: true, query: '?url', import: 'default' }),
) as string[]

/** Lato lungo dell'adesivo, in mm: oltre il massimo ruberebbe la scena. */
const LATO: Record<FormatoFoglio, { min: number; max: number }> = {
  a4: { min: 24, max: 52 },
  a3: { min: 32, max: 72 },
}
/** Distanza minima dal bordo del foglio: le stampanti non arrivano fino in fondo. */
const BORDO_FOGLIO = 5
/** Aria fra un adesivo e il resto. */
const DISTANZA = 2
/** Inclinazione massima, in gradi, per l'effetto "attaccato a mano". */
const INCLINAZIONE = 11

export interface Adesivo {
  immagine: HTMLImageElement
  /** Centro e misure dell'immagine dritta, in mm. */
  cx: number
  cy: number
  larghezza: number
  altezza: number
  /** In radianti. */
  angolo: number
  /** Il rettangolo che contiene l'adesivo inclinato. */
  x: number
  y: number
  ingombroL: number
  ingombroA: number
}

function carica(url: string): Promise<HTMLImageElement> {
  return new Promise((risolvi, rifiuta) => {
    const immagine = new Image()
    immagine.onload = () => risolvi(immagine)
    immagine.onerror = () => rifiuta(new Error(`Foto non trovata: ${url}`))
    immagine.src = url
  })
}

export function caricaAdesivi(): Promise<HTMLImageElement[]> {
  return Promise.all(FILE.map(carica))
}

/**
 * Mappa del foglio a quadretti di 1 mm: 1 dove c'e' gia' qualcosa.
 * Le misure dei testi sono stimate per eccesso, meglio un po' di aria in piu'.
 */
function mappaOccupata(poster: Poster) {
  const L = Math.ceil(poster.larghezza)
  const A = Math.ceil(poster.altezza)
  const occupata = new Uint8Array(L * A)

  const segna = (x: number, y: number, l: number, a: number, aria = DISTANZA) => {
    const x0 = Math.max(0, Math.floor(x - aria))
    const y0 = Math.max(0, Math.floor(y - aria))
    const x1 = Math.min(L, Math.ceil(x + l + aria))
    const y1 = Math.min(A, Math.ceil(y + a + aria))
    for (let r = y0; r < y1; r++) occupata.fill(1, r * L + x0, r * L + x1)
  }

  // fascia lungo il bordo del foglio
  segna(0, 0, L, BORDO_FOGLIO, 0)
  segna(0, A - BORDO_FOGLIO, L, BORDO_FOGLIO, 0)
  segna(0, 0, BORDO_FOGLIO, A, 0)
  segna(L - BORDO_FOGLIO, 0, BORDO_FOGLIO, A, 0)

  // intestazione: larghezza stimata da numero di lettere e corpo
  for (const t of [poster.titolo, poster.sottotitolo]) {
    if (!t.testo) continue
    const corpo = t.dimensione * MM_PER_PUNTO
    const l = t.testo.length * corpo * 0.55
    segna(poster.centro - l / 2, t.y - corpo * 0.8, l, corpo)
  }
  segna(poster.linea.x1, poster.linea.y - 1, poster.linea.x2 - poster.linea.x1, 2)

  for (const cella of poster.celle) segna(cella.x, cella.y, poster.lato, poster.lato)

  const corpo = (poster.dimensioneTesto + 1) * MM_PER_PUNTO
  for (const riga of righeDefinizioni(poster)) {
    if (riga.pagina > 0) continue
    const colonna = poster.colonne.find((c) => c.x === riga.x)
    segna(riga.x, riga.y - corpo * 0.85, colonna?.larghezza ?? 0, corpo * 1.15)
  }

  return { occupata, L, A }
}

/**
 * Sceglie dove attaccare gli adesivi: per ognuno cerca la misura piu' grande
 * che sta in uno spazio libero e, fra i posti possibili, quello piu' lontano
 * dagli adesivi gia' messi, cosi' si spargono per tutto il foglio.
 */
export function disponiAdesivi(
  poster: Poster,
  formato: FormatoFoglio,
  immagini: HTMLImageElement[],
  seme: number,
): Adesivo[] {
  const random = mulberry32(seme * 104729 + 7)
  const { occupata, L, A } = mappaOccupata(poster)
  const lato = LATO[formato]

  // somme cumulate: dicono in un colpo solo se un rettangolo e' tutto libero
  const somme = new Int32Array((L + 1) * (A + 1))
  const ricalcola = () => {
    for (let y = 0; y < A; y++) {
      let riga = 0
      for (let x = 0; x < L; x++) {
        riga += occupata[y * L + x]
        somme[(y + 1) * (L + 1) + x + 1] = somme[y * (L + 1) + x + 1] + riga
      }
    }
  }
  const libero = (x: number, y: number, l: number, a: number) =>
    somme[(y + a) * (L + 1) + x + l] -
      somme[y * (L + 1) + x + l] -
      somme[(y + a) * (L + 1) + x] +
      somme[y * (L + 1) + x] ===
    0

  const ordine = immagini.slice()
  mescola(ordine, random)
  const messi: Adesivo[] = []
  ricalcola()

  for (const immagine of ordine) {
    const proporzione = immagine.naturalWidth / immagine.naturalHeight
    const angolo = ((random() * 2 - 1) * INCLINAZIONE * Math.PI) / 180
    const cos = Math.abs(Math.cos(angolo))
    const sin = Math.abs(Math.sin(angolo))

    for (let misura = lato.max; misura >= lato.min; misura -= 1) {
      const larghezza = proporzione >= 1 ? misura : misura * proporzione
      const altezza = proporzione >= 1 ? misura / proporzione : misura
      const l = Math.ceil(larghezza * cos + altezza * sin)
      const a = Math.ceil(larghezza * sin + altezza * cos)

      let migliore: { x: number; y: number; punteggio: number } | null = null
      for (let y = 0; y + a <= A; y++) {
        for (let x = 0; x + l <= L; x++) {
          if (!libero(x, y, l, a)) continue
          const cx = x + l / 2
          const cy = y + a / 2
          const lontananza = messi.length
            ? Math.min(...messi.map((m) => Math.hypot(m.cx - cx, m.cy - cy)))
            : 0
          const punteggio = lontananza + random() * 15
          if (!migliore || punteggio > migliore.punteggio) migliore = { x, y, punteggio }
        }
      }
      if (!migliore) continue

      messi.push({
        immagine,
        cx: migliore.x + l / 2,
        cy: migliore.y + a / 2,
        larghezza,
        altezza,
        angolo,
        x: migliore.x,
        y: migliore.y,
        ingombroL: l,
        ingombroA: a,
      })
      for (let r = Math.max(0, migliore.y - DISTANZA); r < Math.min(A, migliore.y + a + DISTANZA); r++) {
        occupata.fill(1, r * L + Math.max(0, migliore.x - DISTANZA), r * L + Math.min(L, migliore.x + l + DISTANZA))
      }
      ricalcola()
      break
    }
  }

  return messi
}

/** Disegna l'adesivo inclinato su un canvas che lavora in millimetri. */
export function disegnaAdesivo(ctx: CanvasRenderingContext2D, adesivo: Adesivo) {
  ctx.save()
  ctx.translate(adesivo.cx, adesivo.cy)
  ctx.rotate(adesivo.angolo)
  ctx.drawImage(
    adesivo.immagine,
    -adesivo.larghezza / 2,
    -adesivo.altezza / 2,
    adesivo.larghezza,
    adesivo.altezza,
  )
  ctx.restore()
}

/**
 * Per il PDF l'adesivo inclinato diventa un PNG gia' ruotato. Trasparente e
 * non JPEG su fondo bianco: alcuni lettori disegnano il bordo del riquadro
 * come una riga grigia.
 */
export function adesivoComePng(adesivo: Adesivo, dpi = 300): string {
  const scala = dpi / 25.4
  const tela = document.createElement('canvas')
  tela.width = Math.round(adesivo.ingombroL * scala)
  tela.height = Math.round(adesivo.ingombroA * scala)
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Il browser non permette di elaborare le foto')
  ctx.scale(scala, scala)
  disegnaAdesivo(ctx, {
    ...adesivo,
    cx: adesivo.cx - adesivo.x,
    cy: adesivo.cy - adesivo.y,
  })
  return tela.toDataURL('image/png')
}
