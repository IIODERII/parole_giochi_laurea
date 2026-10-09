import type { ComponentType } from 'react'
import BingoPage from './bingo/BingoPage'
import RegiaPage from './cashorsara/RegiaPage'
import CruciverbaPage from './cruciverba/CruciverbaPage'

/**
 * Elenco dei giochi del sito.
 *
 * Per aggiungerne uno nuovo: crea una cartella in src/games/<nome>/ con la sua
 * pagina, poi aggiungi una voce qui sotto. Menu, rotte e tessere della home si
 * aggiornano da sole.
 */
export interface Gioco {
  id: string
  titolo: string
  percorso: string
  descrizione: string
  emoji: string
  Componente: ComponentType
  attivo: boolean
  /** Visibile solo a Oder: gli invitati non lo vedono nel menu. */
  soloAdmin?: boolean
}

export const giochi: Gioco[] = [
  {
    id: 'cruciverba',
    titolo: 'CruciSara',
    percorso: '/cruciverba',
    descrizione:
      'Proponi una parola e la sua definizione: verranno incastrate tutte insieme in un cruciverba da stampare.',
    emoji: '✏️',
    Componente: CruciverbaPage,
    attivo: true,
  },
  {
    id: 'bingo',
    titolo: 'BingoSara',
    percorso: '/bingo',
    descrizione:
      'Scrivi cosa pensi che succederà durante la festa: diventerà una casella delle cartelle del bingo.',
    emoji: '🎲',
    Componente: BingoPage,
    attivo: true,
  },
  {
    id: 'cashorsara',
    titolo: 'Cash or Sara',
    percorso: '/cashorsara',
    descrizione:
      'Il gioco della serata: si indovina quanto vale ogni oggetto. Gli invitati entrano dal QR proiettato.',
    emoji: '💎',
    Componente: RegiaPage,
    attivo: true,
    soloAdmin: true,
  },
]

export const giochiAttivi = giochi.filter((g) => g.attivo)

export function giochiVisibili(isAdmin: boolean): Gioco[] {
  return giochiAttivi.filter((g) => isAdmin || !g.soloAdmin)
}
