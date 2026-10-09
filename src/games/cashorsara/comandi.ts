import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
  COLLEZIONE_OGGETTI,
  COLLEZIONE_PARTITA,
  ID_PARTITA,
  idRisposta,
  type Oggetto,
  type Partita,
} from './types'

const rifPartita = () => doc(db, COLLEZIONE_PARTITA, ID_PARTITA)
const rifGiocatori = () => collection(db, COLLEZIONE_PARTITA, ID_PARTITA, 'giocatori')
const rifRisposte = () => collection(db, COLLEZIONE_PARTITA, ID_PARTITA, 'risposte')

function datiPubblici(oggetto: Oggetto): Partial<Partita> {
  // del valore vero non si scrive nulla: arriva solo al momento della rivelazione
  return {
    oggettoId: oggetto.id,
    oggettoNome: oggetto.nome,
    oggettoStoria: oggetto.storia,
    oggettoFoto: oggetto.foto ?? null,
  }
}

async function svuota(riferimento: ReturnType<typeof rifRisposte>) {
  const istantanea = await getDocs(riferimento)
  if (istantanea.empty) return
  const lotto = writeBatch(db)
  istantanea.docs.forEach((d) => lotto.delete(d.ref))
  await lotto.commit()
}

/** Azzera tutto: giocatori, puntate e stato. Serve dopo le prove. */
export async function azzeraPartita(oggetti: Oggetto[]) {
  await Promise.all([svuota(rifRisposte()), svuota(rifGiocatori())])
  await setDoc(rifPartita(), {
    stato: 'attesa',
    indice: 0,
    totale: oggetti.length,
    oggettoId: null,
    oggettoNome: '',
    oggettoStoria: '',
    oggettoFoto: null,
    valoriRivelati: {},
    aggiornataIl: serverTimestamp(),
  })
}

/** Apre le puntate su un oggetto. */
export async function apriOggetto(oggetti: Oggetto[], indice: number) {
  const oggetto = oggetti[indice]
  if (!oggetto) return
  await setDoc(
    rifPartita(),
    {
      stato: 'puntate',
      indice,
      totale: oggetti.length,
      ...datiPubblici(oggetto),
      aggiornataIl: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function chiudiPuntate() {
  await updateDoc(rifPartita(), { stato: 'chiuse', aggiornataIl: serverTimestamp() })
}

/** Rende pubblico il valore vero: da qui in poi tutti possono vedere i punti. */
export async function rivelaValore(indice: number, valore: number) {
  await updateDoc(rifPartita(), {
    stato: 'rivelato',
    [`valoriRivelati.${indice}`]: valore,
    aggiornataIl: serverTimestamp(),
  })
}

export async function terminaPartita() {
  await updateDoc(rifPartita(), { stato: 'finita', aggiornataIl: serverTimestamp() })
}

export async function tornaInAttesa() {
  await updateDoc(rifPartita(), { stato: 'attesa', aggiornataIl: serverTimestamp() })
}

/** Un giocatore entra (o cambia nome) usando la propria identita' anonima. */
export async function entraInPartita(giocatoreId: string, nome: string) {
  await setDoc(
    doc(rifGiocatori(), giocatoreId),
    { nome, entratoIl: serverTimestamp() },
    { merge: true },
  )
}

export async function inviaPuntata(
  indice: number,
  giocatoreId: string,
  nome: string,
  valore: number,
) {
  await setDoc(doc(rifRisposte(), idRisposta(indice, giocatoreId)), {
    indice,
    giocatoreId,
    nome,
    valore,
    inviataIl: serverTimestamp(),
  })
}

/** Giocatore senza telefono: lo iscrive Oder e punta al posto suo. */
export async function aggiungiGiocatoreManuale(nome: string): Promise<string> {
  const id = `manuale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  await setDoc(doc(rifGiocatori(), id), {
    nome,
    manuale: true,
    entratoIl: serverTimestamp(),
  })
  return id
}

export async function rimuoviGiocatore(giocatoreId: string) {
  await deleteDoc(doc(rifGiocatori(), giocatoreId))
}

/**
 * Legge gli oggetti una volta sola, senza restare in ascolto: serve alla
 * proiezione per eseguire i comandi (per esempio la rivelazione) senza mai
 * tenere in pagina la valutazione vera.
 */
export async function caricaOggetti(): Promise<Oggetto[]> {
  const istantanea = await getDocs(collection(db, COLLEZIONE_OGGETTI))
  return istantanea.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Oggetto, 'id'>) }))
    .sort((a, b) => a.ordine - b.ordine)
}
