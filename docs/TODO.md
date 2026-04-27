# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## 🐛 Bug — da correggere asap

*(nessun bug aperto. B-1 fix fase 1, B-2 workaround, B-3 fix PWA, B-4 e B-5 palliativo già applicati — vedere [`CHANGELOG.md`](CHANGELOG.md). La fase 2 di B-1 (hamburger / raggruppamento / label azioni) e il fix definitivo B-5 con deep link nativi restano in valutazione: per B-5 il task è tracciato come voce backlog #12 in media priorità.)*

---

## Alta priorità — prossime slice

### 1. Precaricamento offline totale al primo import

**Analisi completata**: vedere [`analisi/prefetch-offline.md`](analisi/prefetch-offline.md). Verdetto SEMPLICE, 4 file toccati, ~198 righe, 0 nuove dipendenze.

**Scope implementativo** (`risk:medium`):
- Nuova utility `src/utils/prefetch-offline.js` che espone `avviaPrefetch(viaggio, providerId)`, `annulla()`, `statoPrefetch` reattivo
- Sezione "Uso offline" in `ModalInfo.vue` con bottone "Prepara per uso offline" + progresso (tile / foto / routing)
- Wiring in `App.vue`
- Nuovo pattern `runtimeCaching` in `vite.config.js` per le foto dei punti

Raccomandazioni dall'analisi: zoom default 12, zoom 13 solo su conferma esplicita dell'utente con spiegazione della policy OSM; bbox calcolata per area (non globale); UI annullabile.

### 2. Gestione utenti con login social

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

**Nota architetturale**: lo schema v1.1 con annotazioni embedded (già mergiato) è un prerequisito naturale per il sync cloud — il formato di serializzazione di note + visitati è lo stesso.

### 3. MCP server Roadbook per integrazione con Claude (nuovo repo `roadbook-mcp`)

**Obiettivo**: permettere a un utente che sta lavorando a un itinerario con Claude (Desktop o Web) di **vedere in anteprima** il viaggio nella PWA Roadbook via un link cliccabile generato da una tool MCP. Il payload JSON viaggia nell'URL (parametro `?viaggio_data=<base64url>`), nessun server intermedio, nessuno storage cloud.

**Design completo** nel documento di progetto: [`analisi/mcp-roadbook-v1.md`](analisi/mcp-roadbook-v1.md). Contiene: flusso utente, architettura end-to-end, stack proposto, struttura del nuovo repo `roadbook-mcp`, specifica della tool `visualizza_itinerario`, validazione lightweight lato MCP (la PWA ha già il validatore completo), soglie URL (ok <16 KB, warn 16-30, rifiuto >60), modifiche alla PWA Roadbook (gestione nuovo parametro `?viaggio_data` in `App.vue`, additiva), test plan, domande aperte, roadmap v1.1+.

**Scope su questo repo**: una slice `feat` additiva che aggiunge la gestione `?viaggio_data` in `App.vue` (decodifica base64url → validatore esistente → import in IndexedDB → pulizia URL). Risk: medium (input nuovo dall'esterno, ma riusa il flusso esistente). Preceduta dal nuovo repo `roadbook-mcp` che produce il parametro.

**Prerequisito concettuale**: la voce #2 "Gestione utenti con login social" è **fortemente raccomandata prima**. Con utente anonimo la feature funziona comunque (il JSON è persistente nel browser come qualsiasi altro import), ma il valore pieno emerge quando un utente può editare un viaggio in Claude e ritrovarlo *automaticamente* sul suo device Roadbook via sync — senza bisogno di passare dall'URL-payload. Finché non c'è login, il MCP resta un comodo "copia-incolla via link" piuttosto che un'integrazione vera.

**Rischio di slice**: `risk:medium` sul lato Roadbook (modifica additiva ma su input esterno, richiede validazione + escape). Sul lato `roadbook-mcp` repo è nuovo quindi risk classification da rifare al kickoff.

---

## Media priorità

### 4. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 5. Filtri per categoria e tag

Dalla v2 delle specifiche iniziali. In header o in un drawer laterale: checkbox per categoria (attive di default), filtro per tag. Il filtro si applica sia alla lista sia ai marker della mappa.

### 6. Ricerca testuale nei punti

Campo di ricerca che filtra in tempo reale nome/descrizione/tag dei punti. Tollerante a varianti diacritiche (è/e).

### 7. Galleria foto a tutto schermo

Per i punti che hanno `foto: [...]` nel JSON: click su thumbnail → lightbox con swipe, zoom, download.

### 8. Scheda dettagliata punto (modal full-screen)

Modal dedicata che mostra un singolo punto in pieno: foto gallery (integra #7), mappa zoomata singola sul punto, tutti i link (Google Maps / Waze / Apple Maps / OsmAnd), nota personale modificabile inline, flag visitato, coordinate copiabili. Componente nuovo suggerito: `src/components/ModalDettagliPunto.vue`.

**Trigger**: riattivare il bottone *"Dettagli →"* nel popup del marker (oggi nascosto con flag `mostraBottoneDettagli = false` in `MappaLeaflet.vue` per via del bug B-2), collegandolo all'apertura di questa modal. Così il bottone riacquista una funzione concreta distinta dal click sul marker (che continua a fare scroll + evidenzia la scheda in lista).

**Scope implementativo** (`risk:medium`):
- Nuovo `ModalDettagliPunto.vue` con layout mobile-first, chiusura via backdrop / tasto Esc / bottone ✕.
- In `MappaLeaflet.vue`: flag `mostraBottoneDettagli = true`, listener `popupopen` già presente emette un nuovo evento (es. `apriDettagliPunto`) invece del `clickPunto` ridondante.
- `App.vue`: wiring che apre la modal sul nuovo evento.

**Dipendenze**: integrabile con #7 (Galleria foto) come sub-feature dello stesso task se le si sviluppa insieme.

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

- **Ristrutturazione branch a tre livelli `main` + `production` + `develop`** (`risk:medium`, task di processo — da NON eseguire finché non pianificato esplicitamente). Decisione presa dall'utente il 2026-04-24 dopo il banner GitHub ricorrente "Compare & pull request" sul branch main. Modello target:
  - `main` = branch principale di lavoro. Commit diretti ammessi per slice piccole, slice AI-led significative via `ai/{tipo}/{desc}` → merge su main.
  - `production` = branch di pubblicazione. GitHub Pages deployà **solo** sui push qui. Il promotion avviene via push diretto `main:production` o via PR self-merge `main → production` (scelta da confermare al kickoff).
  - `develop` = riservato a feature complesse multi-slice. Resta dormiente allineato a main finché non serve.

  **Passi concreti alla partenza del task**:
  1. Allinea locale: `git pull` su main e develop, cancella eventuali branch slice già mergiati.
  2. Crea `production` da `origin/main` (snapshot attuale = stato pubblicato).
  3. Modifica `.github/workflows/deploy.yml`: trigger `branches: [main]` → `branches: [production]`.
  4. Riscrivi `CLAUDE.md` sezioni "Scale" e "Hosting" con il nuovo flusso a tre branch, rimuovi la regola "commit diretti su main solo per docs-only".
  5. Bumpa versione (patch).
  6. Aggiorna `CHANGELOG.md`.
  7. Commit + push su main + primo push a production (per attivare il nuovo trigger sul deploy corrente).
  8. Branch protection su production da Settings → Branches (a mano, lato utente).

  **Note di rischio**: dopo il cambio trigger, il prossimo commit su main **non** sarà deployato finché non si fa il primo push a production (passo 7 parte integrante). Il default branch GitHub resta `main` (niente da toccare). Da discutere al kickoff: (a) push diretto vs PR per main → production; (b) tenere `develop` sincronizzato con main o lasciarlo indietro fino all'uso; (c) branch protection stringente o light.

- **Test Vitest** per le utility pure (`valida-schema`, `routing-osrm` decoder, `mappe-esterne`). Non blocca nulla ora, ma crescerà di utilità man mano che le utility si complicano.
- **Audit WCAG 2.1 AA**: skip link → `#main-content` (mancante), `aria-expanded` sul modal, controllo contrasti in tutti e 5 i provider tile + tema scuro, navigazione tastiera completa.
- **ESLint + Prettier** configurati. Al momento non c'è lint step — un semplice `eslint-config` Vue 3 con regole blande coprirebbe già i casi critici (unused imports, var drift).
- **TypeScript**: eventuale migrazione JS → TS. Scope contenuto (~15 file), beneficio concreto su `store-viaggi.js` e `valida-schema.js` che oggi ricostruiscono tipi "a mano" nei commenti. Da valutare quando la codebase cresce.
- **Hook Claude Code** (`.claude/settings.json`): PostToolUse per auto-build su edit + SessionStart briefing. Utile soprattutto quando la codebase cresce o passiamo a `piccolo-team`.

---

## Completati di recente

Rimossi da questo elenco e spostati su [`CHANGELOG.md`](CHANGELOG.md) — di solito nella sezione `[Unreleased]` finché non si promuove a `main`.

Al 2026-04-24 sono state completate:

- ✅ Selettore stile mappa in-app con 5 provider + default OSM leggibile
- ✅ Geolocalizzazione "tu sei qui" sulla mappa
- ✅ Export/import viaggio con note e stato "visitato" embedded nello schema v1.1
- ✅ Analisi di fattibilità del prefetch offline con verdetto (il prefetch implementativo resta in alta priorità come voce #1)
- ✅ Numero di versione visibile nell'app + auto-update PWA con toast "Aggiorna ora"
- ✅ Alleggerimento `docs/SPECIFICHE-APP.md` a documento storico del giorno zero (schema rimosso, disclaimer in testa)
- ✅ Help sostanzioso nella modal import + schema JSON vivente accessibile via URL statica (`public/schema/viaggio-1.1.md`) pensata per essere passata a un LLM
- ✅ Bottone GitHub nell'header dell'app con deep link al repo
- ✅ Fix sanitizzazione emoji delle categorie nel popup marker (chiusa una minuscola potenziale XSS se un JSON maligno avesse iniettato HTML in `categorie.<k>.icona_emoji`)
- ✅ Regola "Self-review come PR review" nel contratto `CLAUDE-vue-app.md` (Step 4.5, gate bloccante pre-commit)
- ✅ B-1 fase 1: fix altezza uniforme pulsanti header mobile + `ⓘ` Info viaggio spostato accanto al titolo (contestuale al viaggio, non globale). Fase 2 (hamburger / raggruppamento / label) resta in valutazione.
- ✅ B-2 (parziale, opzione C scelta): bottone *"Dettagli →"* nel popup marker temporaneamente nascosto (flag `mostraBottoneDettagli = false` in `MappaLeaflet.vue`). Sarà riattivato con funzione concreta quando verrà implementata la voce #8 "Scheda dettagliata punto (modal full-screen)".
- ✅ Contratto `CLAUDE-vue-app.md` v1.1.1 — aggiornamento consolidato da critica costruttiva (nuovi invarianti I-13/14/15, ampliamenti I-05/07/08/11/12, sezioni minime CLAUDE.md di repo estese, fix sintassi `@copilot review`)
