import { LUNGHEZZA_MAX, LUNGHEZZA_MIN, normalizzaParola } from './normalize'
import type { Parola } from './types'

export type Direzione = 'orizzontale' | 'verticale'

export interface Voce {
  id: string
  parola: string
  definizione: string
  autore?: string
}

export interface Piazzamento extends Voce {
  riga: number
  colonna: number
  direzione: Direzione
  numero: number
}

export interface Cella {
  lettera: string
  numero: number | null
}

export type MotivoScarto = 'duplicata' | 'lunghezza' | 'nessun-incastro'

export interface Scartata {
  voce: Voce
  motivo: MotivoScarto
}

export interface Cruciverba {
  larghezza: number
  altezza: number
  celle: (Cella | null)[][]
  piazzate: Piazzamento[]
  orizzontali: Piazzamento[]
  verticali: Piazzamento[]
  scartate: Scartata[]
}

// Generatore casuale deterministico: con lo stesso seme la griglia prodotta
// e' sempre identica, cosi' non cambia a ogni ricaricamento della pagina.
function mulberry32(seme: number): () => number {
  let a = seme >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Posizione {
  voce: Voce
  riga: number
  colonna: number
  direzione: Direzione
}

interface Griglia {
  lettere: Map<string, string>
  perLettera: Map<string, string[]>
  usateOrizzontali: Set<string>
  usateVerticali: Set<string>
  posizioni: Posizione[]
  rMin: number
  rMax: number
  cMin: number
  cMax: number
  vuota: boolean
}

function chiave(riga: number, colonna: number): string {
  return riga + ':' + colonna
}

function passo(direzione: Direzione): { dr: number; dc: number } {
  return direzione === 'orizzontale' ? { dr: 0, dc: 1 } : { dr: 1, dc: 0 }
}

function nuovaGriglia(): Griglia {
  return {
    lettere: new Map(),
    perLettera: new Map(),
    usateOrizzontali: new Set(),
    usateVerticali: new Set(),
    posizioni: [],
    rMin: 0,
    rMax: 0,
    cMin: 0,
    cMax: 0,
    vuota: true,
  }
}

/**
 * Dice se la parola puo' stare in quella posizione: ritorna il numero di
 * incroci, oppure null se il piazzamento e' illegale.
 *
 * Regole: le lettere sovrapposte devono coincidere; due parole non possono
 * sovrapporsi nella stessa direzione (una allungherebbe l'altra); la casella
 * prima e quella dopo devono essere libere; una parola non puo' correre
 * appiccicata e parallela a un'altra.
 */
function verifica(
  g: Griglia,
  parola: string,
  riga: number,
  colonna: number,
  direzione: Direzione,
): number | null {
  const { dr, dc } = passo(direzione)
  const usate = direzione === 'orizzontale' ? g.usateOrizzontali : g.usateVerticali
  const lunghezza = parola.length

  if (g.lettere.has(chiave(riga - dr, colonna - dc))) return null
  if (g.lettere.has(chiave(riga + dr * lunghezza, colonna + dc * lunghezza))) return null

  let incroci = 0
  for (let i = 0; i < lunghezza; i++) {
    const r = riga + dr * i
    const c = colonna + dc * i
    const k = chiave(r, c)
    const esistente = g.lettere.get(k)

    if (esistente !== undefined) {
      if (esistente !== parola[i]) return null
      if (usate.has(k)) return null
      incroci++
    } else if (direzione === 'orizzontale') {
      if (g.lettere.has(chiave(r - 1, c)) || g.lettere.has(chiave(r + 1, c))) return null
    } else {
      if (g.lettere.has(chiave(r, c - 1)) || g.lettere.has(chiave(r, c + 1))) return null
    }
  }
  return incroci
}

function inserisci(g: Griglia, voce: Voce, riga: number, colonna: number, direzione: Direzione): void {
  const { dr, dc } = passo(direzione)
  const usate = direzione === 'orizzontale' ? g.usateOrizzontali : g.usateVerticali
  const parola = voce.parola

  for (let i = 0; i < parola.length; i++) {
    const r = riga + dr * i
    const c = colonna + dc * i
    const k = chiave(r, c)
    if (!g.lettere.has(k)) {
      g.lettere.set(k, parola[i])
      const elenco = g.perLettera.get(parola[i])
      if (elenco) elenco.push(k)
      else g.perLettera.set(parola[i], [k])
    }
    usate.add(k)
  }

  const rFine = riga + dr * (parola.length - 1)
  const cFine = colonna + dc * (parola.length - 1)
  if (g.vuota) {
    g.rMin = riga
    g.rMax = rFine
    g.cMin = colonna
    g.cMax = cFine
    g.vuota = false
  } else {
    g.rMin = Math.min(g.rMin, riga)
    g.rMax = Math.max(g.rMax, rFine)
    g.cMin = Math.min(g.cMin, colonna)
    g.cMax = Math.max(g.cMax, cFine)
  }
  g.posizioni.push({ voce, riga, colonna, direzione })
}

interface Candidato {
  riga: number
  colonna: number
  direzione: Direzione
  punteggio: number
}

/** Tutti i piazzamenti legali della parola, con un punteggio di qualita'. */
function cercaCandidati(g: Griglia, parola: string): Candidato[] {
  const risultati: Candidato[] = []
  const larghezzaAttuale = g.cMax - g.cMin + 1
  const altezzaAttuale = g.rMax - g.rMin + 1

  for (let i = 0; i < parola.length; i++) {
    const celle = g.perLettera.get(parola[i])
    if (!celle) continue

    for (const k of celle) {
      const separatore = k.indexOf(':')
      const r = Number(k.slice(0, separatore))
      const c = Number(k.slice(separatore + 1))

      for (const direzione of ['orizzontale', 'verticale'] as const) {
        const { dr, dc } = passo(direzione)
        const riga = r - dr * i
        const colonna = c - dc * i
        const incroci = verifica(g, parola, riga, colonna, direzione)
        if (incroci === null || incroci === 0) continue

        const rFine = riga + dr * (parola.length - 1)
        const cFine = colonna + dc * (parola.length - 1)
        const nuovaLarghezza = Math.max(g.cMax, cFine) - Math.min(g.cMin, colonna) + 1
        const nuovaAltezza = Math.max(g.rMax, rFine) - Math.min(g.rMin, riga) + 1
        const crescita = nuovaLarghezza - larghezzaAttuale + (nuovaAltezza - altezzaAttuale)

        // piu' incroci = meglio; griglia che cresce poco e resta quadrata = meglio
        const punteggio = incroci * 100 - crescita * 6 - Math.abs(nuovaLarghezza - nuovaAltezza) * 2
        risultati.push({ riga, colonna, direzione, punteggio })
      }
    }
  }

  return risultati
}

interface Tentativo {
  griglia: Griglia
  scartate: Voce[]
}

function provaAInserire(g: Griglia, voce: Voce, random: () => number): boolean {
  const candidati = cercaCandidati(g, voce.parola)
  if (candidati.length === 0) return false

  candidati.sort((a, b) => b.punteggio - a.punteggio)
  // quasi sempre il migliore, ogni tanto uno dei primi tre: serve a esplorare
  // disposizioni diverse nei vari tentativi
  const quanti = Math.min(3, candidati.length)
  const scelto = random() < 0.75 ? candidati[0] : candidati[Math.floor(random() * quanti)]
  inserisci(g, voce, scelto.riga, scelto.colonna, scelto.direzione)
  return true
}

function costruisci(voci: Voce[], random: () => number): Tentativo {
  const g = nuovaGriglia()
  let rimaste: Voce[] = []

  for (const voce of voci) {
    if (g.vuota) {
      inserisci(g, voce, 0, 0, 'orizzontale')
      continue
    }
    if (!provaAInserire(g, voce, random)) rimaste.push(voce)
  }

  // Le parole scartate vengono riprovate: la griglia nel frattempo e'
  // cresciuta, quindi possono essersi aperti nuovi incroci.
  let progresso = true
  while (progresso && rimaste.length > 0) {
    progresso = false
    const ancoraFuori: Voce[] = []
    for (const voce of rimaste) {
      if (provaAInserire(g, voce, random)) progresso = true
      else ancoraFuori.push(voce)
    }
    rimaste = ancoraFuori
  }

  return { griglia: g, scartate: rimaste }
}

function qualita(t: Tentativo) {
  const larghezza = t.griglia.cMax - t.griglia.cMin + 1
  const altezza = t.griglia.rMax - t.griglia.rMin + 1
  return {
    piazzate: t.griglia.posizioni.length,
    area: larghezza * altezza,
    lato: Math.max(larghezza, altezza),
  }
}

/** true se "a" e' un risultato migliore di "b". */
function meglio(a: Tentativo, b: Tentativo): boolean {
  const qa = qualita(a)
  const qb = qualita(b)
  if (qa.piazzate !== qb.piazzate) return qa.piazzate > qb.piazzate
  if (qa.area !== qb.area) return qa.area < qb.area
  return qa.lato < qb.lato
}

function mescola(voci: Voce[], random: () => number): void {
  for (let i = voci.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = voci[i]
    voci[i] = voci[j]
    voci[j] = tmp
  }
}

function ordina(voci: Voce[], tentativo: number, random: () => number): Voce[] {
  const elenco = voci.slice()
  if (tentativo === 0) {
    return elenco.sort(
      (a, b) => b.parola.length - a.parola.length || a.parola.localeCompare(b.parola),
    )
  }
  mescola(elenco, random)
  if (tentativo % 5 === 0) return elenco
  // sort stabile: a parita' di lunghezza resta l'ordine casuale
  return elenco.sort((a, b) => b.parola.length - a.parola.length)
}

export interface OpzioniGeneratore {
  /** Cambiando il seme si ottiene una disposizione diversa. */
  seme?: number
  /** Quante costruzioni provare prima di tenere la migliore. */
  tentativi?: number
}

const CRUCIVERBA_VUOTO: Cruciverba = {
  larghezza: 0,
  altezza: 0,
  celle: [],
  piazzate: [],
  orizzontali: [],
  verticali: [],
  scartate: [],
}

export function generaCruciverba(parole: Parola[], opzioni: OpzioniGeneratore = {}): Cruciverba {
  const seme = opzioni.seme ?? 1
  const tentativi = Math.max(1, opzioni.tentativi ?? 40)

  const scartate: Scartata[] = []
  const gia = new Set<string>()
  const voci: Voce[] = []

  for (const p of parole) {
    const voce: Voce = {
      id: p.id,
      parola: normalizzaParola(p.parola),
      definizione: p.definizione,
      autore: p.autore,
    }
    if (voce.parola.length < LUNGHEZZA_MIN || voce.parola.length > LUNGHEZZA_MAX) {
      scartate.push({ voce, motivo: 'lunghezza' })
    } else if (gia.has(voce.parola)) {
      scartate.push({ voce, motivo: 'duplicata' })
    } else {
      gia.add(voce.parola)
      voci.push(voce)
    }
  }

  if (voci.length === 0) return { ...CRUCIVERBA_VUOTO, scartate }

  let migliore: Tentativo | null = null
  for (let t = 0; t < tentativi; t++) {
    const random = mulberry32(seme * 7919 + t * 104729 + 1)
    const esito = costruisci(ordina(voci, t, random), random)
    if (migliore === null || meglio(esito, migliore)) migliore = esito
  }
  if (migliore === null) return { ...CRUCIVERBA_VUOTO, scartate }

  const g = migliore.griglia
  const larghezza = g.cMax - g.cMin + 1
  const altezza = g.rMax - g.rMin + 1

  const celle: (Cella | null)[][] = Array.from({ length: altezza }, () =>
    Array<Cella | null>(larghezza).fill(null),
  )
  for (const [k, lettera] of g.lettere) {
    const separatore = k.indexOf(':')
    const r = Number(k.slice(0, separatore)) - g.rMin
    const c = Number(k.slice(separatore + 1)) - g.cMin
    celle[r][c] = { lettera, numero: null }
  }

  // numerazione classica: si scorre riga per riga e si numera ogni casella
  // che inizia una parola orizzontale o verticale
  let contatore = 1
  for (let r = 0; r < altezza; r++) {
    for (let c = 0; c < larghezza; c++) {
      const cella = celle[r][c]
      if (!cella) continue
      const iniziaOrizzontale =
        (c === 0 || !celle[r][c - 1]) && c + 1 < larghezza && !!celle[r][c + 1]
      const iniziaVerticale = (r === 0 || !celle[r - 1][c]) && r + 1 < altezza && !!celle[r + 1][c]
      if (iniziaOrizzontale || iniziaVerticale) cella.numero = contatore++
    }
  }

  const piazzate: Piazzamento[] = g.posizioni.map((p) => {
    const riga = p.riga - g.rMin
    const colonna = p.colonna - g.cMin
    return {
      ...p.voce,
      riga,
      colonna,
      direzione: p.direzione,
      numero: celle[riga][colonna]?.numero ?? 0,
    }
  })

  for (const voce of migliore.scartate) scartate.push({ voce, motivo: 'nessun-incastro' })

  const perNumero = (a: Piazzamento, b: Piazzamento) => a.numero - b.numero

  return {
    larghezza,
    altezza,
    celle,
    piazzate,
    orizzontali: piazzate.filter((p) => p.direzione === 'orizzontale').sort(perNumero),
    verticali: piazzate.filter((p) => p.direzione === 'verticale').sort(perNumero),
    scartate,
  }
}
