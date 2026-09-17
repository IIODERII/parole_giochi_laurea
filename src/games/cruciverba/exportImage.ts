import type { Cruciverba } from './generator'
import { calcolaPoster, MM_PER_PUNTO, type FormatoFoglio, type Misuratore } from './poster'

/**
 * Punti per pollice dell'immagine prodotta. 300 e' qualita' di stampa;
 * per l'A3 si scende un po' per non generare un file enorme.
 */
const DPI: Record<FormatoFoglio, number> = { a4: 300, a3: 200 }

const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
const SANS = 'Inter, system-ui, sans-serif'

/** Il canvas lavora in millimetri, quindi le dimensioni dei caratteri si convertono. */
function font(dimensione: number, stile: string, famiglia: string): string {
  return `${stile} ${(dimensione * MM_PER_PUNTO).toFixed(3)}px ${famiglia}`
}

function creaMisuratore(): Misuratore {
  const contesto = document.createElement('canvas').getContext('2d')
  const precisione = 10 // si misura piu' grandi e si divide: meno errori di arrotondamento

  return (testo, larghezzaMax, dimensione) => {
    if (!contesto) return [testo]
    contesto.font = `${dimensione * MM_PER_PUNTO * precisione}px ${SERIF}`
    const larghezza = (t: string) => contesto.measureText(t).width / precisione

    const righe: string[] = []
    let corrente = ''
    for (const parola of testo.split(/\s+/)) {
      const prova = corrente ? `${corrente} ${parola}` : parola
      if (!corrente || larghezza(prova) <= larghezzaMax) {
        corrente = prova
      } else {
        righe.push(corrente)
        corrente = parola
      }
    }
    if (corrente) righe.push(corrente)
    return righe.length > 0 ? righe : ['']
  }
}

function scaricaTela(tela: HTMLCanvasElement, nome: string): Promise<void> {
  return new Promise((risolvi, rifiuta) => {
    tela.toBlob((blob) => {
      if (!blob) {
        rifiuta(new Error('Non sono riuscito a creare l immagine'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nome
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      risolvi()
    }, 'image/png')
  })
}

/**
 * Stesso cartellone del PDF, ma come immagine PNG ad alta risoluzione:
 * il disegno e' vettoriale fino all'ultimo momento, quindi non si sgrana.
 */
export async function scaricaImmagine(cruciverba: Cruciverba, formato: FormatoFoglio = 'a4') {
  // senza questa attesa il canvas potrebbe disegnare con un carattere di
  // ripiego, diverso da quello che si vede nel sito
  try {
    await document.fonts.ready
  } catch {
    /* niente */
  }

  const poster = calcolaPoster(cruciverba, formato, creaMisuratore())
  const scala = DPI[formato] / 25.4

  const tela = document.createElement('canvas')
  tela.width = Math.round(poster.larghezza * scala)
  tela.height = Math.round(poster.altezza * scala)
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Il browser non permette di creare l immagine')

  ctx.scale(scala, scala)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, poster.larghezza, poster.altezza)

  // --- intestazione ------------------------------------------------------
  ctx.textAlign = 'center'
  ctx.fillStyle = '#7b1e3a'
  ctx.font = font(poster.titolo.dimensione, '700', SERIF)
  ctx.fillText(poster.titolo.testo, poster.centro, poster.titolo.y)

  ctx.fillStyle = '#786959'
  ctx.font = font(poster.sottotitolo.dimensione, 'italic 500', SERIF)
  ctx.fillText(poster.sottotitolo.testo, poster.centro, poster.sottotitolo.y)

  ctx.strokeStyle = '#c9a227'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(poster.linea.x1, poster.linea.y)
  ctx.lineTo(poster.linea.x2, poster.linea.y)
  ctx.stroke()

  // --- griglia vuota -----------------------------------------------------
  ctx.lineWidth = 0.25
  ctx.strokeStyle = '#463c37'
  for (const cella of poster.celle) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cella.x, cella.y, poster.lato, poster.lato)
    ctx.strokeRect(cella.x, cella.y, poster.lato, poster.lato)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = '#963c55'
  ctx.font = font(poster.dimensioneNumero, '600', SANS)
  for (const cella of poster.celle) {
    if (cella.numero !== null) {
      ctx.fillText(String(cella.numero), cella.x + poster.lato * 0.13, cella.y + poster.lato * 0.3)
    }
  }

  // --- definizioni -------------------------------------------------------
  for (const colonna of poster.colonne) {
    let y = poster.yColonne
    ctx.fillStyle = '#7b1e3a'
    ctx.font = font(poster.dimensioneTesto + 1, '700', SERIF)
    ctx.fillText(colonna.titolo, colonna.x, y)
    y += poster.interlinea * 2

    ctx.fillStyle = '#282320'
    ctx.font = font(poster.dimensioneTesto, '400', SERIF)
    for (const blocco of colonna.blocchi) {
      for (const riga of blocco) {
        ctx.fillText(riga, colonna.x, y)
        y += poster.interlinea
      }
      y += poster.interlinea * 0.3
    }
  }

  await scaricaTela(tela, `crucisara-${formato}.png`)
}
