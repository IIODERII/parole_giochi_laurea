/** Oltre questo lato l'immagine viene rimpicciolita prima di salvarla. */
const LATO_MASSIMO = 1000
/** Un documento Firestore sta sotto 1 MB: si tiene un buon margine. */
const PESO_MASSIMO = 650_000

/**
 * Riduce una foto scelta dal telefono o dal computer a una stringa che sta
 * dentro un documento Firestore. Cosi' non serve Firebase Storage, che sul
 * piano gratuito non e' disponibile.
 */
export async function comprimiFoto(file: File): Promise<string> {
  const immagine = await createImageBitmap(file)
  let lato = LATO_MASSIMO

  for (let tentativo = 0; tentativo < 4; tentativo++) {
    const scala = Math.min(1, lato / Math.max(immagine.width, immagine.height))
    const larghezza = Math.round(immagine.width * scala)
    const altezza = Math.round(immagine.height * scala)

    const tela = document.createElement('canvas')
    tela.width = larghezza
    tela.height = altezza
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('Il browser non permette di elaborare l immagine')
    ctx.drawImage(immagine, 0, 0, larghezza, altezza)

    for (const qualita of [0.7, 0.6, 0.5, 0.4]) {
      const risultato = tela.toDataURL('image/jpeg', qualita)
      if (risultato.length <= PESO_MASSIMO) {
        immagine.close()
        return risultato
      }
    }
    lato = Math.round(lato * 0.75)
  }

  immagine.close()
  throw new Error('Foto troppo pesante: provane una piu piccola')
}
