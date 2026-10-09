import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { FESTEGGIATA } from '../../config'
import {
  apriOggetto,
  caricaOggetti,
  chiudiPuntate,
  rivelaValore,
  terminaPartita,
} from './comandi'
import Fumetto from './Fumetto'
import { classifica, esitiTurno } from './punteggi'
import Qr from './Qr'
import { euro, FOTO_PRESENTATORE, PRESENTATORE, TITOLO_GIOCO, type Partita } from './types'
import { indirizzoGioco, usePartita } from './usePartita'

/**
 * Alessandro Rosa a tutta altezza sul lato sinistro: e' lui che "parla" nei
 * fumetti. Se la foto non e' ancora in public/cashorsara/ la colonna sparisce.
 */
function Presentatore() {
  const [mancante, setMancante] = useState(false)
  if (mancante) return null

  return (
    // la foto e' scontornata e quasi quadrata: resta alta quanto lo schermo e
    // deborda dalla colonna, a sinistra fuori schermo e a destra sotto il fumetto
    <aside className="relative hidden h-screen w-[30vw] max-w-160 shrink-0 md:block">
      <img
        src={FOTO_PRESENTATORE}
        alt={PRESENTATORE}
        onError={() => setMancante(true)}
        className="absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 drop-shadow-2xl"
      />
      <p className="absolute bottom-6 left-6 rounded-full bg-bordeaux-900/85 px-6 py-2 font-display text-4xl font-semibold text-oro-300">
        {PRESENTATORE}
      </p>
    </aside>
  )
}

/**
 * Comandi essenziali direttamente sullo schermo proiettato. Serve quando il
 * portatile duplica la TV: la regia mostrerebbe la valutazione vera a tutti,
 * mentre qui compaiono solo i pulsanti. Il valore da rivelare viene letto al
 * volo dal database e non finisce mai in pagina.
 */
