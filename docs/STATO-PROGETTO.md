# Stato progetto Roadbook

> **Snapshot** dello stato attuale del sistema: come è fatto **adesso**, non come ci siamo arrivati.
> Per la cronologia delle modifiche vedere [`CHANGELOG.md`](CHANGELOG.md).
> Per le cose da fare vedere [`TODO.md`](TODO.md).
> Ultimo aggiornamento: 2026-04-24.

---

## Cos'è

PWA per consultare itinerari di viaggio da file JSON, online e offline. Caso d'uso primario: viaggiatore in camper, consultazione da Android in zone montane senza connessione. Il file JSON è la fonte unica di verità del viaggio: cambia il file, cambia l'app.

- **Sito live**: https://AldebaranPrimo.github.io/roadbook/
- **Repo**: https://github.com/AldebaranPrimo/roadbook
- **Specifiche storiche iniziali**: [`SPECIFICHE-APP.md`](SPECIFICHE-APP.md) — punto di partenza del progetto, **non aggiornato** in corso d'opera (il prodotto si è evoluto, le scelte correnti vivono in questo file e nel CHANGELOG).
- **Contratto di sviluppo AI**: [`../CLAUDE.md`](../CLAUDE.md) (specifico) + [`../CLAUDE-vue-app.md`](../CLAUDE-vue-app.md) (generico per app Vue standalone).

## Versione

**In produzione (main, deployata su Pages)**: `1.0.1 — beta`.

**In `develop`**, pronto per la prossima promozione su `main` come `1.1.0`:

- Selettore stile mappa con 5 provider (OpenStreetMap / CartoDB Voyager / Positron / OpenTopoMap / Dark Matter) + OSM default con filtro CSS invertito in tema scuro + runtime caching SW esteso.
- Geolocalizzazione "tu sei qui" live sulla mappa via `watchPosition` singolo condiviso, consenso al primo rendering mappa, niente re-prompt se l'utente nega.
- Schema JSON v1.1 con campo root opzionale `annotazioni` (visitati + note portabili), bottone "Esporta viaggio" con checkbox *"Includi le mie note e visite"*, conferma a 3 opzioni in import quando il JSON contiene annotazioni.
- Analisi di fattibilità del prefetch offline (`docs/analisi/prefetch-offline.md`): verdetto SEMPLICE, slice implementativa prevista come prossima prioritaria.
- Numero di versione visibile (badge header + sezione in modal Info con SHA commit + data build) + auto-update PWA con toast "Aggiorna ora" via `virtual:pwa-register/vue`.
- Documento `SPECIFICHE-APP.md` alleggerito a storico del giorno zero (rimosso schema ridondante, disclaimer in testa); nuovo `public/schema/viaggio-1.1.md` come schema vivente accessibile via URL statica, pensato per essere passato a un LLM.
- Help sostanzioso nella modal import con link allo schema e all'esempio Friuli; bottone GitHub nell'header; fix sanitizzazione emoji nel popup marker.

**Contratto**: regola "Self-review come PR review" aggiunta al Fase 4 di `CLAUDE-vue-app.md` (Step 4.5).

## Stack

- **Vue 3.5** + Composition API + `<script setup>` (JS, niente TypeScript)
- **Vite 6** + **vite-plugin-pwa 0.21** (Workbox)
- **Leaflet 1.9** (mappa + marker DivIcon)
- **idb 8** (wrapper IndexedDB)
- **@vueuse/core 11** (utility reattive)
- Build: ~259 KB JS / ~31 KB CSS (gzip ~84 / ~10 KB), SW precacha ~306 KB
- Node locale: 22+; JS actions CI su Node 24

## Architettura

### Storage locale (IndexedDB)

Tutto persistito in IndexedDB, database `roadbook` schema v1, dietro il wrapper `src/utils/store-viaggi.js`. Nessun componente accede a `localStorage` / `indexedDB` direttamente.

| Object store | Chiave | Contenuto |
|---|---|---|
| `viaggi` | `viaggio.id` (slug ASCII) | record viaggio + metadati (origine: `esempio`/`file`/`url`, `importatoIl`, `dimensioneByte`) |
| `visitati` | `${viaggioId}:${areaId}-${n}` | flag "visitato" per punto |
| `note` | `${viaggioId}:${areaId}-${n}` | testo libero note personali |
| `routing` | `${viaggioId}:${areaId}` | geometria polyline encoded OSRM + modalità, **senza scadenza applicativa** |
| `preferenze` | chiave semantica (`tema`, `stileMappa`, `geolocalizzazione`) | valore |

### Schema JSON del viaggio

