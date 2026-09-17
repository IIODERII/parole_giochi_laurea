export const LUNGHEZZA_MIN = 3
export const LUNGHEZZA_MAX = 15
export const DEFINIZIONE_MAX = 300
export const AUTORE_MAX = 40

/**
 * Riduce una parola alla forma usabile in un cruciverba:
 * maiuscole, senza accenti, senza spazi ne' punteggiatura.
 * Es. "Mar Rosso" -> "MARROSSO", "perche" accentato -> "PERCHE".
 *
 * La normalizzazione NFD separa la lettera dal suo accento; il filtro finale
 * tiene solo A-Z e quindi butta via accenti, spazi, apostrofi e numeri.
 */
export function normalizzaParola(grezza: string): string {
  return grezza.normalize('NFD').toUpperCase().replace(/[^A-Z]/g, '')
}

export interface EsitoValidazione {
  ok: boolean
  valore: string
  errore?: string
}

export function validaParola(grezza: string): EsitoValidazione {
  const valore = normalizzaParola(grezza)
  if (valore.length === 0) {
    return { ok: false, valore, errore: 'Scrivi una parola (solo lettere).' }
  }
  if (valore.length < LUNGHEZZA_MIN) {
    return { ok: false, valore, errore: `La parola deve avere almeno ${LUNGHEZZA_MIN} lettere.` }
  }
  if (valore.length > LUNGHEZZA_MAX) {
    return { ok: false, valore, errore: `La parola puo' avere al massimo ${LUNGHEZZA_MAX} lettere.` }
  }
  return { ok: true, valore }
}

export function validaDefinizione(grezza: string): EsitoValidazione {
  const valore = grezza.trim().replace(/\s+/g, ' ')
  if (valore.length === 0) {
    return { ok: false, valore, errore: 'Scrivi la definizione.' }
  }
  if (valore.length > DEFINIZIONE_MAX) {
    return {
      ok: false,
      valore,
      errore: `La definizione puo' avere al massimo ${DEFINIZIONE_MAX} caratteri.`,
    }
  }
  return { ok: true, valore }
}

export function validaAutore(grezza: string): EsitoValidazione {
  const valore = grezza.trim().replace(/\s+/g, ' ')
  if (valore.length > AUTORE_MAX) {
    return { ok: false, valore, errore: `Il nome puo' avere al massimo ${AUTORE_MAX} caratteri.` }
  }
  return { ok: true, valore }
}
