/**
 * Costanti dell'evento e dell'accesso.
 * Qui si cambiano nomi, titoli e utenti senza toccare il resto del codice.
 */

// --- Festeggiata ---------------------------------------------------------
export const FESTEGGIATA = 'Sara Miglienti'
export const NOME_BREVE = 'Sara'
export const CORSO_DI_LAUREA = 'Scienze Nutraceutiche e della Salute Alimentare'
/** Lasciare stringa vuota per non mostrare la data. Es. '12 dicembre 2026' */
export const DATA_LAUREA = ''

export const TITOLO_SITO = 'La Laurea di Sara'
export const SOTTOTITOLO_SITO = 'I giochi per festeggiarla'

// --- Accesso -------------------------------------------------------------
/**
 * Firebase Authentication vuole indirizzi email: il dominio qui sotto e'
 * fittizio e non deve esistere davvero. Nel form di login si digita solo il
 * nome utente ("oder" oppure "ospiti") e il codice aggiunge il resto.
 */
export const DOMINIO_UTENTI = 'laurea.local'
export const ADMIN_USERNAME = 'oder'
export const ADMIN_EMAIL = `${ADMIN_USERNAME}@${DOMINIO_UTENTI}`

export function usernameToEmail(username: string): string {
  const pulito = username.trim().toLowerCase()
  return pulito.includes('@') ? pulito : `${pulito}@${DOMINIO_UTENTI}`
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return ''
  return email.split('@')[0]
}
