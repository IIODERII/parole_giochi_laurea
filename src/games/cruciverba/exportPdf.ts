import type { Cruciverba } from './generator'
import { calcolaPoster, type FormatoFoglio, type Misuratore } from './poster'

/**
 * Genera e scarica il cartellone: una pagina con la griglia vuota e, sotto,
 * le definizioni su due colonne. La soluzione non viene stampata.
 */
export async function costruisciPdf(cruciverba: Cruciverba, formato: FormatoFoglio = 'a4') {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: formato })

  const misura: Misuratore = (testo, larghezzaMax, dimensione) => {
    doc.setFont('times', 'normal')
    doc.setFontSize(dimensione)
    return doc.splitTextToSize(testo, larghezzaMax) as string[]
  }

  const poster = calcolaPoster(cruciverba, formato, misura)

  // --- intestazione ------------------------------------------------------
  doc.setFont('times', 'bold')
  doc.setFontSize(poster.titolo.dimensione)
  doc.setTextColor(123, 30, 58)
  doc.text(poster.titolo.testo, poster.centro, poster.titolo.y, { align: 'center' })

  doc.setFont('times', 'italic')
  doc.setFontSize(poster.sottotitolo.dimensione)
  doc.setTextColor(120, 105, 95)
  doc.text(poster.sottotitolo.testo, poster.centro, poster.sottotitolo.y, { align: 'center' })

  doc.setDrawColor(201, 162, 39)
  doc.setLineWidth(0.6)
  doc.line(poster.linea.x1, poster.linea.y, poster.linea.x2, poster.linea.y)

  // --- griglia vuota -----------------------------------------------------
  // Prima tutte le caselle, poi tutti i numeri: in jsPDF scrivere del testo
  // cambia anche il colore di riempimento, quindi mescolare i due passaggi
  // colorerebbe le caselle successive.
  doc.setDrawColor(70, 60, 55)
  doc.setLineWidth(0.25)
  doc.setFillColor(255, 255, 255)
  for (const cella of poster.celle) {
    doc.rect(cella.x, cella.y, poster.lato, poster.lato, 'FD')
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(poster.dimensioneNumero)
  doc.setTextColor(150, 60, 85)
  for (const cella of poster.celle) {
    if (cella.numero !== null) {
      doc.text(String(cella.numero), cella.x + poster.lato * 0.13, cella.y + poster.lato * 0.3)
    }
  }

  // --- definizioni -------------------------------------------------------
  for (const colonna of poster.colonne) {
    let y = poster.yColonne
    doc.setFont('times', 'bold')
    doc.setFontSize(poster.dimensioneTesto + 1)
    doc.setTextColor(123, 30, 58)
    doc.text(colonna.titolo, colonna.x, y)
    y += poster.interlinea * 2

    doc.setFont('times', 'normal')
    doc.setFontSize(poster.dimensioneTesto)
    doc.setTextColor(40, 35, 32)
    for (const blocco of colonna.blocchi) {
      for (const riga of blocco) {
        if (y > poster.altezza - poster.margine) {
          doc.addPage()
          y = poster.margine
        }
        doc.text(riga, colonna.x, y)
        y += poster.interlinea
      }
      y += poster.interlinea * 0.3
    }
  }

  return doc
}

export async function scaricaPdf(cruciverba: Cruciverba, formato: FormatoFoglio = 'a4') {
  const doc = await costruisciPdf(cruciverba, formato)
  doc.save(`crucisara-${formato}.pdf`)
}
