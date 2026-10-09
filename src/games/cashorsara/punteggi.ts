import type { Giocatore, Risposta } from './types'

/** Punti in piu' per chi si avvicina di piu' di tutti. */
export const BONUS_PIU_VICINO = 20

/**
 * Punteggio in base a quanto ci si e' avvicinati: 100 punti se indovini
 * esatto, meno tanti punti quanta percentuale sbagli, zero se sbagli del
 * 100% o piu'. Cosi' tutti raccolgono qualcosa a ogni oggetto e la classifica
 * resta viva fino alla fine.
 */
export function puntiBase(stima: number, valore: number): number {
  if (!(valore > 0)) return 0
  const errore = Math.abs(stima - valore) / valore
  return Math.max(0, Math.round(100 - errore * 100))
}

export interface EsitoTurno {
  giocatoreId: string
  nome: string
  stima: number
  scarto: number
  errore: number
  punti: number
  piuVicino: boolean
  posizione: number
}

/** Esiti di un singolo oggetto, dal piu' vicino al piu' lontano. */
export function esitiTurno(risposte: Risposta[], valore: number): EsitoTurno[] {
  if (risposte.length === 0) return []

  const scartoMinimo = Math.min(...risposte.map((r) => Math.abs(r.valore - valore)))
  const ordinate = [...risposte].sort(
    (a, b) => Math.abs(a.valore - valore) - Math.abs(b.valore - valore) || a.nome.localeCompare(b.nome),
  )

  let posizione = 0
  let scartoPrecedente = -1
  return ordinate.map((r, i) => {
    const scarto = Math.abs(r.valore - valore)
    if (scarto !== scartoPrecedente) {
      posizione = i + 1
      scartoPrecedente = scarto
    }
    const piuVicino = scarto === scartoMinimo
    return {
      giocatoreId: r.giocatoreId,
      nome: r.nome,
      stima: r.valore,
      scarto,
      errore: valore > 0 ? scarto / valore : 0,
      punti: puntiBase(r.valore, valore) + (piuVicino ? BONUS_PIU_VICINO : 0),
      piuVicino,
      posizione,
    }
  })
}

export interface RigaClassifica {
  giocatoreId: string
  nome: string
  punti: number
  turni: number
  posizione: number
}

/**
 * Classifica generale, ricalcolata ogni volta dalle risposte e dai valori
 * gia' rivelati: non serve salvare punteggi da nessuna parte, e chi entra a
 * meta' partita o corregge una puntata non manda niente fuori sincrono.
 */
export function classifica(
  risposte: Risposta[],
  valoriRivelati: Record<string, number>,
  giocatori: Giocatore[],
): RigaClassifica[] {
  const totali = new Map<string, { nome: string; punti: number; turni: number }>()
  for (const g of giocatori) totali.set(g.id, { nome: g.nome, punti: 0, turni: 0 })

  for (const [chiave, valore] of Object.entries(valoriRivelati)) {
    const indice = Number(chiave)
    const delTurno = risposte.filter((r) => r.indice === indice)
    for (const esito of esitiTurno(delTurno, valore)) {
      const riga = totali.get(esito.giocatoreId) ?? { nome: esito.nome, punti: 0, turni: 0 }
      riga.nome = esito.nome
      riga.punti += esito.punti
      riga.turni += 1
      totali.set(esito.giocatoreId, riga)
    }
  }

  const righe = [...totali.entries()]
    .map(([giocatoreId, riga]) => ({ giocatoreId, ...riga, posizione: 0 }))
    .sort((a, b) => b.punti - a.punti || a.nome.localeCompare(b.nome))

  let posizione = 0
  let puntiPrecedenti = -1
  righe.forEach((riga, i) => {
    if (riga.punti !== puntiPrecedenti) {
      posizione = i + 1
      puntiPrecedenti = riga.punti
    }
    riga.posizione = posizione
  })
  return righe
}
