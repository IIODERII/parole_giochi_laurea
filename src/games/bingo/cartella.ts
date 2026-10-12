import { MM_PER_PUNTO } from '../shared/stampa'
import urlFontTitolo from './font/DMSerifDisplay-Regular.ttf?url'
import type { FormaCartella } from './generator'

/**
 * Aspetto della cartella stampata, ricalcato sul modello grafico: fondo
 * crema, cornice bordeaux con filo oro e angoli scavati, linguetta in alto
 * col tocco, alloro ai lati del titolo, caselle arrotondate con il
 * quadratino da barrare a cavallo del bordo.
 *
 * Tutte le misure del modello sono espresse in "u": una cartella larga 100u
 * ha le proporzioni dell'originale, poi tutto scala con la cartella.
 */

export const TITOLO_BINGO = 'BingoSara'
export const FONT_TITOLO = 'DM Serif Display'

export const COLORI = {
  bordeaux: '#7b1e3a',
  bordeauxScuro: '#5f162c',
  crema: '#f8f3ea',
  casella: '#fdfbf7',
  oro: '#c9ab72',
  oroFilo: '#d4b483',
  inchiostro: '#2b2320',
  carta: '#fffdf8',
}

const U = {
  banda: 3.3,
  tacca: 4,
  filo: 0.9,
  testata: 28.7,
  piede: 11.8,
  lati: 6.6,
  spazioL: 2.1,
  spazioA: 3.2,
  casellina: 3.3,
  linguetta: 14.8,
  yTitolo: 18,
  ySottotitolo: 25,
  dimTitolo: 32,
  dimSottotitolo: 13,
  dimNome: 11,
  larghezzaNome: 55,
  /** Sul retro le regole partono sotto il tocco della linguetta. */
  retroSopra: 11.5,
  retroLati: 2.5,
}

const PAGINA = { larghezza: 210, altezza: 297 }
/** Margine di sicurezza per la stampa: sotto i 10 mm molte stampanti tagliano. */
export const MARGINE = 10
/** Spazio fra una cartella e l'altra, per avere dove passare con le forbici. */
export const DISTANZA = 6
/** Sotto questa larghezza titolo e decorazioni non ci stanno. */
const LARGHEZZA_MINIMA = 55
/** Caselle al massimo cosi' larghe rispetto all'altezza, e viceversa. */
const PROPORZIONE_MAX = 2.2
const PROPORZIONE_MIN = 0.9

export { PAGINA }

export interface Misure {
  colonnePagina: number
  righePagina: number
  larghezzaCartella: number
  altezzaCartella: number
  u: number
  cellaL: number
  cellaA: number
}

/**
 * Sceglie come disporre le cartelle sul foglio. Si provano tutte le
 * combinazioni di righe e colonne e si tiene quella con le caselle piu'
 * capienti: con cartelle larghe e basse conviene impilarle, con quelle
 * quadrate affiancarle. Le caselle possono essere piu' larghe che alte, cosi'
 * le frasi vanno meno a capo.
 */
