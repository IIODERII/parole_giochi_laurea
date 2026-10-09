import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { messaggioErroreFirestore } from '../shared/raccolta'
import {
  aggiungiGiocatoreManuale,
  apriOggetto,
  azzeraPartita,
  chiudiPuntate,
  inviaPuntata,
  rimuoviGiocatore,
  rivelaValore,
  terminaPartita,
} from './comandi'
import OggettiPanel from './OggettiPanel'
import { classifica, esitiTurno } from './punteggi'
import Qr from './Qr'
import { euro, TITOLO_GIOCO, VALORE_MAX } from './types'
import { useOggetti } from './useOggetti'
import { indirizzoGioco, usePartita } from './usePartita'

const ETICHETTE: Record<string, string> = {
  attesa: 'In attesa',
  puntate: 'Puntate aperte',
  chiuse: 'Puntate chiuse',
  rivelato: 'Valore rivelato',
  finita: 'Partita finita',
}

export default function RegiaPage() {
  const { oggetti } = useOggetti()
  const { partita, giocatori, risposte, risposteDelTurno } = usePartita()
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaAzzera, setConfermaAzzera] = useState(false)
  const [nomeManuale, setNomeManuale] = useState('')
  const [valoreManuale, setValoreManuale] = useState('')

  const oggettoCorrente = oggetti.find((o) => o.id === partita.oggettoId) ?? null
  const ultimo = partita.indice >= oggetti.length - 1
  const esiti = useMemo(
    () => (oggettoCorrente ? esitiTurno(risposteDelTurno, oggettoCorrente.valore) : []),
    [risposteDelTurno, oggettoCorrente],
  )
  const generale = useMemo(
    () => classifica(risposte, partita.valoriRivelati, giocatori),
    [risposte, partita.valoriRivelati, giocatori],
  )

  async function comando(azione: () => Promise<unknown>) {
    setErrore(null)
    try {
      await azione()
    } catch (err) {
      setErrore(messaggioErroreFirestore(err))
    }
  }

  async function puntaPerLui() {
    const cifra = Math.round(Number(valoreManuale))
    if (!nomeManuale.trim() || !Number.isFinite(cifra) || cifra < 0 || cifra > VALORE_MAX) {
      setErrore('Servono un nome e un importo validi.')
      return
    }
    await comando(async () => {
      const id = await aggiungiGiocatoreManuale(nomeManuale.trim())
      await inviaPuntata(partita.indice, id, nomeManuale.trim(), cifra)
      setNomeManuale('')
      setValoreManuale('')
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-bordeaux-800 sm:text-4xl">{TITOLO_GIOCO}</h1>
          <p className="mt-1 text-sm text-inchiostro/65">
            Regia della serata: qui comandi tu, e solo tu vedi le valutazioni vere.
          </p>
        </div>
        <Link to="/proiezione" target="_blank" className="btn-secondary text-xs">
          Apri la proiezione ↗
        </Link>
      </header>

      {errore && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errore}
        </p>
      )}

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-bordeaux-700 px-3 py-1 text-xs font-semibold text-crema-50">
              {ETICHETTE[partita.stato]}
            </span>
            {partita.stato !== 'attesa' && partita.stato !== 'finita' && (
              <span className="ml-2 text-sm text-inchiostro/60">
                oggetto {partita.indice + 1} di {oggetti.length}
              </span>
            )}
          </div>
          <div className="text-sm text-inchiostro/60">
            {giocatori.length} giocatori · {risposteDelTurno.length} hanno puntato
          </div>
        </div>

        {oggettoCorrente && partita.stato !== 'attesa' && partita.stato !== 'finita' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-oro-200 bg-crema-50 p-3">
            {oggettoCorrente.foto && (
              <img src={oggettoCorrente.foto} alt="" className="h-14 w-14 rounded object-cover" />
            )}
            <div>
              <p className="font-semibold text-bordeaux-800">{oggettoCorrente.nome}</p>
              <p className="text-sm">
                <span className="text-inchiostro/50">valutazione vera: </span>
                <span className="font-semibold text-oro-600">{euro(oggettoCorrente.valore)}</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {partita.stato === 'attesa' && (
            <button
              className="btn-primary"
              disabled={oggetti.length === 0}
              onClick={() => comando(() => apriOggetto(oggetti, 0))}
            >
              Comincia con il primo oggetto
            </button>
          )}
          {partita.stato === 'puntate' && (
            <button className="btn-primary" onClick={() => comando(chiudiPuntate)}>
              Chiudi le puntate
            </button>
          )}
          {partita.stato === 'chiuse' && (
            <>
              <button
                className="btn-primary"
                onClick={() =>
                  comando(() => rivelaValore(partita.indice, oggettoCorrente?.valore ?? 0))
                }
              >
                Rivela la valutazione
              </button>
              <button
                className="btn-secondary"
                onClick={() => comando(() => apriOggetto(oggetti, partita.indice))}
              >
                Riapri le puntate
              </button>
            </>
          )}
          {partita.stato === 'rivelato' &&
            (ultimo ? (
              <button className="btn-primary" onClick={() => comando(terminaPartita)}>
                Chiudi la partita e mostra la classifica
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => comando(() => apriOggetto(oggetti, partita.indice + 1))}
              >
                Prossimo oggetto
              </button>
            ))}

          {confermaAzzera ? (
            <>
              <button
                className="btn-danger"
                onClick={() =>
                  comando(async () => {
                    await azzeraPartita(oggetti)
                    setConfermaAzzera(false)
                  })
                }
              >
                Sì, cancella tutto
              </button>
              <button className="btn-ghost" onClick={() => setConfermaAzzera(false)}>
                Annulla
              </button>
            </>
          ) : (
            <button className="btn-ghost text-xs" onClick={() => setConfermaAzzera(true)}>
              Azzera la partita
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold text-bordeaux-800">
            In sala <span className="text-base font-normal text-inchiostro/50">({giocatori.length})</span>
          </h2>

          {giocatori.length === 0 ? (
            <p className="py-4 text-center text-sm text-inchiostro/55">
              Nessuno è ancora entrato. Mostra il QR della proiezione.
            </p>
          ) : (
            <ul className="mb-4 space-y-1.5">
              {giocatori.map((g) => {
                const suo = risposteDelTurno.find((r) => r.giocatoreId === g.id)
                return (
                  <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${suo ? 'bg-green-600' : 'bg-crema-300'}`}
                      />
                      {g.nome}
                      {g.manuale && <span className="text-xs text-inchiostro/40">(a voce)</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      {suo && partita.stato !== 'puntate' && (
                        <span className="font-semibold text-bordeaux-700">{euro(suo.valore)}</span>
                      )}
                      <button
                        className="btn-ghost px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                        onClick={() => comando(() => rimuoviGiocatore(g.id))}
                      >
                        ×
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          {(partita.stato === 'puntate' || partita.stato === 'chiuse') && (
            <div className="rounded-lg border border-oro-200 bg-crema-50 p-3">
              <p className="mb-2 text-xs font-semibold text-bordeaux-800">
                Punta per chi non ha il telefono
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="field flex-1"
                  placeholder="Nome"
                  value={nomeManuale}
                  onChange={(e) => setNomeManuale(e.target.value)}
                />
                <input
                  className="field w-28"
                  type="number"
                  placeholder="euro"
                  value={valoreManuale}
                  onChange={(e) => setValoreManuale(e.target.value)}
                />
                <button className="btn-secondary text-xs" onClick={puntaPerLui}>
                  Registra
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold text-bordeaux-800">
            {partita.stato === 'rivelato' ? 'Esito dell’oggetto' : 'Classifica generale'}
          </h2>

          {partita.stato === 'rivelato' && esiti.length > 0 ? (
            <ol className="space-y-1.5 text-sm">
              {esiti.map((e) => (
                <li key={e.giocatoreId} className="flex items-baseline justify-between gap-2">
                  <span>
                    <span className="mr-2 font-semibold text-inchiostro/40">{e.posizione}.</span>
                    {e.nome}
                    {e.piuVicino && <span className="ml-1 text-oro-600">★</span>}
                  </span>
                  <span className="text-inchiostro/60">
                    {euro(e.stima)} · <span className="font-semibold text-bordeaux-700">{e.punti} punti</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : generale.length > 0 ? (
            <ol className="space-y-1.5 text-sm">
              {generale.map((r) => (
                <li key={r.giocatoreId} className="flex items-baseline justify-between gap-2">
                  <span>
                    <span className="mr-2 font-semibold text-inchiostro/40">{r.posizione}.</span>
                    {r.nome}
                  </span>
                  <span className="font-semibold text-bordeaux-700">{r.punti}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-4 text-center text-sm text-inchiostro/55">
              La classifica compare dopo la prima rivelazione.
            </p>
          )}
        </section>
      </div>

      <section className="card flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Qr testo={indirizzoGioco()} lato={120} />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-bordeaux-800">Il codice per entrare</h2>
          <p className="mt-1 text-sm text-inchiostro/60">
            Lo stesso che compare grande sulla proiezione. Gli invitati non devono inserire nessuna
            password: inquadrano, scrivono il nome e giocano.
          </p>
          <p className="mt-2 break-all text-xs text-inchiostro/45">{indirizzoGioco()}</p>
        </div>
      </section>

      <OggettiPanel />
    </div>
  )
}
