import { MM_PER_PUNTO } from '../shared/stampa'
import {
  calcolaMisure,
  caricaFontTitolo,
  COLORI,
  corniceComePng,
  dimensioniFrasi,
  DISTANZA,
  disponi,
  fontTitoloBase64,
  INTERLINEA,
  MARGINE,
  PAGINA,
  type Scritta,
} from './cartella'
import type { Cartella, FormaCartella } from './generator'
import { FONT_TITOLO_PDF, regolePerBlocco } from './regole'

export { TITOLO_BINGO } from './cartella'

export type CartellePerFoglio = 1 | 2 | 3 | 4 | 6 | 8

/** Da che lato la stampante gira il foglio nel fronte/retro. */
export type LatoRilegatura = 'lungo' | 'corto'

export interface OpzioniStampa {
  forma: FormaCartella
  perFoglio: CartellePerFoglio
  /** Stampa le regole sul retro di ogni cartella. */
  regole?: boolean
  rilegatura?: LatoRilegatura
}

/** Da "#7b1e3a" ai tre numeri che vuole jsPDF. */
function rgb(esadecimale: string): [number, number, number] {
  const n = parseInt(esadecimale.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export async function costruisciPdfCartelle(cartelle: Cartella[], opzioni: OpzioniStampa) {
  const [{ jsPDF }, fontBase64] = await Promise.all([
    import('jspdf'),
    fontTitoloBase64(),
    caricaFontTitolo(),
  ])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('DMSerifDisplay-Regular.ttf', fontBase64)
  doc.addFont('DMSerifDisplay-Regular.ttf', FONT_TITOLO_PDF, 'normal')

  const { forma, perFoglio, regole = true, rilegatura = 'lungo' } = opzioni
  const m = calcolaMisure(forma, perFoglio)
  const d = disponi(m, forma)

  // la cornice e' uguale per tutte: si disegna una volta e si riusa
  const fronte = corniceComePng(d, 'fronte')

  const spazioTesto = d.testi[0]
  const { comune: dimTesto, dimensionePer, ridotte } = dimensioniFrasi(
    cartelle.flatMap((c) => c.caselle),
    spazioTesto,
    (testo, dimensione, larghezza) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(dimensione)
      return doc.splitTextToSize(testo, larghezza) as string[]
    },
  )

  function scrivi(s: Scritta, x: number, y: number, testo = s.testo) {
    doc.setFont(FONT_TITOLO_PDF, 'normal')
    doc.setFontSize(s.dimensione)
    doc.setTextColor(...rgb(COLORI.bordeaux))
    doc.text(testo, x + s.x, y + s.y, { align: s.allinea })
  }

  function disegnaCartella(cartella: Cartella, x: number, y: number) {
    doc.addImage(fronte, 'PNG', x, y, d.larghezza, d.altezza, 'cornice-fronte', 'FAST')

    scrivi(d.titolo, x, y)
    scrivi(d.sottotitolo, x, y, `Cartella n. ${cartella.numero}`)
    scrivi(d.nome, x, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...rgb(COLORI.inchiostro))
    cartella.caselle.forEach((testo, i) => {
      const t = d.testi[i]
      const dimensione = dimensionePer(testo)
      const interlinea = dimensione * MM_PER_PUNTO * INTERLINEA
      doc.setFontSize(dimensione)
      const righe = doc.splitTextToSize(testo, t.l) as string[]
      let ty = y + t.y + t.a / 2 - (righe.length * interlinea) / 2 + interlinea * 0.78
      for (const riga of righe) {
        doc.text(riga, x + t.x + t.l / 2, ty, { align: 'center' })
        ty += interlinea
      }
    })
  }

  // il blocco delle cartelle viene centrato sul foglio
  const larghezzaBlocco = m.colonnePagina * d.larghezza + (m.colonnePagina - 1) * DISTANZA
  const altezzaBlocco = m.righePagina * d.altezza + (m.righePagina - 1) * DISTANZA
  const partenzaX = Math.max(MARGINE, (PAGINA.larghezza - larghezzaBlocco) / 2)
  const partenzaY = Math.max(MARGINE, (PAGINA.altezza - altezzaBlocco) / 2)

  const posizioneDi = (indice: number) => ({
    x: partenzaX + (indice % m.colonnePagina) * (d.larghezza + DISTANZA),
    y: partenzaY + Math.floor(indice / m.colonnePagina) * (d.altezza + DISTANZA),
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

  const retro = regole ? regolePerBlocco(doc, d.retro.l, d.retro.a) : null
  const corniceRetro = retro ? corniceComePng(d, 'retro') : null

  pagine.forEach((pagina, indicePagina) => {
    if (indicePagina > 0) doc.addPage()
    pagina.forEach((cartella, posizione) => {
      const p = posizioneDi(posizione)
      disegnaCartella(cartella, p.x, p.y)
    })

    if (retro && corniceRetro) {
      doc.addPage()
      pagina.forEach((_, posizione) => {
        const p = posizioneDi(specchia(posizione))
        doc.addImage(corniceRetro, 'PNG', p.x, p.y, d.larghezza, d.altezza, 'cornice-retro', 'FAST')
        // le regole stanno al centro dello spazio, non tutte in alto
        const aria = Math.max(0, (d.retro.a - retro.regole.altezza) / 2)
        retro.regole.disegna(p.x + d.retro.x, p.y + d.retro.y + aria)
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
  cellaL: number
  cellaA: number
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
      cellaL: m.cellaL,
      cellaA: m.cellaA,
      fogli: Math.ceil(quante / perFoglio),
    }
  } catch {
    return null
  }
}
