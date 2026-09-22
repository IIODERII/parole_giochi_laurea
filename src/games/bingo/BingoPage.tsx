import { useAuth } from '../../auth/authContext'
import CardsPanel from './CardsPanel'
import PhraseForm from './PhraseForm'
import PhraseList from './PhraseList'
import { useFrasi } from './useFrasi'

export default function BingoPage() {
  const { isAdmin } = useAuth()
  const { frasi, caricamento, errore, aggiungi, modifica, elimina } = useFrasi()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-bordeaux-800 sm:text-4xl">BingoSara</h1>
        <p className="mt-1 max-w-2xl text-sm text-inchiostro/65">
          Il bingo della serata: ognuno scrive cosa pensa che succederà alla festa, e da tutte le
          previsioni nascono le cartelle da distribuire ai tavoli: cinque caselle in fila fanno
          cinquina, tutta la cartella fa tombola.
        </p>
      </header>

      {errore && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errore}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PhraseForm frasi={frasi} aggiungi={aggiungi} />
        <PhraseList
          frasi={frasi}
          caricamento={caricamento}
          isAdmin={isAdmin}
          modifica={modifica}
          elimina={elimina}
        />
      </div>

      {isAdmin && <CardsPanel frasi={frasi} />}
    </div>
  )
}