Versione corrente: **v1.1** (retrocompatibile con v1.0). Documento di riferimento vivente: [`../README.md`](../README.md) sezione "Schema del JSON di viaggio".

Campi root:
- `$schema_version` (string, obbligatorio) — `"1.0"` o `"1.1"`
- `viaggio` (object, obbligatorio) — id/titolo/sottotitolo/descrizione + partenza/rientro
- `categorie` (object, obbligatorio) — mappa chiave → `{ colore, label, icona_emoji? }`
- `aree` (array, obbligatorio) — blocchi geografici con `punti[]`
- `annotazioni` (object, opzionale, v1.1) — `{ visitati: string[], note: Record<string, string> }` con chiavi `"<areaId>-<n>"`

Campi sconosciuti vengono ignorati silenziosamente (forward-compat per estensioni future: `giorni`, `gpx_url`, `bookings`, `meteo_link`).

### Flusso di avvio

1. Legge IndexedDB → se `viaggi` è vuoto, `fetch` del manifest `public/viaggi/manifest.json` (autogenerato a build-time dal plugin Vite) → importa il **primo** JSON trovato come viaggio di esempio.
2. 1 viaggio in storage → lo apre direttamente.
3. >1 viaggio in storage → schermata `SelettoreViaggio` con lista cliccabile.
4. Deep link `?viaggio=<URL>` → importa al volo prima di passare ai rami 1-3.

### Mappa e routing

- **5 tile provider** selezionabili dall'utente (`L.control.layers` in alto a destra): **OpenStreetMap** (default), CartoDB Voyager, CartoDB Positron, **OpenTopoMap** (utile per camper in montagna), CartoDB Dark Matter. Scelta persistita come `preferenze.stileMappa`.
- In **tema scuro** con OSM attivo, il `.leaflet-tile-pane` ottiene la classe `tile-scuro-invertito` che applica `filter: invert(1) hue-rotate(180deg) brightness(1.05) contrast(0.92) saturate(0.95)` — inverte la luminosità preservando gli hue (fiumi restano blu, verde resta verde). Marker e polyline restano fuori dal filtro perché vivono in pane separati.
- **Routing OSRM** via `src/utils/routing-osrm.js → ottieniPercorso()`:
  1. legge cache IndexedDB per `(viaggio, area)` → se presente, rendering immediato (funziona offline indefinitamente)
  2. altrimenti chiama `router.project-osrm.org` con timeout 5s → salva la geometria in cache
  3. se OSRM fallisce → polyline retta tratteggiata + banner "Percorso non ancora calcolato"
- Bottone "Ricalcola percorso area" nel modal Info forza un nuovo fetch OSRM.
- **Geolocalizzazione** (in PR): marker cerchietto blu sulla posizione GPS dell'utente, fuori dal filtro scuro, aggiornato via `watchPosition`.

### Struttura repo

```
roadbook/
├── public/
│   ├── viaggi/                    JSON itinerari + manifest.json (autogenerato)
│   ├── icons/                     icone PWA (SVG placeholder)
│   └── schema/
│       └── viaggio-1.1.md         schema JSON vivente accessibile via URL statica, pensato per prompt LLM
├── src/
│   ├── App.vue                    orchestratore: onboarding, routing UI
│   ├── main.js
│   ├── components/
│   │   ├── HeaderApp.vue          titolo + bottoni cambia/tema/carica/info
│   │   ├── AreaTabs.vue           tab aree scrollabili
│   │   ├── AreaPanel.vue          intro + lista PuntoCard
│   │   ├── PuntoCard.vue          scheda punto + deep link (Google Maps/Waze/Apple Maps/OsmAnd)
│   │   ├── MappaLeaflet.vue       mappa + 5 provider + layer control + routing cached + sync + marker "tu sei qui"
│   │   ├── ModalInfo.vue          info viaggio + avanzamento + legenda + "Esporta viaggio" + azioni
│   │   ├── ModalCaricaViaggio.vue file picker + drag&drop + URL + conferma annotazioni
│   │   ├── OnboardingVuoto.vue    primo avvio senza viaggi
│   │   └── SelettoreViaggio.vue   scelta tra viaggi multipli
│   ├── composables/
│   │   ├── useTema.js             tema chiaro/scuro/auto persistito
│   │   ├── useViaggio.js          viaggio + area correnti
│   │   ├── useViaggiLista.js      lista viaggi + import/remove
│   │   ├── useVisitati.js         stato visitato per punto
│   │   ├── useNote.js             note personali per punto
│   │   └── useGeolocalizzazione.js   posizione corrente utente (watchPosition condiviso)
│   ├── utils/
│   │   ├── store-viaggi.js        wrapper IndexedDB (CRUD + backup/restore + export/restore annotazioni)
│   │   ├── valida-schema.js       validatore schema v1.0 / v1.1 (errori/avvisi in italiano)
│   │   ├── routing-osrm.js        OSRM + decoder polyline5 + cache + fallback
│   │   ├── mappe-esterne.js       deep link Google/Waze/Apple/OsmAnd
│   │   └── esempi.js              auto-discovery primo esempio via manifest
│   └── styles/
│       └── app.css                variabili tema chiaro/scuro/auto + base print
├── docs/
│   ├── STATO-PROGETTO.md          questo file (snapshot corrente)
│   ├── CHANGELOG.md               cronologia modifiche
│   ├── TODO.md                    lista cose future
│   ├── SPECIFICHE-APP.md          specifiche storiche iniziali (non vivente — vedere nota in testa)
│   ├── analisi/                   documenti di design di slice complesse
│   │   └── prefetch-offline.md    analisi di fattibilità prefetch offline (verdetto SEMPLICE)
│   └── screenshots/               immagini del README
├── .github/workflows/deploy.yml   build + deploy su Pages
├── vite.config.js                 + plugin locale per viaggi/manifest.json
├── README.md
├── CLAUDE.md                      contratto AI specifico del repo
├── CLAUDE-vue-app.md              contratto AI generico per Vue app standalone
└── package.json
```

