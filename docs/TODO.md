# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## Alta priorità — prossime slice

### 1. Geolocalizzazione "tu sei qui" sulla mappa

**Obiettivo**: mostrare sempre sulla mappa la posizione corrente dell'utente come marker distinto, in modo che appena apre l'app in viaggio veda subito dove si trova rispetto ai punti dell'area.

**Scope v1** (deliberatamente semplice, `risk:low`):
- All'avvio dell'app: richiesta consenso geolocalizzazione tramite `navigator.geolocation`. Il prompt è quello nativo del browser, niente UI custom aggiuntiva.
- Se l'utente concede: attivare `navigator.geolocation.watchPosition(...)` per tutta la durata della sessione. Ogni update → aggiorna posizione del marker "tu sei qui" sulla mappa.
- Marker dedicato, non numerato e visivamente distinto dai marker-punti (es. cerchietto blu pieno al centro + cerchio trasparente dell'accuracy), fuori dal `layerGroup` dei marker-punti.
- Se l'utente nega o revoca il consenso: nessun marker, niente re-prompt automatico. Preferenza salvata come `preferenze.geolocalizzazione = 'negata'` per evitare prompt ripetuti, ma lasciando all'utente un'azione esplicita per ritentare (bottone nel modal Info tipo "Attiva posizione corrente").
- Il marker "tu sei qui" vive fuori dal `tilePane`, quindi **non** viene invertito dal filtro CSS del tema scuro — è sempre blu vivido.
- Nessun auto-centering sulla mappa: l'utente controlla inquadratura e zoom, l'app mostra la posizione dove si trova.

**Fuori scope v1**:
- Distanza utente → punto più vicino.
- Bottone "centra sulla mia posizione".
- Tracciamento storico della posizione (track log).

**Dipendenze**: questa feature **non** ha prerequisiti e non blocca le altre. Procediamo subito dopo aver chiuso le PR aperte (`ai/docs/revisione-documenti` è quella attualmente pendente).

### 2. Export/import viaggio con note e stato "visitato" embedded

**Obiettivo**: quando l'utente esporta un singolo viaggio dal modal Info, il JSON prodotto deve poter includere le **sue annotazioni personali** (le note per ciascun punto + lo stato "visitato"). Al re-import, tali annotazioni vengono ripristinate in IndexedDB. Oggi esiste `esportaBackup()` che produce un dump completo dell'app, ma non c'è un export "per-viaggio" che viaggi con le proprie note.

**Casi d'uso**:
- **Condividere un viaggio personalizzato**: "Ti mando il mio JSON del Friuli con le note che mi sono appuntato sui posti che ho visto davvero" — il destinatario apre il file e riceve il viaggio *più* le annotazioni di chi l'ha vissuto.
- **Backup rapido di un singolo viaggio** senza passare dal dump completo dell'app.
- **Migrazione tra device** in attesa del sync cloud (vedi voce 3): esporti dal desktop, importi sul telefono, ritrovi note e flag.

**Scope v1** (slice atomica, `risk:low` — solo estensioni additive):
- Nuova funzione in `src/utils/store-viaggi.js` tipo `esportaViaggioSingolo(viaggioId, { includiAnnotazioni: boolean })` che produce un JSON conforme allo schema v1.1 (vedi sotto).
- Nuovo bottone **"Esporta viaggio"** in `ModalInfo.vue`, accanto all'esistente "Esporta backup". Con checkbox *"includi le mie note e visite"* (default attivo).
- Download del JSON come `<viaggio.id>.json` (con annotazioni) o `<viaggio.id>-base.json` (senza).
- Estensione del validatore `valida-schema.js`: accetta `annotazioni` come campo opzionale root, con struttura `{ visitati: string[], note: Record<string, string> }` dove le chiavi sono `${areaId}-${n}`. Errori se struttura non conforme; ignora campi sconosciuti come sempre.
- Import (`ModalCaricaViaggio.vue`): se il JSON ha `annotazioni` non vuote, mostrare conferma con 3 opzioni — **Importa tutto**, **Solo il viaggio**, **Annulla**. Se "Importa tutto", ripristina le chiavi in IndexedDB sotto il nuovo `viaggioId`.
- `$schema_version` bumpato da `"1.0"` a `"1.1"` (minor, backward compatibile).
- Forward-compat: JSON senza `annotazioni` continuano a funzionare esattamente come oggi.

**Schema JSON (v1.1)**:
```json
{
  "$schema_version": "1.1",
  "viaggio": { ... },
  "categorie": { ... },
  "aree": [ ... ],
  "annotazioni": {
    "visitati": ["1-2", "3-4"],
    "note": { "1-5": "testo della mia nota" }
  }
}
```

**Nota sull'ordine con la voce 3 (login social)**: questa feature è **prerequisito concettuale** del sync cloud — una volta che l'utente potrà avere liste private sincronizzate, il meccanismo di serializzazione di note + visitati serve comunque. Meglio completarlo qui, semplice e portabile, e riusarlo dopo.

### 3. Gestione utenti con login social

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

### 4. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 5. Precaricamento offline totale al primo import di un viaggio

**Obiettivo**: quando l'utente importa un nuovo viaggio (dal manifest di esempio, da file, da drag & drop, o da URL), il **primo accesso online** deve scaricare tutto ciò che servirà per un'esperienza offline completa — tile delle mappe nell'area dei punti, foto dei punti, routing OSRM — in modo che l'utente possa poi partire in camper e aprire una qualsiasi area senza dover aver *già* visualizzato manualmente ciascuna area o scrollato mappe.

**Scope v1** (`risk:medium`):

1. **Prefetch dei tile**:
   - Calcolare il bounding box dell'intero viaggio (tutti i punti di tutte le aree) con padding ragionevole.
   - Per il provider tile **attualmente selezionato** dall'utente, enumerare tutti i tile coprenti il bbox ai livelli di zoom utili (indicativamente 10–14, da rivedere in base al caso d'uso camper).
   - `fetch()` sequenziale con throttling (max 1–2 richieste parallele, pausa tra lotti) → il service worker Workbox intercetta e salva in cache runtime (`CacheFirst`).
   - **Rispetto policy dei provider**: OSM standard ha una policy esplicita contro il bulk downloading ([Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)). Se il provider attivo è OSM, limitare zoom a 10–13 e richiedere conferma esplicita con messaggio sul limite. Per CartoDB / OpenTopoMap usare gli stessi limiti per prudenza, anche se le policy sono meno restrittive.
   - Opzionalmente: prefetchare solo tile in un bbox *ristretto* attorno a ogni area separatamente, invece di un bbox unico del viaggio, per ridurre il volume.

