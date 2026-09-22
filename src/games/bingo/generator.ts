import { mescola, mulberry32 } from '../shared/random'
import type { Frase } from './types'

export interface Cartella {
  numero: number
  /** Una frase per casella, nell'ordine di lettura della griglia. */
  caselle: string[]
}

export interface FormaCartella {
  colonne: number
  righe: number
}

export interface OpzioniCartelle extends FormaCartella {
  /** Quante cartelle diverse produrre. */
  quante: number
  /** Cambiando il seme cambia la distribuzione delle frasi. */
  seme: number
}

export interface EsitoCartelle {
  cartelle: Cartella[]
  /** Quante frasi servono per riempire una cartella. */
  necessarie: number
  disponibili: number
  errore?: string
  avviso?: string
}

export function fraseNecessarie(forma: FormaCartella): number {
  return forma.colonne * forma.righe
}

/**
 * Costruisce cartelle diverse fra loro pescando dalle frasi raccolte.
 *
 * Le frasi vengono distribuite in modo uniforme: a ogni cartella tocca prima
 * chi e' comparso meno volte, cosi' nessuna frase resta inutilizzata e nessuna
 * finisce su tutte le cartelle. Con lo stesso seme il risultato e' sempre lo
 * stesso, quindi l'anteprima sullo schermo e il PDF stampato coincidono.
 */
export function generaCartelle(frasi: Frase[], opzioni: OpzioniCartelle): EsitoCartelle {
  const { colonne, righe, quante, seme } = opzioni
  const necessarie = fraseNecessarie({ colonne, righe })
  const disponibili = frasi.length

  if (disponibili < necessarie) {
    return {
      cartelle: [],
      necessarie,
      disponibili,
      errore: `Per cartelle ${colonne}×${righe} servono almeno ${necessarie} frasi: ne mancano ${
        necessarie - disponibili
      }.`,
    }
  }

  const random = mulberry32(seme * 7919 + colonne * 131 + righe * 31 + 17)
  const usi = new Map<string, number>()
  const impronteViste = new Set<string>()
  const cartelle: Cartella[] = []

  for (let n = 0; n < quante; n++) {
    // prima le frasi usate meno finora, a parita' di uso in ordine casuale
    const ordinate = frasi
      .map((frase) => ({ frase, peso: (usi.get(frase.id) ?? 0) + random() }))
      .sort((a, b) => a.peso - b.peso)
      .slice(0, necessarie)
      .map((v) => v.frase)

    let scelte = ordinate
    for (let tentativo = 0; tentativo < 6; tentativo++) {
      mescola(scelte, random)
      const impronta = scelte.map((f) => f.id).join('|')
      if (!impronteViste.has(impronta)) {
        impronteViste.add(impronta)
        break
      }
      scelte = ordinate.slice()
    }

    for (const frase of scelte) usi.set(frase.id, (usi.get(frase.id) ?? 0) + 1)
    cartelle.push({ numero: n + 1, caselle: scelte.map((frase) => frase.testo) })
  }

  const avviso =
    disponibili < necessarie * 1.5
      ? `Con ${disponibili} frasi le cartelle si somigliano parecchio: raccoglierne almeno ${Math.ceil(
          necessarie * 1.5,
        )} le renderebbe più diverse fra loro.`
      : undefined

  return { cartelle, necessarie, disponibili, avviso }
}
