import { MM_PER_PUNTO } from '../shared/stampa'
import type { Cartella, FormaCartella } from './generator'
import { regolePerBlocco } from './regole'

export const TITOLO_BINGO = 'BingoSara'

export type CartellePerFoglio = 1 | 2 | 3 | 4 | 6 | 8

const PAGINA = { larghezza: 210, altezza: 297 }
/** Margine di sicurezza per la stampa: sotto i 10 mm molte stampanti tagliano. */
const MARGINE = 10
/** Spazio fra una cartella e l'altra, per avere dove passare con le forbici. */
const DISTANZA = 6
/** Sotto questa larghezza la testata della cartella non ci sta. */
const LARGHEZZA_MINIMA = 55

/** Da che lato la stampante gira il foglio nel fronte/retro. */
export type LatoRilegatura = 'lungo' | 'corto'

export interface OpzioniStampa {
  forma: FormaCartella
  perFoglio: CartellePerFoglio
  /** Stampa le regole sul retro di ogni cartella. */
  regole?: boolean
  rilegatura?: LatoRilegatura
}

interface Misure {
  colonnePagina: number
  righePagina: number
  larghezzaCartella: number
  altezzaCartella: number
  cella: number
  bordo: number
  dimTitolo: number
  altezzaTestata: number
  dimPiede: number
  altezzaPiede: number
}

/**
 * Sceglie come disporre le cartelle sul foglio. Con cartelle larghe e basse
 * conviene impilarle una sotto l'altra, con cartelle quadrate conviene
 * affiancarle: si provano tutte le combinazioni e si tiene quella che fa
 * uscire le caselle piu' grandi.
 */
