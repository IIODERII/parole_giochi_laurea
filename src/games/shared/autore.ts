/**
 * Il nome di chi scrive viene ricordato nel browser e condiviso da tutti i
 * giochi: gli invitati usano un account solo, quindi questo e' l'unico modo
 * per non far riscrivere il nome a ogni contributo.
 */
const CHIAVE_AUTORE = 'giochilaurea:autore'

export function leggiAutore(): string {
  try {
    return localStorage.getItem(CHIAVE_AUTORE) ?? ''
  } catch {
    return ''
  }
}

export function salvaAutore(nome: string): void {
  try {
    localStorage.setItem(CHIAVE_AUTORE, nome)
  } catch {
    /* localStorage non disponibile: pazienza */
  }
}
