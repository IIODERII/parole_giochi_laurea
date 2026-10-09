import { useState, type ChangeEvent, type FormEvent } from 'react'
import Loader from '../../components/Loader'
import { messaggioErroreFirestore } from '../shared/raccolta'
import { comprimiFoto } from './foto'
import { euro, PRESENTATORE, STORIA_MAX, VALORE_MAX, type Oggetto } from './types'
import { useOggetti } from './useOggetti'

export default function OggettiPanel() {
  const { oggetti, caricamento, errore, aggiungi, modifica, elimina, sposta } = useOggetti()
  const [inModifica, setInModifica] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [storia, setStoria] = useState('')
  const [valore, setValore] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [daEliminare, setDaEliminare] = useState<string | null>(null)

  function pulisci() {
    setInModifica(null)
    setNome('')
    setStoria('')
    setValore('')
    setFoto(null)
    setAvviso(null)
  }

  function apri(oggetto: Oggetto) {
    setInModifica(oggetto.id)
    setNome(oggetto.nome)
    setStoria(oggetto.storia)
    setValore(String(oggetto.valore))
    setFoto(oggetto.foto ?? null)
    setAvviso(null)
  }

  async function scegliFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvviso(null)
    try {
      setFoto(await comprimiFoto(file))
    } catch (err) {
      setAvviso(err instanceof Error ? err.message : 'Foto non caricata')
    }
  }

  async function salva(e: FormEvent) {
    e.preventDefault()
    const cifra = Math.round(Number(valore))
    if (!nome.trim()) return setAvviso('Dai un nome all oggetto.')
    if (!Number.isFinite(cifra) || cifra <= 0 || cifra > VALORE_MAX) {
      return setAvviso('La valutazione deve essere un importo in euro maggiore di zero.')
    }

    setInCorso(true)
    try {
      const dati = { nome: nome.trim(), storia: storia.trim(), valore: cifra, foto }
      if (inModifica) {
        await modifica(inModifica, dati)
      } else {
        const ultimo = oggetti[oggetti.length - 1]
        await aggiungi({ ...dati, ordine: (ultimo?.ordine ?? 0) + 1 })
      }
      pulisci()
    } catch (err) {
      setAvviso(messaggioErroreFirestore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-1 text-2xl font-semibold text-bordeaux-800">Gli oggetti</h2>
      <p className="mb-5 text-sm text-inchiostro/60">
        La valutazione vera resta qui: non viene mai inviata ai telefoni degli invitati finché non
        la riveli tu.
      </p>

      <form onSubmit={salva} className="mb-6 grid gap-3 rounded-lg border border-oro-200 bg-crema-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="nome-oggetto" className="field-label">
              Nome dell'oggetto
            </label>
            <input
              id="nome-oggetto"
              className="field"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Orologio da tasca del bisnonno"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="valore-oggetto" className="field-label">
              Valutazione vera (euro)
            </label>
            <input
              id="valore-oggetto"
              className="field"
              type="number"
              min={1}
              max={VALORE_MAX}
              value={valore}
              onChange={(e) => setValore(e.target.value)}
              placeholder="es. 250"
            />
          </div>
        </div>

        <div>
          <label htmlFor="storia-oggetto" className="field-label">
            La storia che racconta {PRESENTATORE}
          </label>
          <textarea
            id="storia-oggetto"
            className="field min-h-32 resize-y"
            value={storia}
            onChange={(e) => setStoria(e.target.value)}
            placeholder="Scritta in prima persona: comparirà nel suo fumetto sulla proiezione…"
            maxLength={STORIA_MAX}
          />
          <p className="mt-1 text-right text-xs text-inchiostro/45">
            {storia.length}/{STORIA_MAX}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-secondary cursor-pointer text-xs">
            {foto ? 'Cambia foto' : 'Scegli una foto'}
            <input type="file" accept="image/*" className="hidden" onChange={scegliFoto} />
          </label>
          {foto && (
            <>
              <img src={foto} alt="" className="h-16 w-16 rounded-lg border border-oro-200 object-cover" />
              <button type="button" className="btn-ghost text-xs" onClick={() => setFoto(null)}>
                Togli la foto
              </button>
            </>
          )}
        </div>

        {avviso && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {avviso}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={inCorso}>
            {inModifica ? 'Salva le modifiche' : 'Aggiungi oggetto'}
          </button>
          {inModifica && (
            <button type="button" className="btn-ghost" onClick={pulisci}>
              Annulla
            </button>
          )}
        </div>
      </form>

      {errore && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errore}
        </p>
      )}

      {caricamento ? (
        <Loader testo="Carico gli oggetti…" />
      ) : oggetti.length === 0 ? (
        <p className="py-6 text-center text-sm text-inchiostro/55">
          Nessun oggetto: aggiungi il primo qui sopra.
        </p>
      ) : (
        <ol className="space-y-3">
          {oggetti.map((oggetto, posizione) => (
            <li
              key={oggetto.id}
              className="flex items-start gap-3 rounded-lg border border-crema-300 bg-white p-3"
            >
              <span className="mt-1 w-5 shrink-0 text-center text-sm font-semibold text-inchiostro/40">
                {posizione + 1}
              </span>

              {oggetto.foto ? (
                <img
                  src={oggetto.foto}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg border border-oro-200 object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-crema-300 text-xs text-inchiostro/35">
                  no foto
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-bordeaux-800">{oggetto.nome}</p>
                <p className="text-sm font-semibold text-oro-600">{euro(oggetto.valore)}</p>
                {oggetto.storia && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-inchiostro/60">{oggetto.storia}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex gap-1">
                  <button
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={posizione === 0}
                    onClick={() => sposta(oggetto.id, -1)}
                    aria-label="Sposta su"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-ghost px-2 py-1 text-xs"
                    disabled={posizione === oggetti.length - 1}
                    onClick={() => sposta(oggetto.id, 1)}
                    aria-label="Sposta giù"
                  >
                    ↓
                  </button>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => apri(oggetto)}>
                    Modifica
                  </button>
                  {daEliminare === oggetto.id ? (
                    <>
                      <button
                        className="btn-danger px-2 py-1 text-xs"
                        onClick={async () => {
                          await elimina(oggetto.id)
                          setDaEliminare(null)
                        }}
                      >
                        Confermi?
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => setDaEliminare(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-ghost px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      onClick={() => setDaEliminare(oggetto.id)}
                    >
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
