# Changelog

Tutte le modifiche rilevanti al progetto.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versionamento [SemVer](https://semver.org/lang/it/).

## [Unreleased]

### Added
- Selettore stile mappa in-app con 5 provider (OpenStreetMap / CartoDB Voyager / Positron / OpenTopoMap / Dark Matter) via `L.control.layers` nativo di Leaflet, persistito come `preferenze.stileMappa` in IndexedDB.
- OpenStreetMap come default di entrambi i temi (chiaro e scuro) — molto più leggibile di Voyager/Dark Matter.
- Filtro CSS invertito (`invert(1) hue-rotate(180deg) brightness(1.05) contrast(0.92) saturate(0.95)`) applicato al `.leaflet-tile-pane` quando OSM è attivo in tema scuro. Mantiene gli hue (fiumi blu, verde), inverte la luminosità. Marker e polyline restano fuori dal filtro.
- Service Worker: pattern Workbox distinti per `tile.openstreetmap.org` e `tile.opentopomap.org` (cache separate, CacheFirst 30gg × 3000 entries).
- Regola nel [`CLAUDE.md`](../CLAUDE.md): aggiungere un nuovo tile provider richiede di aggiornare sia `PROVIDERS` in `MappaLeaflet.vue` sia `workbox.runtimeCaching` in `vite.config.js`.

### Changed
- Cache Workbox dei tile CartoDB rinominata da `map-tiles` a `map-tiles-carto` per coerenza con le nuove cache per-provider.

> *Branch: `ai/feat/stile-mappa-selettore`. PR aperta verso `develop`. Diventerà 1.1.0 alla prossima promozione su `main`.*

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
