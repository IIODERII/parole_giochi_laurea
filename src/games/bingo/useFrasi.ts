import { useCallback } from 'react'
import { useRaccolta } from '../shared/raccolta'
import type { DatiFrase, Frase } from './types'

export { messaggioErroreFirestore } from '../shared/raccolta'

export const COLLEZIONE_FRASI = 'frasi'

export function useFrasi() {
  const raccolta = useRaccolta<Frase>(COLLEZIONE_FRASI)

  const aggiungi = useCallback(
    (dati: DatiFrase) => raccolta.aggiungi({ testo: dati.testo, autore: dati.autore ?? '' }),
    [raccolta],
  )

  const modifica = useCallback(
    (id: string, dati: DatiFrase) =>
      raccolta.modifica(id, { testo: dati.testo, autore: dati.autore ?? '' }),
    [raccolta],
  )

  return {
    frasi: raccolta.voci,
    caricamento: raccolta.caricamento,
    errore: raccolta.errore,
    aggiungi,
    modifica,
    elimina: raccolta.elimina,
  }
}