function BarraComandi({ partita }: { partita: Partita }) {
  const [inCorso, setInCorso] = useState(false)
  const ultimo = partita.indice >= partita.totale - 1

  const etichetta =
    partita.stato === 'attesa'
      ? 'Comincia'
      : partita.stato === 'puntate'
        ? 'Chiudi le puntate'
        : partita.stato === 'chiuse'
          ? 'Rivela'
          : partita.stato === 'rivelato'
            ? ultimo
              ? 'Classifica finale'
              : 'Prossimo oggetto'
            : ''

  async function avanti() {
    setInCorso(true)
    try {
      const oggetti = await caricaOggetti()
      if (partita.stato === 'attesa') await apriOggetto(oggetti, 0)
      else if (partita.stato === 'puntate') await chiudiPuntate()
      else if (partita.stato === 'chiuse') {
        await rivelaValore(partita.indice, oggetti[partita.indice]?.valore ?? 0)
      } else if (partita.stato === 'rivelato') {
        if (ultimo) await terminaPartita()
        else await apriOggetto(oggetti, partita.indice + 1)
      }
    } finally {
      setInCorso(false)
    }
  }

  if (!etichetta) return null

  return (
    <div className="fixed bottom-4 right-4 z-20">
      <button
        onClick={avanti}
        disabled={inCorso}
        className="rounded-full bg-oro-400/90 px-6 py-3 text-lg font-semibold text-bordeaux-900
                   shadow-lg transition hover:bg-oro-300 disabled:opacity-50"
      >
        {inCorso ? '…' : etichetta}
      </button>
    </div>
  )
}
export default function ProiezionePage() {
  const { isAdmin } = useAuth()
  const { partita, giocatori, risposte, risposteDelTurno } = usePartita()

  // il valore vero arriva solo dopo la rivelazione: su questo schermo non
  // esiste nessuna copia anticipata della valutazione
  const valore = partita.valoriRivelati[String(partita.indice)]
  const esiti = useMemo(
    () => (valore != null ? esitiTurno(risposteDelTurno, valore) : []),
    [risposteDelTurno, valore],
  )
  const generale = useMemo(
    () => classifica(risposte, partita.valoriRivelati, giocatori),
    [risposte, partita.valoriRivelati, giocatori],
  )

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-bordeaux-900 text-crema-50">
      <BarraComandi partita={partita} />
      <Presentatore />
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto px-8 py-8">
        <header className="mb-6 flex shrink-0 items-baseline justify-between">
          <h1 className="font-display text-4xl font-semibold text-oro-300">{TITOLO_GIOCO}</h1>
          {partita.stato !== 'attesa' && partita.stato !== 'finita' && (
            <p className="text-2xl text-crema-50/60">
              oggetto {partita.indice + 1} di {partita.totale}
            </p>
          )}
        </header>

        {partita.stato === 'attesa' && (
          <div className="flex flex-col items-center gap-8">
            <Fumetto massimo={44} className="self-start">
              Benvenuti! Inquadrate il codice e giocate con me e {FESTEGGIATA.split(' ')[0]}!
            </Fumetto>
            <Qr testo={indirizzoGioco()} lato={340} />
            <p className="text-2xl text-crema-50/70">
              {giocatori.length === 0
                ? 'Nessuno ancora in gara'
                : `${giocatori.length} in gara`}
            </p>
            <div className="flex max-w-5xl flex-wrap justify-center gap-3">
              {giocatori.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full bg-crema-50/10 px-5 py-2 text-2xl text-crema-50"
                >
                  {g.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {(partita.stato === 'puntate' || partita.stato === 'chiuse') && (
          // la storia puo' essere lunga: il fumetto prende tutto lo spazio che
          // resta e il testo si adatta, l'oggetto sta sotto senza mai scorrere
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            {partita.oggettoStoria && (
              <Fumetto className="min-h-0 flex-1">{partita.oggettoStoria}</Fumetto>
            )}

            <div
              className={`flex shrink-0 items-center gap-8 ${
                partita.oggettoStoria ? '' : 'flex-1 justify-center'
              }`}
            >
              {partita.oggettoFoto && (
                <img
                  src={partita.oggettoFoto}
                  alt=""
                  className={`max-w-[45%] rounded-2xl border-4 border-oro-400 object-contain shadow-2xl ${
                    partita.oggettoStoria ? 'max-h-[34vh]' : 'max-h-[55vh]'
                  }`}
                />
              )}
              <div className="flex min-w-0 flex-col gap-4">
                <h2 className="font-display text-6xl leading-tight font-semibold text-oro-200">
                  {partita.oggettoNome}
                </h2>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-3xl">
                  <p>
                    <span className="font-semibold text-oro-300">{giocatori.length}</span> in gara
                  </p>
                  <p>
                    <span className="font-semibold text-oro-300">{risposteDelTurno.length}</span>{' '}
                    hanno già puntato
                  </p>
                </div>
                <p className="text-4xl font-semibold text-oro-300">
                  {partita.stato === 'puntate' ? 'Puntate aperte!' : 'Puntate chiuse'}
                </p>
              </div>
            </div>
          </div>
        )}

        {partita.stato === 'rivelato' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="font-display text-5xl font-semibold text-oro-200">
              {partita.oggettoNome}
            </h2>
            <div className="rounded-2xl border-4 border-oro-400 bg-crema-50/10 px-12 py-6 text-center">
              <p className="text-2xl uppercase tracking-widest text-crema-50/60">valutazione</p>
              <p className="font-display text-7xl font-semibold text-oro-300">
                {valore != null ? euro(valore) : '—'}
              </p>
            </div>

            {esiti.length > 0 && (
              <>
                <div className="flex flex-wrap justify-center gap-4">
                  {esiti.slice(0, 3).map((e, i) => (
                    <div
                      key={e.giocatoreId}
                      className={`rounded-xl px-8 py-4 text-center ${
                        i === 0 ? 'bg-oro-400 text-bordeaux-900' : 'bg-crema-50/10 text-crema-50'
                      }`}
                    >
                      <p className="text-lg opacity-70">{i + 1}º</p>
                      <p className="text-3xl font-semibold">{e.nome}</p>
                      <p className="text-xl">
                        {euro(e.stima)} · {e.punti} punti
                      </p>
                    </div>
                  ))}
                </div>

                <div className="w-full max-w-6xl columns-2 gap-x-8 text-xl md:columns-3 lg:columns-4">
                  {esiti.map((e) => (
                    <p
                      key={e.giocatoreId}
                      className="mb-1.5 flex break-inside-avoid items-baseline justify-between gap-3 border-b border-crema-50/10 pb-1"
                    >
                      <span className="truncate text-crema-50/85">
                        <span className="mr-1.5 text-crema-50/40">{e.posizione}.</span>
                        {e.nome}
                      </span>
                      <span className="shrink-0 text-oro-200">{euro(e.stima)}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {partita.stato === 'finita' && (
          <div className="flex flex-col items-center gap-8">
            <p className="font-display text-6xl font-semibold text-oro-200">Classifica finale</p>
            <div className="w-full max-w-4xl space-y-3">
              {generale.slice(0, 10).map((r, i) => (
                <div
                  key={r.giocatoreId}
                  className={`flex items-baseline justify-between rounded-xl px-8 py-4 ${
                    i === 0 ? 'bg-oro-400 text-bordeaux-900' : 'bg-crema-50/10'
                  }`}
                >
                  <span className="text-3xl">
                    <span className="mr-4 opacity-60">{r.posizione}º</span>
                    {r.nome}
                  </span>
                  <span className="text-3xl font-semibold">{r.punti} punti</span>
                </div>
              ))}
            </div>
            {generale.length > 10 && (
              <p className="text-xl text-crema-50/50">
                e altri {generale.length - 10} giocatori
              </p>
            )}
          </div>
        )}

        {partita.stato !== 'attesa' && partita.stato !== 'finita' && generale.length > 0 && (
          <footer className="mt-6 flex shrink-0 flex-wrap justify-center gap-x-8 gap-y-2 text-xl text-crema-50/60">
            {generale.slice(0, 5).map((r) => (
              <span key={r.giocatoreId}>
                {r.posizione}º {r.nome} · {r.punti}
              </span>
            ))}
          </footer>
        )}
      </main>
    </div>
  )
}
