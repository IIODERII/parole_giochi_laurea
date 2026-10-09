import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Corpo massimo del testo in pixel: si scende finche' non ci sta. */
  massimo?: number
  minimo?: number
  className?: string
}

/**
 * Nuvoletta da fumetto con la punta a sinistra, verso la foto del
 * presentatore. Il testo si rimpicciolisce da solo per stare tutto nello
 * spazio disponibile: sulla TV non si puo' scorrere.
 */
export default function Fumetto({ children, massimo = 48, minimo = 18, className = '' }: Props) {
  const spazio = useRef<HTMLDivElement>(null)
  const testo = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const box = spazio.current
    const contenuto = testo.current
    if (!box || !contenuto) return

    const adatta = () => {
      const ciSta = (px: number) => {
        contenuto.style.fontSize = `${px}px`
        return contenuto.scrollHeight <= box.clientHeight
      }
      // ricerca binaria sul corpo del testo
      let basso = minimo
      let alto = massimo
      if (ciSta(alto)) return
      while (alto - basso > 1) {
        const medio = Math.floor((basso + alto) / 2)
        if (ciSta(medio)) basso = medio
        else alto = medio
      }
      ciSta(basso)
    }

    adatta()
    const osservatore = new ResizeObserver(adatta)
    osservatore.observe(box)
    // il font da fumetto arriva da Google Fonts: rimisura quando e' pronto
    document.fonts?.ready.then(adatta)
    return () => osservatore.disconnect()
  }, [children, massimo, minimo])

  return (
    <div
      className={`relative ml-14 flex rounded-[2.5rem] border-4 border-inchiostro bg-crema-50
                  px-10 py-8 text-inchiostro shadow-[8px_8px_0_rgba(0,0,0,0.35)] ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 64 48"
        className="absolute top-10 -left-[60px] h-12 w-16"
      >
        <polygon points="64,2 2,10 64,40" className="fill-crema-50" />
        <polyline
          points="64,2 2,10 64,40"
          className="fill-none stroke-inchiostro"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </svg>
      <div ref={spazio} className="min-h-0 w-full flex-1 overflow-hidden">
        <div
          ref={testo}
          className="font-fumetto leading-snug font-bold whitespace-pre-line"
          style={{ fontSize: massimo }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