export function calcolaMisure(forma: FormaCartella, perFoglio: number): Misure {
  const utileL = PAGINA.larghezza - MARGINE * 2
  const utileA = PAGINA.altezza - MARGINE * 2
  let migliore: (Misure & { area: number }) | null = null

  for (let colonnePagina = 1; colonnePagina <= perFoglio; colonnePagina++) {
    if (perFoglio % colonnePagina !== 0) continue
    const righePagina = perFoglio / colonnePagina

    const disponibileL = (utileL - (colonnePagina - 1) * DISTANZA) / colonnePagina
    const disponibileA = (utileA - (righePagina - 1) * DISTANZA) / righePagina
    if (disponibileL < LARGHEZZA_MINIMA) continue

    const u = Math.min(1.5, disponibileL / 100, disponibileA / 90)
    const grigliaL = disponibileL - U.lati * 2 * u
    const grigliaA = disponibileA - (U.testata + U.piede) * u
    let cellaL = (grigliaL - (forma.colonne - 1) * U.spazioL * u) / forma.colonne
    let cellaA = (grigliaA - (forma.righe - 1) * U.spazioA * u) / forma.righe
    if (cellaL <= 0 || cellaA <= 0) continue
    cellaL = Math.min(cellaL, cellaA * PROPORZIONE_MAX)
    cellaA = Math.min(cellaA, cellaL / PROPORZIONE_MIN)

    // la cartella si stringe sul contenuto, ma non oltre la testata
    const larghezzaCartella = Math.min(
      disponibileL,
      Math.max(
        100 * u,
        U.lati * 2 * u + forma.colonne * cellaL + (forma.colonne - 1) * U.spazioL * u,
      ),
    )
    const altezzaCartella =
      (U.testata + U.piede) * u + forma.righe * cellaA + (forma.righe - 1) * U.spazioA * u

    const area = cellaL * cellaA
    if (!migliore || area > migliore.area) {
      migliore = {
        colonnePagina,
        righePagina,
        larghezzaCartella,
        altezzaCartella,
        u,
        cellaL,
        cellaA,
        area,
      }
    }
  }

  if (migliore) return migliore
  throw new Error('Non ci sta una cartella di questa forma sul foglio.')
}

// --- font del titolo --------------------------------------------------------

let fontPronto: Promise<void> | null = null

/** Il canvas misura e disegna col font giusto solo dopo che e' caricato. */
export function caricaFontTitolo(): Promise<void> {
  if (!fontPronto) {
    const font = new FontFace(FONT_TITOLO, `url(${urlFontTitolo})`)
    fontPronto = font.load().then((caricato) => {
      document.fonts.add(caricato)
    })
  }
  return fontPronto
}

