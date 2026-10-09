import { useEffect, useState } from 'react'

interface Props {
  testo: string
  lato: number
}

/** Codice QR disegnato al volo: la libreria si carica solo quando serve. */
export default function Qr({ testo, lato }: Props) {
  const [immagine, setImmagine] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false
    import('qrcode')
      .then((modulo) =>
        modulo.default.toDataURL(testo, {
          width: lato,
          margin: 1,
          color: { dark: '#5f162c', light: '#ffffff' },
        }),
      )
      .then((url) => {
        if (!annullato) setImmagine(url)
      })
      .catch(() => {
        if (!annullato) setImmagine(null)
      })
    return () => {
      annullato = true
    }
  }, [testo, lato])

  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white p-3 shadow-lg"
      style={{ width: lato + 24, height: lato + 24 }}
    >
      {immagine ? (
        <img src={immagine} width={lato} height={lato} alt="Codice QR per entrare in partita" />
      ) : (
        <span className="text-sm text-inchiostro/40">…</span>
      )}
    </div>
  )
}
