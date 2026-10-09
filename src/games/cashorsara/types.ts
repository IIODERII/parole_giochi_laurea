import type { Timestamp } from 'firebase/firestore'

export const COLLEZIONE_OGGETTI = 'oggetti'
export const COLLEZIONE_PARTITA = 'partita'
export const ID_PARTITA = 'corrente'

export const TITOLO_GIOCO = 'Cash or Sara'
export const NOME_MAX = 24
export const VALORE_MAX = 1_000_000
/** La storia la racconta Alessandro Rosa nel fumetto: puo' essere lunga. */
export const STORIA_MAX = 1500

/**
 * Il presentatore che "racconta" gli oggetti sulla proiezione. La foto va
 * messa in public/cashorsara/ con questo nome: se manca, la colonna sparisce.
 */
export const PRESENTATORE = 'Alessandro Rosa'
export const FOTO_PRESENTATORE = `${import.meta.env.BASE_URL}cashorsara/alessandro-rosa.png`

/** Un oggetto da valutare. Il valore vero lo vede solo Oder. */
export interface Oggetto {
  id: string
  nome: string
  storia: string
  valore: number
  ordine: number
  foto?: string | null
  createdAt?: Timestamp | null
}

export type StatoPartita = 'attesa' | 'puntate' | 'chiuse' | 'rivelato' | 'finita'

/**
 * Lo stato che vedono tutti: dell'oggetto in gioco viaggiano solo nome,
 * storia e foto. Il valore vero entra in "valoriRivelati" soltanto nel
 * momento in cui Oder lo rivela.
 */
export interface Partita {
  stato: StatoPartita
  indice: number
  totale: number
  oggettoId: string | null
  oggettoNome: string
  oggettoStoria: string
  oggettoFoto: string | null
  valoriRivelati: Record<string, number>
  aggiornataIl?: Timestamp | null
}

export const PARTITA_VUOTA: Partita = {
  stato: 'attesa',
  indice: 0,
  totale: 0,
  oggettoId: null,
  oggettoNome: '',
  oggettoStoria: '',
  oggettoFoto: null,
  valoriRivelati: {},
}

export interface Giocatore {
  id: string
  nome: string
  manuale?: boolean
  entratoIl?: Timestamp | null
}

export interface Risposta {
  id: string
  indice: number
  giocatoreId: string
  nome: string
  valore: number
  inviataIl?: Timestamp | null
}

export function idRisposta(indice: number, giocatoreId: string): string {
  return `${indice}__${giocatoreId}`
}

export function nomeValido(grezzo: string): { ok: boolean; valore: string; errore?: string } {
  const valore = grezzo.trim().replace(/\s+/g, ' ')
  if (valore.length < 2) return { ok: false, valore, errore: 'Scrivi il tuo nome.' }
  if (valore.length > NOME_MAX) {
    return { ok: false, valore, errore: `Massimo ${NOME_MAX} caratteri.` }
  }
  return { ok: true, valore }
}

export function euro(valore: number): string {
  return valore.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