/** Il file del font in base64, come lo vuole jsPDF. */
export async function fontTitoloBase64(): Promise<string> {
  const dati = new Uint8Array(await (await fetch(urlFontTitolo)).arrayBuffer())
  let binario = ''
  for (let i = 0; i < dati.length; i += 0x8000) {
    binario += String.fromCharCode(...dati.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

/** Larghezza in mm di un testo nel font del titolo, a font gia' caricato. */
export function larghezzaTitolo(testo: string, dimensione: number): number {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return testo.length * dimensione * MM_PER_PUNTO * 0.5
  ctx.font = `${dimensione * 10}px "${FONT_TITOLO}"`
  return (ctx.measureText(testo).width / 10) * MM_PER_PUNTO
}

// --- disposizione di una cartella -------------------------------------------

export interface Rettangolo {
  x: number
  y: number
  l: number
  a: number
}

export interface Scritta {
  testo: string
  x: number
  y: number
  /** In punti tipografici. */
  dimensione: number
  allinea: 'center' | 'left'
}

export interface Disposizione {
  larghezza: number
  altezza: number
  u: number
  celle: Rettangolo[]
  /** Dove sta il testo dentro ogni casella, sopra il quadratino. */
  testi: Rettangolo[]
  casellina: number
  titolo: Scritta
  sottotitolo: Scritta
  nome: Scritta
  rigaNome: { x1: number; x2: number; y: number }
  /** Larghezze misurate col font del titolo, per piazzarci accanto gli ornamenti. */
  larghezzaTitolo: number
  larghezzaSottotitolo: number
  /** Sul retro: lo spazio per le regole. */
  retro: Rettangolo
}

/** Tutte le posizioni dentro una cartella, in mm dall'angolo in alto a sinistra. */
export function disponi(m: Misure, forma: FormaCartella): Disposizione {
  const { u, cellaL, cellaA } = m
  const L = m.larghezzaCartella
  const A = m.altezzaCartella

  const grigliaL = forma.colonne * cellaL + (forma.colonne - 1) * U.spazioL * u
  const x0 = (L - grigliaL) / 2
  const y0 = U.testata * u

  const casellina = Math.min(U.casellina * u, cellaL * 0.24, cellaA * 0.3)
  const margineTesto = Math.min(cellaL, cellaA) * 0.09
  const celle: Rettangolo[] = []
  const testi: Rettangolo[] = []
  for (let r = 0; r < forma.righe; r++) {
    for (let c = 0; c < forma.colonne; c++) {
      const x = x0 + c * (cellaL + U.spazioL * u)
      const y = y0 + r * (cellaA + U.spazioA * u)
      celle.push({ x, y, l: cellaL, a: cellaA })
      testi.push({
        x: x + margineTesto,
        y: y + margineTesto,
        l: cellaL - margineTesto * 2,
        a: cellaA - margineTesto - casellina / 2 - margineTesto * 0.6,
      })
    }
  }

  const dimTitolo = U.dimTitolo * u
  const dimSottotitolo = U.dimSottotitolo * u
  const dimNome = U.dimNome * u
  const xNome = L / 2 - (U.larghezzaNome * u) / 2
  const yNome = A - 5.4 * u
  const lNome = larghezzaTitolo('Nome:', dimNome)

  const bandaRetro = (U.banda + U.retroLati) * u
  return {
    larghezza: L,
    altezza: A,
    u,
    celle,
    testi,
    casellina,
    titolo: { testo: TITOLO_BINGO, x: L / 2, y: U.yTitolo * u, dimensione: dimTitolo, allinea: 'center' },
    sottotitolo: {
      testo: 'Cartella n.',
      x: L / 2,
      y: U.ySottotitolo * u,
      dimensione: dimSottotitolo,
      allinea: 'center',
    },
    nome: { testo: 'Nome:', x: xNome, y: yNome, dimensione: dimNome, allinea: 'left' },
    rigaNome: { x1: xNome + lNome + 1.5 * u, x2: L / 2 + (U.larghezzaNome * u) / 2, y: yNome },
    larghezzaTitolo: larghezzaTitolo(TITOLO_BINGO, dimTitolo),
    larghezzaSottotitolo: larghezzaTitolo('Cartella n. 00', dimSottotitolo),
    retro: {
      x: bandaRetro,
      y: U.retroSopra * u,
      l: L - bandaRetro * 2,
      a: A - U.retroSopra * u - bandaRetro,
    },
  }
}

// --- dimensione delle frasi -------------------------------------------------

const DIMENSIONI = [11, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4]
export const INTERLINEA = 1.12

/**
 * Quasi tutte le caselle usano la stessa dimensione, la piu' grande che va
 * bene per almeno il 90% delle frasi: cosi' una singola frase lunghissima non
 * rimpicciolisce il testo di tutte le altre. Le poche che non ci stanno si
 * riducono da sole.
 *
 * `righe` spezza il testo come lo spezzera' chi lo disegna (jsPDF o canvas).
 */
export function dimensioniFrasi(
  testi: string[],
  spazio: { l: number; a: number },
  righe: (testo: string, dimensione: number, larghezza: number) => string[],
) {
  const entra = (testo: string, dimensione: number) =>
    righe(testo, dimensione, spazio.l).length * dimensione * MM_PER_PUNTO * INTERLINEA <= spazio.a

  const massima = new Map<string, number>()
  for (const testo of new Set(testi)) {
    massima.set(testo, DIMENSIONI.find((prova) => entra(testo, prova)) ?? DIMENSIONI.at(-1)!)
  }
  const ordinate = [...massima.values()].sort((a, b) => a - b)
  const comune = ordinate[Math.floor(ordinate.length * 0.1)] ?? DIMENSIONI[0]
  const dimensionePer = (testo: string) => Math.min(comune, massima.get(testo) ?? comune)
  const ridotte = [...massima.keys()].filter((t) => dimensionePer(t) < comune).length
  return { comune, dimensionePer, ridotte }
}

/** Va a capo come jsPDF, ma misurando col canvas: serve all'anteprima. */
export function spezzaConCanvas(famiglia = 'Helvetica, Arial, sans-serif') {
  const ctx = document.createElement('canvas').getContext('2d')
  return (testo: string, dimensione: number, larghezza: number): string[] => {
    if (!ctx) return [testo]
    ctx.font = `${dimensione * MM_PER_PUNTO * 10}px ${famiglia}`
    const misura = (t: string) => ctx.measureText(t).width / 10
    const righe: string[] = []
    let corrente = ''
    for (const parola of testo.split(/\s+/)) {
      const prova = corrente ? `${corrente} ${parola}` : parola
      if (!corrente || misura(prova) <= larghezza) corrente = prova
      else {
        righe.push(corrente)
        corrente = parola
      }
    }
    if (corrente) righe.push(corrente)
    return righe
  }
}

// --- disegno della cornice ----------------------------------------------------

type Ctx = CanvasRenderingContext2D

/**
 * Pannello rettangolare con gli angoli scavati a quarto di cerchio. Il
 * rettangolo e' rientrato di `d` rispetto a `r`, e gli angoli restano centrati
 * sugli spigoli di `r`: cosi' i bordi a distanze diverse corrono paralleli.
 */
function pannello(ctx: Ctx, r: Rettangolo, raggio: number, d = 0) {
  const rr = raggio + d
  const s = Math.sqrt(rr * rr - d * d)
  // in senso orario dall'angolo in alto a destra: centro dello scavo, poi
  // punto d'ingresso e d'uscita dell'arco rispetto al centro
  const spigoli: [number, number, number, number, number, number][] = [
    [r.x + r.l, r.y, -s, d, -d, s],
    [r.x + r.l, r.y + r.a, -d, -s, -s, -d],
    [r.x, r.y + r.a, s, -d, d, -s],
    [r.x, r.y, d, s, s, d],
  ]
  ctx.beginPath()
  ctx.moveTo(r.x + s, r.y + d)
  for (const [cx, cy, ix, iy, ox, oy] of spigoli) {
    ctx.lineTo(cx + ix, cy + iy)
    ctx.arc(cx, cy, rr, Math.atan2(iy, ix), Math.atan2(oy, ox), true)
  }
  ctx.closePath()
}

function stella(ctx: Ctx, cx: number, cy: number, r: number, colore = COLORI.oro) {
  const k = r * 0.14
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + k, cy - k, cx + r, cy)
  ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r)
  ctx.quadraticCurveTo(cx - k, cy + k, cx - r, cy)
  ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r)
  ctx.fillStyle = colore
  ctx.fill()
}

