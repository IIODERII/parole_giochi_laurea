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
  type Timestamp,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { auth, db } from '../../firebase'

/** Campi comuni a tutto quello che gli invitati scrivono sul sito. */
export interface Voce {
  id: string
  autore?: string
  createdAt?: Timestamp | null
  createdBy?: string
}

/** Quello che serve per creare o aggiornare una voce: il resto lo mette il sito. */
export type DatiVoce<T extends Voce> = Omit<T, 'id' | 'createdAt' | 'createdBy'>

export function messaggioErroreFirestore(errore: unknown): string {
  const codice = (errore as { code?: string })?.code ?? ''
  if (codice === 'permission-denied') {
    return 'Operazione non permessa: controlla di avere i permessi giusti.'
  }
  if (codice === 'unavailable' || codice === 'failed-precondition') {
    return 'Database non raggiungibile: controlla la connessione e riprova.'
  }
  return 'Qualcosa è andato storto. Riprova tra un attimo.'
}

/**
 * Tiene sincronizzata una collezione di Firestore con la pagina: l'elenco si
 * aggiorna da solo quando qualcuno aggiunge o toglie qualcosa, da qualunque
 * telefono lo faccia.
 */
export function useRaccolta<T extends Voce>(collezione: string) {
  const [voci, setVoci] = useState<T[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    setCaricamento(true)
    const richiesta = query(collection(db, collezione), orderBy('createdAt', 'desc'))
    return onSnapshot(
      richiesta,
      (istantanea) => {
        setVoci(istantanea.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) }) as T))
        setErrore(null)
        setCaricamento(false)
      },
      (err) => {
        setErrore(messaggioErroreFirestore(err))
        setCaricamento(false)
      },
    )
  }, [collezione])

  const aggiungi = useCallback(
    async (dati: DatiVoce<T>) => {
      await addDoc(collection(db, collezione), {
        ...dati,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email ?? '',
      })
    },
    [collezione],
  )

  const modifica = useCallback(
    async (id: string, dati: DatiVoce<T>) => {
      await updateDoc(doc(db, collezione, id), { ...dati } as Record<string, unknown>)
    },
    [collezione],
  )

  const elimina = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, collezione, id))
    },
    [collezione],
  )

  return { voci, caricamento, errore, aggiungi, modifica, elimina }
}
