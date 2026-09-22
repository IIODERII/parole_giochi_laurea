# I giochi per la laurea di Sara

Sito per raccogliere in anticipo il materiale dei giochi della festa di laurea.

- **CruciSara** — gli invitati propongono parola + definizione e il sito costruisce
  da solo il cruciverba, che Oder scarica in PDF o PNG e fa stampare.
- **BingoSara** — gli invitati scrivono cosa pensano succedera' durante la serata,
  e da quelle previsioni Oder genera le cartelle del bingo da stampare e ritagliare.

## Come funziona

- **React + Vite + TypeScript + Tailwind**, tutto lato browser.
- **Firebase Firestore** come archivio condiviso (collezioni `parole` e `frasi`).
- **Firebase Authentication** per l'accesso: due utenti, `oder` (amministratore)
  e `ospiti` (tutti gli altri).
- Nessun server da gestire: il sito e' statico e sta su GitHub Pages.

## Comandi

```bash
npm run dev      # sviluppo su http://localhost:5173
npm run build    # compila in dist/
npm run preview  # prova il risultato compilato
npm run deploy   # compila e pubblica su GitHub Pages
```

## Configurazione Firebase

1. Le chiavi del progetto stanno in `.env` (non finisce su git). Il modello e'
   in `.env.example`.
2. In **Authentication -> Sign-in method** va attivato **Email/Password**.
3. In **Authentication -> Users** vanno creati i due utenti `oder@laurea.local`
   e `ospiti@laurea.local`. Il dominio e' fittizio: serve solo perche' Firebase
   vuole un'email. Nel form di login si scrive solo `oder` oppure `ospiti`.
4. In **Authentication -> Settings -> Domini autorizzati** va aggiunto
   `iioderii.github.io`, altrimenti il login non funziona sul sito pubblicato.
5. Le regole di sicurezza da incollare in **Firestore -> Regole** sono nel file
   [`firestore.rules`](./firestore.rules). **Vanno ripubblicate ogni volta che
   si aggiunge un gioco con una nuova collezione.**

## Chi puo' fare cosa

| | ospiti | oder |
|---|---|---|
| Vedere quello che hanno scritto gli altri | si | si |
| Aggiungere parole e previsioni | si | si |
| Vedere l'anteprima del cruciverba | si (dietro avviso spoiler) | si |
| Modificare / eliminare | no | si |
| Vedere le parole rimaste fuori | no | si |
| Generare e scaricare cartelle e cartelloni | no | si |

## Struttura

```
src/
  auth/        accesso e protezione delle pagine
  components/  intestazione, struttura di pagina, pezzi condivisi
  games/
    registry.ts          elenco dei giochi (qui si aggiungono i prossimi)
    shared/              hook Firestore, numeri casuali, nome del giocatore
    cruciverba/          form, elenco, algoritmo, anteprima, PDF e PNG
    bingo/               form, elenco, generatore di cartelle, PDF
  pages/       home
  config.ts    nomi, titoli, utenti
```

### Aggiungere un gioco nuovo

1. Creare `src/games/<nome>/` con la sua pagina; per la parte dati basta
   `useRaccolta('<collezione>')` da `src/games/shared/raccolta.ts`.
2. Aggiungere una voce in `src/games/registry.ts`: rotte, menu e tessere della
   home si aggiornano da sole.
3. Aggiungere le regole della nuova collezione in `firestore.rules` e
   ripubblicarle dalla console Firebase.

## Come e' costruito il cruciverba

L'algoritmo (`src/games/cruciverba/generator.ts`) parte dalla parola piu' lunga
e prova a incastrare le altre su ogni lettera in comune, scartando i
piazzamenti che creerebbero accostamenti non validi. Tra i piazzamenti legali
sceglie quello con piu' incroci e che fa crescere meno la griglia. L'intera
costruzione viene ripetuta decine di volte con ordini diversi e viene tenuto il
risultato migliore. Le parole che non entrano finiscono in un elenco a parte,
visibile solo a Oder.

Il cartellone (`poster.ts`) calcola una volta sola le posizioni in millimetri, e
le usano sia il PDF (`exportPdf.ts`) sia l'immagine PNG (`exportImage.ts`), che
restano cosi' identici. Se le definizioni risultassero troppo piccole, viene
rimpicciolita la griglia invece del testo, fino a un minimo scrivibile a mano.

## Come sono costruite le cartelle del bingo

Il generatore (`src/games/bingo/generator.ts`) distribuisce le previsioni in
parti uguali: a ogni cartella tocca prima chi e' comparso meno volte finora,
cosi' nessuna frase resta inutilizzata e nessuna finisce su tutte le cartelle.
Ogni cartella e' diversa dalle altre e, con lo stesso seme, anteprima e PDF
coincidono.

La stampa (`exportCartelle.ts`) prova tutte le disposizioni possibili sul foglio
A4 e tiene quella che fa uscire le caselle piu' grandi: con cartelle larghe e
basse (5x3) conviene impilarle, con cartelle quadrate affiancarle. Restano 10 mm
di margine di sicurezza e 6 mm fra una cartella e l'altra per passare con le
forbici, e ogni cartella si stringe sul proprio contenuto invece di lasciare
spazio vuoto. La dimensione del testo e' unica per tutte le caselle di tutte le
cartelle: si sceglie la piu' grande con cui anche la frase piu' lunga ci sta
dentro.

## Pubblicazione

```bash
git add . && git commit -m "descrizione" && git push
npm run deploy
```

Il sito e' su **https://iioderii.github.io/parole_giochi_laurea/**
