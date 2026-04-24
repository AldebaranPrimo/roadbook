# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## Alta priorità — prossime slice

### 1. Alleggerire `docs/SPECIFICHE-APP.md` a storico iniziale

**Obiettivo**: il documento `SPECIFICHE-APP.md` nasce come handover iniziale, da cui sono partite le prime scelte. Man mano che il prodotto si evolve, aggiornare anche le specifiche significa duplicare informazioni (già nel CHANGELOG + STATO-PROGETTO + README) e rischiare — in futuro — di regredire a scelte vecchie perché "le specifiche dicevano così".

**Scope** (`risk:low`, docs-only):
- Mantenere il documento come "storico del punto di partenza": intro, caratteristiche iniziali del caso d'uso, i problemi noti affrontati (§7 sulle tile OSM/ESRI ecc.), la roadmap degli sprint come era prevista inizialmente. Tutto ciò che è valore di **contesto storico**.
- **Rimuovere** lo schema JSON dettagliato (§3). Lo schema vivente sta nel README (sintetico con esempio) e nelle annotazioni in-codice (`src/utils/valida-schema.js`). Nel file specifiche si lascia una sola riga tipo *"Lo schema originale v1.0 era una struttura piatta `$schema_version + viaggio + categorie + aree`. Per lo schema corrente (v1.1+) fare riferimento al README e al validatore"*.
- **Rimuovere / smagrire** anche le tabelle che duplicano scelte di prodotto già presenti altrove, lasciando l'essenza di "cosa volevamo al giorno zero".
- Aggiungere in testa un disclaimer chiaro: *"Documento storico non vivente — riflette il punto di partenza del progetto, non lo stato corrente. Per lo stato attuale vedere [STATO-PROGETTO.md](STATO-PROGETTO.md); per la cronologia vedere [CHANGELOG.md](CHANGELOG.md)."*
- Aggiornare i puntatori in `README.md`, `CLAUDE.md`, `docs/STATO-PROGETTO.md` per distinguere chiaramente "specifiche iniziali storiche" da "specifiche correnti viventi nel README".

**Motivazione**: evitare che un domani, rileggendo le specifiche, si faccia rollback di scelte consolidate perché lì scritte diversamente. Le specifiche diventano documento-libro di storia, non fonte di verità corrente.

### 2. Help più sostanzioso nella modal "Carica un viaggio"

**Obiettivo**: chi arriva sulla modal di caricamento senza sapere cos'è un JSON di viaggio oggi vede solo una drop zone e un campo URL. Deve invece capire subito cosa importare e come produrselo.

**Scope** (`risk:low`):
- Nuova sezione "Cos'è un file viaggio?" in testa alla modal (collassabile `<details>` per non rubare spazio a chi già sa): breve descrizione + link diretto a un **schema della struttura JSON corrente** servito come file statico dentro l'app (es. `public/schema/viaggio-schema.md` oppure `public/schema/viaggio-1.1.json`).
- Il link deve puntare a una **risorsa auto-contenuta e accessibile via URL**, così l'utente può copia-incollarla in una chat con un LLM (ChatGPT, Claude, altro) e chiedere *"produci un viaggio Roadbook su X usando questo schema"*. Il LLM ha tutto quello che gli serve sapere nel file: schema, esempio reale, vincoli (formato chiavi annotazioni, campi obbligatori, ecc.).
- In alternativa/aggiunta: bottone "Scarica esempio" che offre il JSON Friuli corrente come template di partenza.
- Messaggio di errore del validatore già chiaro — non tocchiamo quello; l'aiuto serve a **prima** di provare l'import, non dopo.

