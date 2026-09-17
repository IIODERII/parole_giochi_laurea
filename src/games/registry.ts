import type { ComponentType } from 'react'
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
]

export const giochiAttivi = giochi.filter((g) => g.attivo)
