import type { Timestamp } from 'firebase/firestore'

/** Documento della collezione "parole" su Firestore. */
export interface Parola {
  id: string
  parola: string
  definizione: string
  autore?: string
  createdAt?: Timestamp | null
  createdBy?: string
}

export interface DatiParola {
  parola: string
  definizione: string
  autore?: string
}
