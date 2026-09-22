/**
 * Generatore di numeri casuali deterministico: con lo stesso seme la sequenza
 * e' sempre la stessa, quindi anteprima e file scaricato coincidono e nulla
 * cambia a ogni ricaricamento della pagina.
 */
export function mulberry32(seme: number): () => number {
  let a = seme >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mescola l'array sul posto (Fisher-Yates) usando il generatore dato. */
export function mescola<T>(elementi: T[], random: () => number): void {
  for (let i = elementi.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = elementi[i]
    elementi[i] = elementi[j]
    elementi[j] = tmp
  }
}
