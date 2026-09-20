# Sport Center Reservation Web Application

Web App full-stack per la gestione delle prenotazioni di strutture sportive e del noleggio dell'attrezzatura associata.

## Tecnologie

### Frontend

* React
* React Router
* Bootstrap / React Bootstrap
* Vite

### Backend

* Node.js
* Express
* REST API
* Passport.js
* Express Session
* TOTP (2FA)

### Database

* SQLite

## Funzionalità

* Autenticazione utenti tramite username e password
* Autenticazione a due fattori opzionale tramite TOTP
* Visualizzazione della disponibilità di strutture sportive e attrezzatura
* Creazione di prenotazioni con assegnazione automatica della struttura
* Selezione manuale di una specifica struttura disponibile
* Noleggio dell'attrezzatura associata alle prenotazioni
* Modifica dell'attrezzatura di una prenotazione esistente
* Controllo della disponibilità globale dell'attrezzatura
* Gestione dei vincoli di attrezzatura per tipologia di struttura
* Cancellazione delle prenotazioni con rilascio delle risorse
* Sistema di punteggio associato alle attività dell'utente
* Soft deletion delle prenotazioni

## Architettura

L'applicazione utilizza un'architettura client-server.

Il frontend è sviluppato in React e comunica tramite REST API con un backend Node.js basato su Express.

Il backend gestisce autenticazione, sessioni, prenotazioni, strutture sportive e attrezzatura, utilizzando SQLite come database relazionale.

L'autenticazione è gestita tramite Passport.js ed Express Session, con supporto opzionale alla verifica TOTP come secondo fattore di autenticazione.

## Screenshot

![Facility selection page](./img/facility-selection.png)

## Account di prova

| Username | Password        |
| -------- | --------------- |
| `alice`  | `Wonderlands1!` |
| `bob`    | `Basketball2!`  |
| `carol`  | `Tennis3!`      |
| `dave`   | `Soccer4!`      |

Gli account contengono differenti prenotazioni e punteggi iniziali per permettere di testare i diversi comportamenti dell'applicazione.

## Come eseguire sulla propria macchina

1. Clonare il repository

2. Installare le dipendenze del server:

   ```bash
   cd server
   npm install
   ```

3. Installare le dipendenze del client:

   ```bash
   cd client
   npm install
   ```

4. Avviare il server Node.js

5. Avviare il client React tramite Vite:

   ```bash
   npm run dev
   ```

6. Aprire nel browser l'indirizzo indicato da Vite