## Deploy

GitHub Pages via `.github/workflows/deploy.yml` a ogni push su `main`. Build Node 22, JS actions Node 24 (il warning Node 20 persiste finché il team GitHub non bumpa `actions/configure-pages` e `actions/deploy-pages` — è fuori dal nostro controllo).

**Default branch** del repo: `develop`. Promozione a `main` tramite PR manuale quando si vuole pubblicare. Eccezione docs-only: modifiche esclusivamente a `*.md`, `docs/**`, `CLAUDE*.md`, commenti codice possono saltare il flusso e andare diretti al target di promozione.

## Scelte di prodotto non negoziabili

- **Nessun viaggio hardcoded nel codice**: i viaggi vivono sempre in IndexedDB. Il Friuli in `public/viaggi/` è solo un file di esempio scopribile via manifest, eliminabile dall'utente, trattato come qualsiasi altro viaggio.
- **Forward-compat del JSON**: campi sconosciuti (`giorni`, `gpx_url`, `bookings`, `meteo_link` e futuri) vanno ignorati silenziosamente. Il validatore segnala solo errori sui campi v1.0/v1.1 conosciuti.
- **Cache routing senza scadenza applicativa**: il percorso reale deve essere disponibile offline indefinitamente dopo il primo fetch riuscito. Solo l'utente può invalidarla via "Ricalcola percorso".
- **Percorsi sempre relativi**: `import.meta.env.BASE_URL` ovunque serva un path dinamico (manifest, fetch viaggi). `base: '/roadbook/'` in `vite.config.js` è fisso.
- **Tile ESRI vietate** senza `esri-leaflet` (problema di proiezione documentato nelle specifiche storiche).
- **Annotazioni portabili nel JSON**: le note utente e i flag visitato sono parte opzionale dello schema v1.1, così un viaggio esportato con annotazioni è riattivabile su un altro device o condivisibile con le proprie annotazioni.

## Limiti attuali

- **Icone PWA** placeholder SVG. Per installabilità Android al 100% servono PNG 192 / 512 / 512-maskable. Quando sostituiti, aggiornare anche `manifest.icons` in `vite.config.js`.
- **JS puro**, niente TypeScript. Nessun lint step configurato (quando verrà aggiunto l'ESLint, la deviazione da I-12 in [`CLAUDE.md`](../CLAUDE.md) si riduce).
- **Nessun meccanismo di sync cloud**: tutto locale al dispositivo. Il refactor per supportarlo sarà guidato dall'astrazione già presente in `store-viaggi.js`.
- **WCAG AA non completamente auditato** in v1.0. Obbligatorio sulle modifiche future.
- **Test automatici assenti**: backstop con smoke Playwright manuale su `npm run preview` (vedere [`CLAUDE.md`](../CLAUDE.md) sezione Test).
- **Prefetch offline** dei tile/foto/routing non ancora implementato — oggi i dati cartografici si cachanno solo via navigazione attiva dell'utente. L'analisi è pronta in [`docs/analisi/prefetch-offline.md`](analisi/prefetch-offline.md), verdetto SEMPLICE.

## Comandi utili

```bash
npm install
npm run dev            # http://localhost:5173/roadbook/  (senza SW)
npm run build          # produce dist/
npm run preview        # http://localhost:4173/roadbook/  (con SW attivo)
```