/** Il tocco di laurea, largo `l`, centrato sulla tavola. */
function tocco(ctx: Ctx, cx: number, cy: number, l: number, angolo = 0) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angolo)
  // calotta
  ctx.beginPath()
  ctx.moveTo(-l * 0.27, l * 0.04)
  ctx.lineTo(-l * 0.27, l * 0.27)
  ctx.quadraticCurveTo(0, l * 0.4, l * 0.27, l * 0.27)
  ctx.lineTo(l * 0.27, l * 0.04)
  ctx.closePath()
  ctx.fillStyle = COLORI.bordeauxScuro
  ctx.fill()
  // tavola
  ctx.beginPath()
  ctx.moveTo(-l / 2, 0)
  ctx.lineTo(0, -l * 0.21)
  ctx.lineTo(l / 2, 0)
  ctx.lineTo(0, l * 0.21)
  ctx.closePath()
  ctx.fillStyle = COLORI.bordeaux
  ctx.fill()
  // nappa
  ctx.strokeStyle = COLORI.oro
  ctx.lineWidth = l * 0.035
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(l * 0.36, l * 0.03)
  ctx.lineTo(l * 0.36, l * 0.3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(l * 0.36, l * 0.28)
  ctx.lineTo(l * 0.31, l * 0.44)
  ctx.lineTo(l * 0.41, l * 0.44)
  ctx.closePath()
  ctx.fillStyle = COLORI.oro
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, l * 0.035, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Il diploma arrotolato col nastro, lungo `l`. */
function pergamena(ctx: Ctx, cx: number, cy: number, l: number, angolo = 0) {
  const a = l * 0.3
  const tratto = Math.max(0.15, l * 0.035)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angolo)
  ctx.lineWidth = tratto
  ctx.strokeStyle = COLORI.bordeaux
  ctx.fillStyle = COLORI.carta
  ctx.beginPath()
  ctx.rect(-l / 2, -a / 2, l, a)
  ctx.fill()
  ctx.stroke()
  for (const lato of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse((lato * l) / 2, 0, a * 0.24, a / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse((lato * l) / 2, 0, a * 0.08, a * 0.16, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // nastro con le code
  ctx.fillStyle = COLORI.bordeaux
  ctx.fillRect(-l * 0.05, -a / 2 - tratto / 2, l * 0.1, a + tratto)
  ctx.beginPath()
  ctx.moveTo(-l * 0.02, a / 2)
  ctx.lineTo(-l * 0.1, a * 0.95)
  ctx.lineTo(-l * 0.04, a * 0.85)
  ctx.lineTo(0, a * 0.98)
  ctx.lineTo(l * 0.04, a * 0.85)
  ctx.lineTo(l * 0.1, a * 0.95)
  ctx.lineTo(l * 0.02, a / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Ramo d'alloro alto `a` che parte dal basso in (x, y). Con `verso` 1 si
 * incurva a sinistra come una "(", con -1 a destra come una ")".
 */
function alloro(ctx: Ctx, x: number, y: number, a: number, verso: 1 | -1) {
  const p0 = { x, y }
  const p1 = { x: x - verso * a * 0.42, y: y - a * 0.45 }
  const p2 = { x: x + verso * a * 0.04, y: y - a }
  const punto = (t: number) => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
  })
  const tangente = (t: number) =>
    Math.atan2(
      2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
      2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    )

  ctx.strokeStyle = COLORI.oro
  ctx.fillStyle = COLORI.oro
  ctx.lineWidth = a * 0.03
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y)
  ctx.stroke()

  const foglia = (t: number, lato: number, scala: number) => {
    const p = punto(t)
    const angolo = tangente(t) + lato * 0.75
    const lunga = a * 0.19 * scala
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(angolo)
    ctx.beginPath()
    ctx.ellipse(lunga / 2, 0, lunga / 2, lunga * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.15
    const scala = 1 - i * 0.07
    foglia(t, -1, scala)
    foglia(t + 0.07, 1, scala)
  }
  foglia(0.99, 0, 0.85)
}

export type Facciata = 'fronte' | 'retro'

/** Disegna su un canvas che lavora in mm tutto quello che non e' testo. */
export function disegnaCornice(ctx: Ctx, d: Disposizione, facciata: Facciata) {
  const { u, larghezza: L, altezza: A } = d
  const interno: Rettangolo = { x: U.banda * u, y: U.banda * u, l: L - U.banda * 2 * u, a: A - U.banda * 2 * u }

  ctx.fillStyle = COLORI.bordeaux
  ctx.fillRect(0, 0, L, A)

  pannello(ctx, interno, U.tacca * u)
  ctx.fillStyle = COLORI.crema
  ctx.fill()

  pannello(ctx, interno, U.tacca * u, U.filo * u)
  ctx.strokeStyle = COLORI.oroFilo
  ctx.lineWidth = 0.35 * u
  ctx.stroke()

  // linguetta in alto col tocco e il diploma
  ctx.fillStyle = COLORI.crema
  ctx.fillRect(L / 2 - (U.linguetta * u) / 2, 0, U.linguetta * u, U.banda * u + 0.05)
  pergamena(ctx, L / 2, 7.4 * u, 8 * u, -0.12)
  tocco(ctx, L / 2, 3.4 * u, 9.5 * u)

  // diplomi negli angoli in alto, dentro il filo oro
  pergamena(ctx, 10.5 * u, 9 * u, 7 * u, -0.6)
  pergamena(ctx, L - 10.5 * u, 9 * u, 7 * u, 0.6)

  if (facciata === 'retro') return

  // alloro e stelline ai lati del titolo
  const meta = d.larghezzaTitolo / 2
  const yT = d.titolo.y
  alloro(ctx, L / 2 - meta - 2.8 * u, yT + 1.6 * u, 12.5 * u, 1)
  alloro(ctx, L / 2 + meta + 2.8 * u, yT + 1.6 * u, 12.5 * u, -1)
  stella(ctx, L / 2 - meta - 10.5 * u, yT - 4.2 * u, 1.3 * u, COLORI.bordeaux)
  stella(ctx, L / 2 + meta + 10.5 * u, yT - 4.2 * u, 1.3 * u, COLORI.bordeaux)

  // stelline oro accanto a "Cartella n."
  const metaS = d.larghezzaSottotitolo / 2
  stella(ctx, L / 2 - metaS - 4 * u, d.sottotitolo.y - 1.3 * u, 1.3 * u)
  stella(ctx, L / 2 + metaS + 4 * u, d.sottotitolo.y - 1.3 * u, 1.3 * u)

  // tocchi ai lati
  tocco(ctx, 9.6 * u, 22.4 * u, 8.5 * u, 0.2)
  tocco(ctx, L - 9.6 * u, 22.4 * u, 8.5 * u, -0.2)
  stella(ctx, 13.5 * u, 18.6 * u, 0.6 * u)
  stella(ctx, 8 * u, 26.2 * u, 0.5 * u)

  // caselle e quadratini
  const raggio = Math.min(1.6 * u, Math.min(d.celle[0].l, d.celle[0].a) * 0.12)
  const tratto = Math.max(0.25, 0.42 * u)
  ctx.lineWidth = tratto
  ctx.strokeStyle = COLORI.bordeaux
  for (const c of d.celle) {
    ctx.beginPath()
    ctx.roundRect(c.x, c.y, c.l, c.a, raggio)
    ctx.fillStyle = COLORI.casella
    ctx.fill()
    ctx.stroke()
  }
  const q = d.casellina
  for (const c of d.celle) {
    ctx.beginPath()
    ctx.roundRect(c.x + c.l / 2 - q / 2, c.y + c.a - q / 2, q, q, q * 0.22)
    ctx.fillStyle = COLORI.casella
    ctx.fill()
    ctx.stroke()
  }

  // riga del nome
  ctx.strokeStyle = COLORI.bordeaux
  ctx.lineWidth = Math.max(0.2, 0.3 * u)
  ctx.beginPath()
  ctx.moveTo(d.rigaNome.x1, d.rigaNome.y)
  ctx.lineTo(d.rigaNome.x2, d.rigaNome.y)
  ctx.stroke()

  // ornamenti in basso
  pergamena(ctx, 11.5 * u, A - 7.6 * u, 7 * u, 0.6)
  stella(ctx, 16.6 * u, A - 5 * u, 0.9 * u)
  stella(ctx, 7.6 * u, A - 10.8 * u, 0.55 * u)
  alloro(ctx, L - 15 * u, A - 4.6 * u, 6.5 * u, 1)
  tocco(ctx, L - 11 * u, A - 8 * u, 7 * u, -0.25)
  stella(ctx, L - 18.5 * u, A - 6 * u, 0.9 * u)
  stella(ctx, L - 7.2 * u, A - 10.8 * u, 0.55 * u)
}

/** La cornice come immagine PNG, da riusare uguale per tutte le cartelle. */
export function corniceComePng(d: Disposizione, facciata: Facciata, dpi = 300): string {
  const scala = dpi / 25.4
  const tela = document.createElement('canvas')
  tela.width = Math.round(d.larghezza * scala)
  tela.height = Math.round(d.altezza * scala)
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Il browser non permette di disegnare la cartella')
  ctx.scale(scala, scala)
  disegnaCornice(ctx, d, facciata)
  return tela.toDataURL('image/png')
}
