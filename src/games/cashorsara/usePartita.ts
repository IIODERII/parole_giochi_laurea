import { collection, doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { messaggioErroreFirestore } from '../shared/raccolta'
import {
  COLLEZIONE_PARTITA,
  ID_PARTITA,
  PARTITA_VUOTA,
  type Giocatore,
  type Partita,
  type Risposta,
} from './types'

/** Segue in tempo reale stato della partita, giocatori presenti e puntate. */
export function usePartita() {
  const [partita, setPartita] = useState<Partita>(PARTITA_VUOTA)
  const [giocatori, setGiocatori] = useState<Giocatore[]>([])
  const [risposte, setRisposte] = useState<Risposta[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    const fermaPartita = onSnapshot(
      doc(db, COLLEZIONE_PARTITA, ID_PARTITA),
      (istantanea) => {
        const dati = istantanea.data() as Partita | undefined
        setPartita(dati ? { ...PARTITA_VUOTA, ...dati } : PARTITA_VUOTA)
        setErrore(null)
        setCaricamento(false)
      },
      (err) => {
        setErrore(messaggioErroreFirestore(err))
        setCaricamento(false)
      },
    )

    const fermaGiocatori = onSnapshot(
      collection(db, COLLEZIONE_PARTITA, ID_PARTITA, 'giocatori'),
      (istantanea) => {
        setGiocatori(
          istantanea.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Giocatore, 'id'>) }))
            .sort((a, b) => a.nome.localeCompare(b.nome)),
        )
      },
    )

    const fermaRisposte = onSnapshot(
      collection(db, COLLEZIONE_PARTITA, ID_PARTITA, 'risposte'),
      (istantanea) => {
        setRisposte(istantanea.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Risposta, 'id'>) })))
      },
    )

    return () => {
      fermaPartita()
      fermaGiocatori()
      fermaRisposte()
    }
  }, [])

  const risposteDelTurno = risposte.filter((r) => r.indice === partita.indice)

  return { partita, giocatori, risposte, risposteDelTurno, caricamento, errore }
}

/** Indirizzo da mettere nel QR: la pagina di gioco di questo stesso sito. */
export function indirizzoGioco(): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/gioca`
}
