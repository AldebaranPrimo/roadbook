# Changelog

Tutte le modifiche rilevanti al progetto.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versionamento [SemVer](https://semver.org/lang/it/).

## [Unreleased]

Modifiche su `develop` non ancora rilasciate su `main`. Verranno raggruppate nella prossima versione taggata quando si promuoverà `develop → main`.

### Aggiunte

- **Selettore stile mappa in-app** con 5 provider (OpenStreetMap / CartoDB Voyager / Positron / OpenTopoMap / Dark Matter) via `L.control.layers` nativo di Leaflet, persistito come `preferenze.stileMappa` in IndexedDB. *PR #2.*
- **OpenStreetMap come default** di entrambi i temi (chiaro e scuro) — molto più leggibile di Voyager/Dark Matter. In tema scuro, filtro CSS invertito (`invert(1) hue-rotate(180deg) brightness(1.05) contrast(0.92) saturate(0.95)`) applicato al `.leaflet-tile-pane`: mantiene gli hue (fiumi blu, verde), inverte la luminosità. Marker e polyline restano fuori dal filtro. *PR #2.*
- **Service Worker**: pattern Workbox distinti per `tile.openstreetmap.org` e `tile.opentopomap.org` (cache separate, CacheFirst 30gg × 3000 entries). *PR #2.*
- **Geolocalizzazione "tu sei qui"** sempre attiva sulla mappa. Nuovo composable `src/composables/useGeolocalizzazione.js` con stato condiviso, `watchPosition` singolo, persistenza del consenso negato per evitare re-prompt. Marker cerchietto blu + accuracy circle fuori dal filtro scuro. Sezione "Posizione corrente" in `ModalInfo.vue` con bottone riattiva. *PR #5.*
- **Schema JSON v1.1 + export/import viaggio con annotazioni embedded**. Nuovo campo root opzionale `annotazioni: { visitati: string[], note: Record<string, string> }` con chiavi nel formato `"<areaId>-<n>"`. Bottone "Esporta viaggio" in `ModalInfo.vue` con checkbox *"Includi le mie note e i punti visitati"*. Conferma a 3 opzioni in `ModalCaricaViaggio.vue` quando il JSON importato contiene annotazioni non vuote (Importa tutto / Solo il viaggio / Annulla). Funzioni `esportaViaggioSingolo` + `ripristinaAnnotazioni` nello store. Retrocompatibile: file v1.0 restano validi. *PR #6.*
- **Analisi di fattibilità del prefetch offline** — nuovo documento `docs/analisi/prefetch-offline.md` con scomposizione tile/foto/routing/UI, volumi stimati (Friuli: ~595 tile, ~18 MB una tantum), policy OSM, stima 4 file / ~198 righe / 0 nuove dipendenze. **Verdetto: SEMPLICE** a condizione di accorpare il composable di stato dentro l'utility `prefetch-offline.js`. *PR #7.*
- **Numero di versione visibile**: badge `v{version}` accanto al marchio nell'header (con tooltip "Build <sha>"), sezione "Versione" nel modal Info con semver + SHA commit corto + data build. I valori sono iniettati a build-time da `vite.config.js` tramite `define` + lettura di `package.json` e `git rev-parse --short HEAD`. Ogni deploy ha un SHA diverso, quindi l'utente può sempre verificare a colpo d'occhio se sta vedendo l'ultima build o una cachata.
- **Auto-update PWA** con `virtual:pwa-register/vue`: quando Workbox scarica un nuovo service worker, compare un piccolo toast in basso a destra *"✨ Nuova versione disponibile"* con bottone **Aggiorna ora** che fa `skipWaiting` + reload. Se l'utente ignora il toast, il refresh avviene comunque alla prossima chiusura/riapertura della tab (comportamento `registerType: 'autoUpdate'` già presente). Nuovo composable `src/composables/useAggiornamentoPwa.js` che espone `aggiornamentoDisponibile` reattivo + `aggiornaOra()`. Dal modal Info è disponibile anche un bottone **Forza reload** per i casi in cui non c'è un nuovo SW ma la cache browser è dispettosa.

### Modifiche

- Cache Workbox dei tile CartoDB rinominata da `map-tiles` a `map-tiles-carto` per coerenza con le nuove cache per-provider.
- `package.json.version` allineato da `0.1.0` a `1.1.0` in vista della prossima promozione su `main`. Prima di questo bump il semver del progetto era rimasto dietro rispetto al CHANGELOG (vedere debito tecnico in TODO).
- Nuovi file `src/globals.d.ts` + `jsconfig.json` per far riconoscere al TS/JS language server le costanti globali iniettate da Vite (`__APP_VERSION__`, `__APP_BUILD_SHA__`, `__APP_BUILD_DATE__`). Zero impatto sulla build — serve solo all'editor.
- **`docs/SPECIFICHE-APP.md` alleggerito a documento storico del giorno zero**: rimosso lo schema JSON dettagliato (§3, ora mantenuto in `public/schema/viaggio-1.1.md` e sinteticamente nel README), smagriti le funzionalità must/nice-to-have (rimandate a TODO e CHANGELOG), aggiunto disclaimer in testa "documento non vivente". Restano a valore storico §1-2 (contesto del giorno zero), §4 (funzionalità previste all'inizio, con commento sullo stato attuale), §6 (problemi noti e lezioni apprese — ancora validi), §7-10 (hosting, UX, roadmap sprint, test consigliati). Puntatori aggiornati in `README.md`, `docs/STATO-PROGETTO.md`, `CLAUDE.md`.
- **Nuovo file `public/schema/viaggio-1.1.md`**: schema JSON vivente servito come risorsa statica all'URL `https://AldebaranPrimo.github.io/roadbook/schema/viaggio-1.1.md`. Contiene tutti i campi (obbligatori/opzionali), esempi pratici, vincoli, struttura delle annotazioni, esempio minimale completo, suggerimenti su come usarlo come prompt per un LLM (ChatGPT/Claude/Gemini) per farsi produrre nuovi viaggi nel formato standard.
- **Help sostanzioso nella modal "Carica un viaggio"** (`ModalCaricaViaggio.vue`): sezione collassabile `<details>` "Cos'è un file viaggio e come ottenerlo?" in testa, con due percorsi (partire dall'esempio Friuli scaricabile o passare lo schema a un LLM) e link diretti alle due risorse. Non ruba spazio a chi sa già cos'è un viaggio.
- **Bottone GitHub nell'header** (`HeaderApp.vue`): link `<a>` con icona SVG inline del logo GitHub, aria-label, `rel="noopener"`, target `_blank`. Porta al repo `AldebaranPrimo/roadbook`.
- **Fix sanitizzazione emoji** (`MappaLeaflet.vue`): il popup marker ora passa da `escapeHtml` anche l'`icona_emoji` della categoria (prima era inserita raw) e il `punto.n`. Chiusa una minuscola XSS potenziale su JSON maligni.

### Correzioni

- **B-3 autoaggiornamento PWA non funzionava su mobile**. `registerType: 'autoUpdate'` era incompatibile col toast "Aggiorna ora" basato su `needRefresh`: Workbox attivava il nuovo SW in silenzio con `skipWaiting + clientsClaim`, ma la UI già caricata in memoria restava vecchia e il toast non compariva mai (perché `needRefresh` era sempre false). Su PWA installata su Android con tab sempre aperta, l'utente continuava a vedere la versione cachata indefinitamente. **Fix**: passaggio a `registerType: 'prompt'` (SW nuovo resta in waiting → `needRefresh` diventa true → toast → skipWaiting+reload su click utente) + aggiunta di un `setInterval(registration.update(), 60min)` in `useAggiornamentoPwa.js` che forza il browser a controllare il SW aggiornamento anche quando la tab non fa mai navigation (PWA installate). Policy aggiornata in `CLAUDE.md` sezione "Policy aggiornamento Service Worker".
- **Bump versione `1.1.0 → 1.1.1`** e policy di bump formalizzata in `CLAUDE.md` nuova sezione "Versionamento": ogni commit visibile online **deve** portare avanti almeno la patch. Motivazione: il badge `v{version}` nell'header è l'unico modo per l'utente di distinguere a colpo d'occhio l'ultima build da una cachata. Senza bump non si sa se un "non vedo la modifica" è bug di deploy/SW o cache stantia.
- **B-1 fase 1 — pulsanti header mobile ad altezza uniforme**. In `src/styles/app.css` la classe `.btn-ghost` ora forza `display: inline-flex` + `height: 28px` + `align-items: center`: button con caratteri Unicode (⇄, ◐, +) e link `<a>` con SVG (GitHub) hanno la stessa altezza. Prima il line-height dei caratteri faceva crescere i button rispetto agli `<a>`.
- **B-1 fase 1 — `ⓘ` Info viaggio spostato accanto al titolo**. Il bottone Info è contestuale al viaggio corrente (apre "Informazioni viaggio"), non un'azione globale dell'app: in `HeaderApp.vue` vive ora inline dopo il `titolo-viaggio`, con stile dedicato `.btn-info-viaggio` (no bordo, tono muted, `margin-left: 0.3rem`). Fuori dalla fila `.azioni`. Scompare in `@media print` insieme al resto.
- **B-2 — bottone "Dettagli →" del popup marker temporaneamente nascosto** (opzione C scelta dall'utente). In `MappaLeaflet.vue` nuovo flag costante `mostraBottoneDettagli = false` che lo rende vuoto nel `bindPopup`. Motivazione: oggi il bottone era ridondante (il click sul marker già scrolla + evidenzia la scheda in lista) e confondeva. Sarà riattivato quando verrà implementata la voce TODO #8 "Scheda dettagliata punto (modal full-screen)", che gli darà una funzione concreta.
- **B-4 — titolo lungo non tagliava più via il bottone ⓘ Info viaggio**. In `HeaderApp.vue` rimosso del tutto il bottone `<button class="btn-info-viaggio">ⓘ` inline al titolo: era racchiuso nel `<p class="titolo-viaggio">` con `text-overflow: ellipsis`, quindi sui titoli lunghi (es. "Friuli + Slovenia in ...") veniva ritagliato dall'ellipsis e l'utente non poteva più aprire la modal Informazioni. Ora l'**intera area `.viaggio-info`** (titolo + sottotitolo) è cliccabile via `role="button"` + `tabindex="0"` + `@click` + handler tastiera Invio/Spazio, con `cursor: pointer`, hover discreto (titolo che vira sul colore accent) e outline focus visibile. Tutto lo spazio del titolo torna disponibile, l'ellipsis si sposta al bordo del container. Bump `1.1.2 → 1.1.3`.

### Contratto

- **`CLAUDE-vue-app.md`**: aggiunto Step 4.5 "Self-review come PR review" nella Fase 4 del workflow. Gate bloccante pre-commit: leggere il diff completo come se fossimo il reviewer umano, con checklist minima (semantica, edge case, sicurezza, consistenza, dead code, documentazione, numerazione). Se la self-review trova un problema non banale: non chiudere la slice, chiedere intervento umano. Motivazione: slice chiuse in giornata che contenevano incongruenze emerse solo alla review umana dell'utente (TODO non riallineato dopo merge di slice precedenti, voci del backlog ignorate nelle pianificazioni successive).
- **`CLAUDE-vue-app.md` v1.1.1**: aggiornamento consolidato post-critica costruttiva. Nuovi invarianti **I-13** (slice docs senza codice passano comunque da Fase 4 review), **I-14** (label `risk:*` obbligatoria nel kickoff), **I-15** (nessun commit con `@copilot esegui revisione` o altre varianti tradotte: la stringa è `@copilot review`, handler GitHub). Ampliamenti **I-05/07/08/11/12** (riferimenti espliciti a CHANGELOG, TODO, self-review, convenzione B-N). Sezioni minime richieste nel `CLAUDE.md` di repo estese. Fix sintassi `@copilot review` in tutte le occorrenze (prima era scritta erroneamente come `@copilot esegui revisione` in alcune parti della revision history).

---

## [1.0.1] - 2026-04-24

### Fixed
- Rimosso il bottone "Google Maps" duplicato nelle schede punto. Nel caso d'uso primario (Android) era identico al bottone "Google" perché entrambi generavano la stessa URL Google Maps; solo su iOS/Mac il primo diventava Apple Maps, ma c'era già il bottone "Apple" esplicito.

### Added
- Bottone **OsmAnd** nelle schede punto, via deep link ufficiale `https://osmand.net/go?lat=…&lon=…&z=17&title=…` (apre l'app se installata su Android/iOS, fallback pagina web). I 4 bottoni ora sono: Google Maps / Waze / Apple Maps / OsmAnd.

### Changed
- `src/utils/mappe-esterne.js`: rimossi `linkNavigaPredefinito` e `etichettaMappaPredefinita` (auto-detect OS). Restano 4 helper espliciti, senza ambiguità tra piattaforme.

---

## [1.0.0] - 2026-04-24

Primo rilascio pubblico su GitHub Pages (https://AldebaranPrimo.github.io/roadbook/).

### Added
- **PWA shell** Vue 3 + Vite + vite-plugin-pwa (Workbox). Manifest + service worker con runtime caching.
- **Storage locale IndexedDB** via `idb`, schema v1 con 5 object store (`viaggi`, `visitati`, `note`, `routing`, `preferenze`). Wrapper astratto `src/utils/store-viaggi.js`; nessun accesso diretto dai componenti.
- **Onboarding auto-discovery**: plugin Vite locale genera `public/viaggi/manifest.json` al build-time (+ middleware dev); al primo avvio l'app importa il primo JSON elencato come viaggio di esempio. Nessun viaggio hardcoded nel codice.
- **Mappa Leaflet** con tile CartoDB (Voyager chiaro, Dark Matter scuro), marker `L.divIcon` numerati colorati per categoria, popup con "Dettagli → lista", sync bidirezionale mappa ↔ lista.
- **Routing OSRM pubblico** con decoder polyline5 custom, timeout 5s, **cache persistente in IndexedDB senza scadenza applicativa**, fallback polyline retta con banner alla prima apertura offline. Bottone "Ricalcola percorso area" per forzare refresh.
- **Validatore schema JSON v1.0** (`src/utils/valida-schema.js`) con errori e avvisi in italiano. Forward-compatibility: campi sconosciuti ignorati silenziosamente.
- **Import viaggi** via file picker, drag & drop, parametro URL `?viaggio=…`. Conferma sovrascrittura se l'id esiste già.
- **Deep link** a Google Maps / Waze / Apple Maps.
- **Tema chiaro / scuro / auto** (ciclico dal bottone header, rispetta `prefers-color-scheme`), persistito.
- **Stato "visitato"** per punto (testo barrato + opacità) e **note personali** per punto, tutto auto-save.
- **Modal Info**: descrizione, partenza/rientro, documenti, avanzamento visitati con barra di progresso, legenda categorie, azioni (stampa, backup/restore JSON completo, elimina viaggio).
- **Layout responsive** mobile-first: mappa 40vh sopra + lista sotto; desktop ≥900px: lista 40% a sinistra + mappa a destra. Stampa `@media print` con nasconde-mappa e linearizzazione schede.
- **Deploy automatico** via GitHub Actions su `main` a GitHub Pages, sottopath `/roadbook/`.

### Infrastruttura
- Workflow `.github/workflows/deploy.yml` con `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-pages-artifact@v4` (Node 24 nativo); `actions/configure-pages@v5` e `actions/deploy-pages@v4` con warning Node 20 residuo (dipendenza dal maintainer delle action).
- Branching: default branch `develop`, promozioni `develop → main` manuali via PR. Slice AI-led prefissate `ai/{slice-type}/{desc}`.
- Contratto AI a due livelli: [`CLAUDE-vue-app.md`](../CLAUDE-vue-app.md) (generico per Vue app standalone) + [`CLAUDE.md`](../CLAUDE.md) (specifico Roadbook).