2. **Prefetch delle foto**:
   - Per tutti i punti del viaggio, enumerare gli URL in `punto.foto[]` (se presenti).
   - `fetch()` parallelo (max 3–4) → il service worker le cacha via runtime caching. Va aggiunto un pattern Workbox per URL di foto (`image/*` response o pattern per CDN comuni).

3. **Prefetch del routing**:
   - Per ogni area, chiamare `ottieniPercorso({ forzaAggiornamento: false })` che già usa OSRM con cache IndexedDB. Questo popola la cache routing per tutte le aree in un colpo solo, invece di aspettare che l'utente apra ciascuna.

4. **UI di progresso**:
   - Dopo un import, modale "Preparazione offline" con barra di progresso (X / Y tile, Z / W foto, routing in corso).
   - Annullabile in qualsiasi momento (non blocca l'utente dall'usare l'app, il prefetch continua in background se l'utente chiude il modal).
   - Preferenza in `ModalInfo`: "Prefetch automatico al primo import" (attivo di default), "Ripeti prefetch per questo viaggio" (azione manuale a posteriori, utile se cambi provider tile).

**Fuori scope v1**:
- Prefetch di *tutti* i provider tile simultaneamente (solo quello attivo).
- Prefetch di zoom più profondi (14+) per l'intera area — solo on-demand via pan & zoom utente.
- Stima dettagliata dello spazio disco prima del prefetch (può superare 100 MB facilmente).

**Rispetto delle policy**: per OSM è **obbligatorio** rispettare il rate limit (max 2 thread, no bulk downloading). Questa implementazione farà del suo meglio per restare sotto soglia, ma **non è un download illimitato** — è un "scarica quello che probabilmente userai, con cautela".

### 6. Filtri per categoria e tag

Dalla v2 delle specifiche ([`SPECIFICHE-APP.md §4.2`](SPECIFICHE-APP.md)). In header o in un drawer laterale: checkbox per categoria (attive di default), ricerca testuale nei punti. Il filtro si applica sia alla lista sia ai marker della mappa.

### 7. Ricerca testuale nei punti

Campo di ricerca che filtra in tempo reale nome/descrizione/tag dei punti. Tollerante a varianti diacritiche (è/e).

### 8. Galleria foto a tutto schermo

Per i punti che hanno `foto: [...]` nel JSON: click su thumbnail → lightbox con swipe, zoom, download.

---

## Bassa priorità / nice-to-have

### 9. Pulsante "naviga al prossimo non visitato"

Bottone che apre il prossimo punto non marcato come visitato nell'area corrente, centrando la mappa e aprendo il popup.

### 10. Condivisione punto come URL profondo

`?viaggio=<id>&area=<id>&punto=<n>` → apre l'app focalizzata su quel punto. Utile per condividere un luogo specifico via WhatsApp/email senza dover descrivere dove cercarlo.

### 11. Estensioni schema JSON

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