function calcolaMisure(forma: FormaCartella, perFoglio: number): Misure {
  const utileL = PAGINA.larghezza - MARGINE * 2
  const utileA = PAGINA.altezza - MARGINE * 2
  let migliore: Misure | null = null

  for (let colonnePagina = 1; colonnePagina <= perFoglio; colonnePagina++) {
    if (perFoglio % colonnePagina !== 0) continue
    const righePagina = perFoglio / colonnePagina

    const larghezzaDisponibile = (utileL - (colonnePagina - 1) * DISTANZA) / colonnePagina
    const altezzaDisponibile = (utileA - (righePagina - 1) * DISTANZA) / righePagina
    if (larghezzaDisponibile < LARGHEZZA_MINIMA) continue

    const bordo = Math.min(4, larghezzaDisponibile * 0.04)
    const dimTitolo = Math.min(15, Math.max(7, larghezzaDisponibile * 0.1))
    const altezzaTestata = dimTitolo * MM_PER_PUNTO + 3
    const dimPiede = Math.min(9, Math.max(5, larghezzaDisponibile * 0.05))
    const altezzaPiede = dimPiede * MM_PER_PUNTO + 3.5

    const cella = Math.min(
      (larghezzaDisponibile - bordo * 2) / forma.colonne,
      (altezzaDisponibile - bordo * 2 - altezzaTestata - altezzaPiede) / forma.righe,
    )
    if (cella <= 0) continue

    // la cartella si stringe sul contenuto: niente spazio vuoto da ritagliare
    const larghezzaCartella = Math.max(
      LARGHEZZA_MINIMA,
      Math.min(larghezzaDisponibile, cella * forma.colonne + bordo * 2),
    )
    const altezzaCartella = bordo * 2 + altezzaTestata + cella * forma.righe + altezzaPiede

    if (!migliore || cella > migliore.cella) {
      migliore = {
        colonnePagina,
        righePagina,
        larghezzaCartella,
        altezzaCartella,
        cella,
        bordo,
        dimTitolo,
        altezzaTestata,
        dimPiede,
        altezzaPiede,
      }
    }
  }

  if (migliore) return migliore
  throw new Error('Non ci sta una cartella di questa forma sul foglio.')
}
export async function costruisciPdfCartelle(cartelle: Cartella[], opzioni: OpzioniStampa) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const { forma, perFoglio, regole = true, rilegatura = 'lungo' } = opzioni
  const m = calcolaMisure(forma, perFoglio)

  const bordoCella = m.cella * 0.08
  const larghezzaTesto = m.cella - bordoCella * 2
  // in fondo a ogni casella resta il posto per il pallino da barrare a penna
  const raggioPunto = Math.min(1.4, Math.max(0.8, m.cella * 0.055))
  const spazioPunto = raggioPunto * 2 + 0.5
  const altezzaTesto = m.cella - bordoCella * 2 - spazioPunto

  // Quasi tutte le caselle usano la stessa dimensione, scelta come la piu'
  // grande che va bene per almeno il 90% delle frasi: cosi' una singola frase
  // lunghissima non rimpicciolisce il testo di tutte le altre. Le poche frasi
  // che non ci stanno si riducono da sole.
  const DIMENSIONI = [11, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4]

  function entra(testo: string, dimensione: number): boolean {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(dimensione)
    const righe = doc.splitTextToSize(testo, larghezzaTesto) as string[]
    return righe.length * dimensione * MM_PER_PUNTO * 1.12 <= altezzaTesto
  }

  const testi = [...new Set(cartelle.flatMap((c) => c.caselle))]
  const massimaPerTesto = new Map<string, number>()
  for (const testo of testi) {
    const trovata = DIMENSIONI.find((prova) => entra(testo, prova))
    massimaPerTesto.set(testo, trovata ?? DIMENSIONI[DIMENSIONI.length - 1])
  }

  const ordinate = [...massimaPerTesto.values()].sort((a, b) => a - b)
  const dimTesto = ordinate[Math.floor(ordinate.length * 0.1)] ?? DIMENSIONI[0]
  const dimensionePer = (testo: string) => Math.min(dimTesto, massimaPerTesto.get(testo) ?? dimTesto)
  const ridotte = testi.filter((testo) => dimensionePer(testo) < dimTesto).length

  function disegnaCartella(cartella: Cartella, x: number, y: number) {
    doc.setDrawColor(201, 162, 39)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, m.larghezzaCartella, m.altezzaCartella, 2, 2, 'S')

    const yTestata = y + m.bordo + m.dimTitolo * MM_PER_PUNTO
    doc.setFont('times', 'bold')
    doc.setFontSize(m.dimTitolo)
    doc.setTextColor(123, 30, 58)
    doc.text(TITOLO_BINGO, x + m.bordo, yTestata)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(m.dimPiede)
    doc.setTextColor(150, 135, 125)
    doc.text(`n. ${cartella.numero}`, x + m.larghezzaCartella - m.bordo, yTestata, {
      align: 'right',
    })

    const xGriglia = x + (m.larghezzaCartella - m.cella * forma.colonne) / 2
    const yGriglia = y + m.bordo + m.altezzaTestata
    const posizione = (i: number) => ({
      cx: xGriglia + (i % forma.colonne) * m.cella,
      cy: yGriglia + Math.floor(i / forma.colonne) * m.cella,
    })

    // prima tutte le caselle: scrivere del testo cambia il colore di riempimento
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(70, 60, 55)
    doc.setLineWidth(0.2)
    for (let i = 0; i < cartella.caselle.length; i++) {
      const { cx, cy } = posizione(i)
      doc.setFillColor(255, 255, 255)
      doc.rect(cx, cy, m.cella, m.cella, 'FD')
    }

    // poi il pallino da barrare, in fondo a ogni casella
    for (let i = 0; i < cartella.caselle.length; i++) {
      const { cx, cy } = posizione(i)
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(150, 135, 125)
      doc.setLineWidth(0.25)
      doc.circle(
        cx + m.cella / 2,
        cy + m.cella - bordoCella - raggioPunto,
        raggioPunto,
        'FD',
      )
    }

    // infine i testi, centrati nello spazio sopra il pallino
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 35, 32)
    for (let i = 0; i < cartella.caselle.length; i++) {
      const { cx, cy } = posizione(i)
      const testo = cartella.caselle[i]
      const dimensione = dimensionePer(testo)
      const interlinea = dimensione * MM_PER_PUNTO * 1.12
      doc.setFontSize(dimensione)
      const righe = doc.splitTextToSize(testo, larghezzaTesto) as string[]
      const centro = cy + bordoCella + altezzaTesto / 2
      let ty = centro - (righe.length * interlinea) / 2 + interlinea * 0.78
      for (const riga of righe) {
        doc.text(riga, cx + m.cella / 2, ty, { align: 'center' })
        ty += interlinea
      }
    }

    const yPiede = y + m.altezzaCartella - m.bordo - 1
    doc.setFont('times', 'italic')
    doc.setFontSize(m.dimPiede)
    doc.setTextColor(120, 105, 95)
    doc.text('Nome:', x + m.bordo, yPiede)
    doc.setDrawColor(190, 175, 160)
    doc.setLineWidth(0.2)
    doc.line(
      x + m.bordo + doc.getTextWidth('Nome:') + 2,
      yPiede,
      x + m.larghezzaCartella - m.bordo,
      yPiede,
    )
  }

  // il blocco delle cartelle viene centrato sul foglio
  const larghezzaBlocco = m.colonnePagina * m.larghezzaCartella + (m.colonnePagina - 1) * DISTANZA
  const altezzaBlocco = m.righePagina * m.altezzaCartella + (m.righePagina - 1) * DISTANZA
  const partenzaX = Math.max(MARGINE, (PAGINA.larghezza - larghezzaBlocco) / 2)
  const partenzaY = Math.max(MARGINE, (PAGINA.altezza - altezzaBlocco) / 2)

  const posizioneDi = (indice: number) => ({
    x: partenzaX + (indice % m.colonnePagina) * (m.larghezzaCartella + DISTANZA),
    y: partenzaY + Math.floor(indice / m.colonnePagina) * (m.altezzaCartella + DISTANZA),
  })

  // Girando il foglio le posizioni si ribaltano: con la rilegatura sul lato
  // lungo si specchiano le colonne, con quella sul lato corto le righe. Cosi'
  // le regole finiscono esattamente dietro alla cartella giusta.
  const specchia = (indice: number) => {
    const colonna = indice % m.colonnePagina
    const riga = Math.floor(indice / m.colonnePagina)
    return rilegatura === 'lungo'
      ? riga * m.colonnePagina + (m.colonnePagina - 1 - colonna)
      : (m.righePagina - 1 - riga) * m.colonnePagina + colonna
  }

  const pagine: Cartella[][] = []
  for (let i = 0; i < cartelle.length; i += perFoglio) pagine.push(cartelle.slice(i, i + perFoglio))

  const retro = regole ? regolePerBlocco(doc, m.larghezzaCartella, m.altezzaCartella) : null

  pagine.forEach((pagina, indicePagina) => {
    if (indicePagina > 0) doc.addPage()
    pagina.forEach((cartella, posizione) => {
      const p = posizioneDi(posizione)
      disegnaCartella(cartella, p.x, p.y)
    })

    if (retro) {
      doc.addPage()
      pagina.forEach((_, posizione) => {
        const p = posizioneDi(specchia(posizione))
        doc.setDrawColor(201, 162, 39)
        doc.setLineWidth(0.4)
        doc.roundedRect(p.x, p.y, m.larghezzaCartella, m.altezzaCartella, 2, 2, 'S')
        retro.regole.disegna(p.x, p.y)
      })
    }
  })

  return { doc, dimTesto, ridotte, dimRegole: retro?.dimensione ?? null, misure: m }
}

export async function scaricaCartelle(cartelle: Cartella[], opzioni: OpzioniStampa) {
  const { doc } = await costruisciPdfCartelle(cartelle, opzioni)
  doc.save(`bingosara-cartelle-${cartelle.length}.pdf`)
}

export interface StimaStampa {
  larghezzaCartella: number
  altezzaCartella: number
  cella: number
  fogli: number
}

/** Misure che verranno stampate, senza dover costruire il PDF. */
export function stimaStampa(
  forma: FormaCartella,
  perFoglio: CartellePerFoglio,
  quante: number,
): StimaStampa | null {
  try {
    const m = calcolaMisure(forma, perFoglio)
    return {
      larghezzaCartella: m.larghezzaCartella,
      altezzaCartella: m.altezzaCartella,
      cella: m.cella,
      fogli: Math.ceil(quante / perFoglio),
    }
  } catch {
    return null
  }
}