**Scelte di design da confermare nella slice**:
- Formato del documento schema: Markdown (più leggibile per l'LLM) o JSON Schema standard? Probabilmente **Markdown** con esempio JSON incluso — più naturale come prompt.
- Naming e path: `public/schema/viaggio-{versione}.md` così quando aggiorneremo lo schema a v1.2 manterremo le versioni precedenti accessibili.
- Accessibilità sitemap: accessibile via `https://AldebaranPrimo.github.io/roadbook/schema/viaggio-1.1.md` — l'app lo carica relativamente, l'utente lo può condividere con un URL assoluto stabile.

### 3. Precaricamento offline totale al primo import

**Analisi completata**: vedere [`analisi/prefetch-offline.md`](analisi/prefetch-offline.md). Verdetto SEMPLICE, 4 file toccati, ~198 righe, 0 nuove dipendenze.

**Scope implementativo** (`risk:medium`):
- Nuova utility `src/utils/prefetch-offline.js` che espone `avviaPrefetch(viaggio, providerId)`, `annulla()`, `statoPrefetch` reattivo
- Sezione "Uso offline" in `ModalInfo.vue` con bottone "Prepara per uso offline" + progresso (tile / foto / routing)
- Wiring in `App.vue`
- Nuovo pattern `runtimeCaching` in `vite.config.js` per le foto dei punti

Raccomandazioni dall'analisi: zoom default 12, zoom 13 solo su conferma esplicita dell'utente con spiegazione della policy OSM; bbox calcolata per area (non globale); UI annullabile.

### 4. Gestione utenti con login social

**Obiettivo**: permettere a ciascun utente di avere una lista **privata e personale** di percorsi, sincronizzata tra i suoi dispositivi (camper, telefono, desktop).

**Approccio proposto** (da discutere quando prenderemo il task):
- **Provider di identità**: login social leggero. Candidati: Google, Apple, GitHub.
- **Backend**: Firebase (Auth + Firestore, zero backend proprio) vs Supabase (Postgres + Auth) vs Clerk. Firebase è l'opzione più rapida.
- **Modello dati**:
  - utente anonimo → tutto resta in IndexedDB locale, come oggi. Zero regressioni.
  - utente loggato → i viaggi, visitati, note, routing, preferenze vengono sincronizzati tra device. Lo **store astratto** `src/utils/store-viaggi.js` è già predisposto: va sostituito/affiancato da una versione cloud-aware.
- **Conflitti di sync**: last-write-wins su timestamp. Nessun merge semantico.
- **Privacy**: viaggi privati per default. Condivisione esplicita solo via link firmato (v2.x, non in questo task).

**Scope v1**:
- Bottone "Accedi" nell'header
- Sync trasparente dei dati al login; al logout restano in cache locale i dati già presenti
- Indicatore di sync

**Rischio**: `risk:high`. Andrà spezzata in più sub-slice (scelta provider → integrazione Auth → refactor store → UI login → sync effettivo → test).

**Nota architetturale**: lo schema v1.1 con annotazioni embedded (già in PR) è un prerequisito naturale per il sync cloud — il formato di serializzazione di note + visitati è lo stesso.

---

## Media priorità

### 5. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 6. Filtri per categoria e tag

Dalla v2 delle specifiche. In header o in un drawer laterale: checkbox per categoria (attive di default), ricerca testuale nei punti. Il filtro si applica sia alla lista sia ai marker della mappa.

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

### 11. Estensioni schema JSON (v1.2+)

Già previste come campi opzionali, da implementare quando emergono esigenze:
- `giorni`: array opzionale per viaggi suddivisi in giornate (alternativa a `aree`)
- `gpx_url`: traccia GPX sovrapposta al percorso
- `bookings`: collegamenti a prenotazioni hotel/ristoranti
- `meteo_link`: URL al forecast per il luogo/data

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

Rimossi da questo elenco e spostati su [`CHANGELOG.md`](CHANGELOG.md) — di solito nella sezione `[Unreleased]` finché non si promuove a `main`.

Al 2026-04-24 sono state completate (in `develop` o in PR aperta):

- ✅ Selettore stile mappa in-app con 5 provider + default OSM leggibile (mergiato in develop)
- ✅ Geolocalizzazione "tu sei qui" sulla mappa (in PR)
- ✅ Export/import viaggio con note e stato "visitato" embedded nello schema v1.1 (in PR)
- ✅ Analisi di fattibilità del prefetch offline con verdetto (in PR — il prefetto implementativo resta in TODO come voce #3)
