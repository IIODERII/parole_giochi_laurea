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
import { db } from '../../firebase'
import { messaggioErroreFirestore } from '../shared/raccolta'
import { COLLEZIONE_OGGETTI, type Oggetto } from './types'

export type DatiOggetto = Omit<Oggetto, 'id' | 'createdAt'>

export function useOggetti() {
  const [oggetti, setOggetti] = useState<Oggetto[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    const richiesta = query(collection(db, COLLEZIONE_OGGETTI), orderBy('ordine', 'asc'))
    return onSnapshot(
      richiesta,
      (istantanea) => {
        setOggetti(istantanea.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Oggetto, 'id'>) })))
        setErrore(null)
        setCaricamento(false)
      },
      (err) => {
        setErrore(messaggioErroreFirestore(err))
        setCaricamento(false)
      },
    )
  }, [])

  const aggiungi = useCallback(async (dati: DatiOggetto) => {
    await addDoc(collection(db, COLLEZIONE_OGGETTI), { ...dati, createdAt: serverTimestamp() })
  }, [])

  const modifica = useCallback(async (id: string, dati: Partial<DatiOggetto>) => {
    await updateDoc(doc(db, COLLEZIONE_OGGETTI, id), { ...dati })
  }, [])

  const elimina = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLEZIONE_OGGETTI, id))
  }, [])

  /** Scambia di posto un oggetto con quello precedente o successivo. */
  const sposta = useCallback(
    async (id: string, direzione: -1 | 1) => {
      const posizione = oggetti.findIndex((o) => o.id === id)
      const vicino = oggetti[posizione + direzione]
      if (posizione < 0 || !vicino) return
      const corrente = oggetti[posizione]
      await Promise.all([
        updateDoc(doc(db, COLLEZIONE_OGGETTI, corrente.id), { ordine: vicino.ordine }),
        updateDoc(doc(db, COLLEZIONE_OGGETTI, vicino.id), { ordine: corrente.ordine }),
      ])
    },
    [oggetti],
  )

  return { oggetti, caricamento, errore, aggiungi, modifica, elimina, sposta }
}
