import { useCallback } from 'react'
import { useRaccolta } from '../shared/raccolta'
import type { DatiParola, Parola } from './types'

export { messaggioErroreFirestore } from '../shared/raccolta'

export const COLLEZIONE_PAROLE = 'parole'

export function useParole() {
  const raccolta = useRaccolta<Parola>(COLLEZIONE_PAROLE)

  const aggiungi = useCallback(
    (dati: DatiParola) =>
      raccolta.aggiungi({
        parola: dati.parola,
        definizione: dati.definizione,
        autore: dati.autore ?? '',
      }),
    [raccolta],
  )

  const modifica = useCallback(
    (id: string, dati: DatiParola) =>
      raccolta.modifica(id, {
        parola: dati.parola,
        definizione: dati.definizione,
        autore: dati.autore ?? '',
      }),
    [raccolta],
  )

  return {
    parole: raccolta.voci,
    caricamento: raccolta.caricamento,
    errore: raccolta.errore,
    aggiungi,
    modifica,
    elimina: raccolta.elimina,
  }
}
