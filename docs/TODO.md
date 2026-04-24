# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## Alta priorità — prossime slice

### 1. Gestione utenti con login social

**Obiettivo**: permettere a ciascun utente di avere una lista **privata e personale** di percorsi, sincronizzata tra i suoi dispositivi (camper, telefono, desktop). Visione: "Carico un viaggio al mattino dal desktop, lo apro la sera dal telefono in camper senza dover ri-importare il JSON".

**Approccio proposto** (da discutere quando prenderemo il task):
- **Provider di identità**: login social leggero, senza dover gestire password o email di conferma. Candidati: Google, Apple, GitHub. Preferibilmente 2-3 provider per coprire la maggior parte degli utenti.
- **Backend**: siccome oggi l'app è puramente statica, serve un servizio esterno che combini Auth + persistenza documentale. Candidati: **Firebase** (Auth + Firestore, zero backend proprio, tier gratuito generoso per app personali), **Supabase** (Postgres + Auth, self-hostable in futuro), **Clerk + un KV store** (più complesso). Firebase è l'opzione più rapida.
- **Modello dati**:
  - utente anonimo (non loggato) → tutto resta in IndexedDB locale, come oggi. Zero regressioni.
  - utente loggato → i viaggi, visitati, note, routing, preferenze vengono sincronizzati tra device. Lo **store astratto** `src/utils/store-viaggi.js` è già predisposto per questo: va sostituito/affiancato da una versione cloud-aware che tiene sincronizzati i due livelli (IndexedDB come cache locale + backend come fonte di verità).
- **Conflitti di sync**: per ora risoluzione "last-write-wins" su timestamp. Nessun merge semantico.
- **Privacy**: i viaggi importati dall'utente sono **privati per default**. Condivisione esplicita solo via link firmato (futura v2.x, non in questo task).

**Scope v1 di questa feature**:
- Bottone "Accedi" nell'header (→ schermata login con 2-3 provider social).
- Bottone "Esci" quando loggato.
- Sync trasparente dei dati utente al login; al logout, restano in cache locale solo i dati già presenti (niente re-fetch).
- Indicatore di sync (ultimo aggiornamento / "offline, in sync quando torni online").

**Scope esplicitamente fuori (per un v2 successivo)**:
- Condivisione viaggi tra utenti.
- Profili pubblici, follow, commenti.
- Team / workspace condivisi.

**Rischio di slice**: `risk:high` — tocca auth, rete, storage, UI. Andrà spezzata in più sub-slice (scelta provider → integrazione Auth → refactor store → UI login → sync effettivo → test).

---

## Media priorità

### 2. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 3. Filtri per categoria e tag

Dalla v2 delle specifiche ([`SPECIFICHE-APP.md §4.2`](SPECIFICHE-APP.md)). In header o in un drawer laterale: checkbox per categoria (attive di default), ricerca testuale nei punti. Il filtro si applica sia alla lista sia ai marker della mappa.

### 4. Ricerca testuale nei punti

Campo di ricerca che filtra in tempo reale nome/descrizione/tag dei punti. Tollerante a varianti diacritiche (è/e).

### 5. Geolocalizzazione "tu sei qui"

Marker speciale (non numerato) sulla posizione GPS dell'utente, con accuracy circle. Refresh on-demand o ogni N secondi con consenso esplicito. Utile per capire da che punto dell'area si è arrivati.

### 6. Galleria foto a tutto schermo

Per i punti che hanno `foto: [...]` nel JSON: click su thumbnail → lightbox con swipe, zoom, download.

---

## Bassa priorità / nice-to-have

### 7. Pulsante "naviga al prossimo non visitato"

Bottone che apre il prossimo punto non marcato come visitato nell'area corrente, centrando la mappa e aprendo il popup.

### 8. Condivisione punto come URL profondo

`?viaggio=<id>&area=<id>&punto=<n>` → apre l'app focalizzata su quel punto. Utile per condividere un luogo specifico via WhatsApp/email senza dover descrivere dove cercarlo.

### 9. Estensioni schema JSON

- `giorni`: array opzionale per viaggi suddivisi in giornate (alternativa alle aree).
- `gpx_url`: traccia GPX sovrapposta al percorso (utile per itinerari pre-esistenti).
- `bookings`: collegamenti a prenotazioni hotel/ristoranti.
- `meteo_link`: URL al forecast per il luogo/data.

Già previste dalle specifiche v1.0 come campi futuri, vanno implementate man mano che emergono esigenze.

---

## Debito tecnico

- **Test Vitest** per le utility pure (`valida-schema`, `routing-osrm` decoder, `mappe-esterne`). Non blocca nulla ora, ma crescerà di utilità man mano che le utility si complicano.
- **Audit WCAG 2.1 AA**: skip link → `#main-content` (mancante), `aria-expanded` sul modal, controllo contrasti in tutti e 5 i provider tile + tema scuro, navigazione tastiera completa.
- **ESLint + Prettier** configurati. Al momento non c'è lint step — un semplice `eslint-config` Vue 3 con regole blande coprirebbe già i casi critici (unused imports, var drift).
- **TypeScript**: eventuale migrazione JS → TS. Scope contenuto (~15 file), beneficio concreto su `store-viaggi.js` e `valida-schema.js` che oggi ricostruiscono tipi "a mano" nei commenti. Da valutare quando la codebase cresce.
- **Hook Claude Code** (`.claude/settings.json`): PostToolUse per auto-build su edit + SessionStart briefing. Utile soprattutto quando la codebase cresce o passiamo a `piccolo-team`.
- **Versioning effettivo**: oggi `package.json` resta a `0.1.0` mentre il CHANGELOG dichiara `1.0.1`. Allineare al primo bump "vero" post-sync main.

---

## Completati di recente

Vedi [`CHANGELOG.md`](CHANGELOG.md).
