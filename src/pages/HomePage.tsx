import { Link } from 'react-router-dom'
import Tocco from '../components/Tocco'
import { CORSO_DI_LAUREA, DATA_LAUREA, FESTEGGIATA, NOME_BREVE } from '../config'
import { giochiAttivi } from '../games/registry'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden px-6 py-10 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-oro-300 via-oro-500 to-oro-300" />
        <Tocco className="mx-auto mb-4 h-12 w-16 text-bordeaux-700" />
        <p className="font-display text-lg text-inchiostro/55">Si laurea</p>
        <h1 className="mt-1 text-4xl font-semibold text-bordeaux-800 sm:text-5xl">{FESTEGGIATA}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-inchiostro/65">{CORSO_DI_LAUREA}</p>
        {DATA_LAUREA && (
          <p className="mt-2 text-sm font-medium text-bordeaux-600">{DATA_LAUREA}</p>
        )}
        <p className="mx-auto mt-5 max-w-lg text-sm text-inchiostro/70">
          Aiutaci a preparare i giochi della festa: quello che scrivi qui finisce dritto nel
          materiale che useremo per festeggiare {NOME_BREVE}.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-bordeaux-800">I giochi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {giochiAttivi.map((gioco) => (
            <Link
              key={gioco.id}
              to={gioco.percorso}
              className="card group p-5 transition hover:-translate-y-0.5 hover:border-oro-400 hover:shadow-md"
            >
              <span className="text-2xl">{gioco.emoji}</span>
              <h3 className="mt-2 text-xl font-semibold text-bordeaux-800">{gioco.titolo}</h3>
              <p className="mt-1 text-sm text-inchiostro/65">{gioco.descrizione}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-bordeaux-600 group-hover:underline">
                Partecipa →
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-inchiostro/45">
          Altri giochi verranno aggiunti qui man mano che li prepariamo.
        </p>
      </section>
    </div>
  )
}
