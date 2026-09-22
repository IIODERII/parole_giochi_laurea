import type { Voce } from '../shared/raccolta'

/** Documento della collezione "frasi" su Firestore. */
export interface Frase extends Voce {
  testo: string
}

export interface DatiFrase {
  testo: string
  autore?: string
}

export const TESTO_MIN = 3
export const TESTO_MAX = 80
export const AUTORE_MAX = 40

/** Oltre questa lunghezza la frase entra nella casella, ma in caratteri piccoli. */
export const TESTO_COMODO = 45

export interface EsitoValidazione {
  ok: boolean
  valore: string
  errore?: string
}

export function validaTesto(grezzo: string): EsitoValidazione {
  const valore = grezzo.trim().replace(/\s+/g, ' ')
  if (valore.length < TESTO_MIN) {
    return { ok: false, valore, errore: 'Scrivi che cosa pensi succederà.' }
  }
  if (valore.length > TESTO_MAX) {
    return {
      ok: false,
      valore,
      errore: `Massimo ${TESTO_MAX} caratteri: deve stare in una casella della cartella.`,
    }
  }
  return { ok: true, valore }
}

export function validaAutore(grezzo: string): EsitoValidazione {
  const valore = grezzo.trim().replace(/\s+/g, ' ')
  if (valore.length > AUTORE_MAX) {
    return { ok: false, valore, errore: `Il nome può avere al massimo ${AUTORE_MAX} caratteri.` }
  }
  return { ok: true, valore }
}

/** Per riconoscere i doppioni senza badare a maiuscole, accenti e punteggiatura. */
export function impronta(testo: string): string {
  return testo
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
