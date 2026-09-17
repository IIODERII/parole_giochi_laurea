import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { auth, db } from '../../firebase'
import type { DatiParola, Parola } from './types'

export const COLLEZIONE_PAROLE = 'parole'

export function messaggioErroreFirestore(errore: unknown): string {
  const codice = (errore as { code?: string })?.code ?? ''
  if (codice === 'permission-denied') {
    return 'Operazione non permessa: controlla di avere i permessi giusti.'
  }
  if (codice === 'unavailable' || codice === 'failed-precondition') {
    return 'Database non raggiungibile: controlla la connessione e riprova.'
  }
  return 'Qualcosa è andato storto. Riprova tra un attimo.'
}

export function useParole() {
  const [parole, setParole] = useState<Parola[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    const richiesta = query(collection(db, COLLEZIONE_PAROLE), orderBy('createdAt', 'desc'))
    return onSnapshot(
      richiesta,
      (istantanea) => {
        setParole(
          istantanea.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Parola, 'id'>) })),
        )
        setErrore(null)
        setCaricamento(false)
      },
      (err) => {
        setErrore(messaggioErroreFirestore(err))
        setCaricamento(false)
      },
    )
  }, [])

  const aggiungi = useCallback(async (dati: DatiParola) => {
    await addDoc(collection(db, COLLEZIONE_PAROLE), {
      parola: dati.parola,
      definizione: dati.definizione,
      autore: dati.autore ?? '',
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email ?? '',
    })
  }, [])

  const modifica = useCallback(async (id: string, dati: DatiParola) => {
    await updateDoc(doc(db, COLLEZIONE_PAROLE, id), {
      parola: dati.parola,
      definizione: dati.definizione,
      autore: dati.autore ?? '',
    })
  }, [])

  const elimina = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLEZIONE_PAROLE, id))
  }, [])

  return { parole, caricamento, errore, aggiungi, modifica, elimina }
}
