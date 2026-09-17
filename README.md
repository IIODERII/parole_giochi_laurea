# I giochi per la laurea di Sara

Sito per raccogliere in anticipo il materiale dei giochi della festa di laurea.
Per ora c'e' **CruciSara**: gli invitati propongono parola + definizione e il
sito costruisce da solo il cruciverba, che Oder puo' scaricare in PDF e stampare.

## Come funziona

- **React + Vite + TypeScript + Tailwind**, tutto lato browser.
- **Firebase Firestore** come archivio condiviso (collezione `parole`).
- **Firebase Authentication** per l'accesso: due utenti, `oder` (amministratore)
  e `ospiti` (tutti gli altri).
- Nessun server da gestire: il sito e' statico e puo' stare su GitHub Pages.

## Comandi

```bash
npm run dev      # sviluppo su http://localhost:5173
npm run build    # compila in dist/
npm run preview  # prova il risultato compilato
```

## Configurazione Firebase

1. Le chiavi del progetto stanno in `.env` (non finisce su git). Il modello e'
   in `.env.example`.
2. In **Authentication -> Sign-in method** va attivato **Email/Password**.
3. In **Authentication -> Users** vanno creati i due utenti:
   - `oder@laurea.local` (amministratore)
   - `ospiti@laurea.local`
   Il dominio e' fittizio: serve solo perche' Firebase vuole un'email. Nel form
   di login si scrive solo `oder` oppure `ospiti`.
4. Le regole di sicurezza da incollare in **Firestore -> Regole** sono nel file
   [`firestore.rules`](./firestore.rules): tutti possono leggere e aggiungere
   parole, solo Oder puo' modificarle ed eliminarle.

## Chi puo' fare cosa

| | ospiti | oder |
|---|---|---|
| Vedere l'elenco delle parole | si | si |
| Aggiungere una parola | si | si |
| Vedere l'anteprima del cruciverba | si (dietro avviso spoiler) | si |
| Modificare / eliminare una parola | no | si |
| Vedere le parole rimaste fuori | no | si |
| Scaricare il PDF | no | si |

## Struttura

```
src/
  auth/        accesso e protezione delle pagine
  components/  intestazione, struttura di pagina, pezzi condivisi
  games/
    registry.ts          elenco dei giochi (qui si aggiungono i prossimi)
    cruciverba/          form, elenco, algoritmo, anteprima, PDF
  pages/       home
  config.ts    nomi, titoli, utenti
```

### Aggiungere un gioco nuovo

Creare `src/games/<nome>/` con la sua pagina e aggiungere una voce in
`src/games/registry.ts`: rotte, menu e tessere della home si aggiornano da sole.

## Come e' costruito il cruciverba

L'algoritmo (`src/games/cruciverba/generator.ts`) parte dalla parola piu' lunga
e prova a incastrare le altre su ogni lettera in comune, scartando i
piazzamenti che creerebbero accostamenti non validi. Tra i piazzamenti legali
sceglie quello con piu' incroci e che fa crescere meno la griglia. L'intera
costruzione viene ripetuta decine di volte con ordini diversi e viene tenuto il
risultato migliore. Le parole che non entrano finiscono in un elenco a parte,
visibile solo a Oder. Con lo stesso elenco di parole la griglia prodotta e'
sempre la stessa; il pulsante "Rigenera" prova una disposizione alternativa.

## Pubblicazione su GitHub Pages

Il progetto e' gia' pronto (`base: './'` in `vite.config.ts` e HashRouter).
Quando si vorra' pubblicare:

```bash
npm run build
npx gh-pages -d dist
```

Poi, nella console Firebase, aggiungere il dominio `<utente>.github.io` tra i
**domini autorizzati** in Authentication, altrimenti il login funziona solo in
locale.
