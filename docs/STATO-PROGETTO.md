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
- **Specifiche funzionali**: [`SPECIFICHE-APP.md`](SPECIFICHE-APP.md) (fonte di verità prodotto)
- **Contratto di sviluppo AI**: [`../CLAUDE.md`](../CLAUDE.md) (specifico) + [`../CLAUDE-vue-app.md`](../CLAUDE-vue-app.md) (generico per app Vue standalone)

## Versione

**1.0.1 — beta** (live). La feature branch `ai/feat/stile-mappa-selettore` è in PR verso `develop` e porterà alla 1.1.0.

## Stack

- **Vue 3.5** + Composition API + `<script setup>` (JS, niente TypeScript)
- **Vite 6** + **vite-plugin-pwa 0.21** (Workbox)
- **Leaflet 1.9** (mappa + marker DivIcon)
- **idb 8** (wrapper IndexedDB)
- **@vueuse/core 11** (utility reattive)
- Build: ~256 KB JS / ~31 KB CSS (gzip ~84 / ~10 KB), SW precacha ~302 KB
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
| `preferenze` | chiave semantica (`tema`, `stileMappa`) | valore |

### Flusso di avvio

1. Legge IndexedDB → se `viaggi` è vuoto, `fetch` del manifest `public/viaggi/manifest.json` (autogenerato a build-time dal plugin Vite) → importa il **primo** JSON trovato come viaggio di esempio.
2. 1 viaggio in storage → lo apre direttamente.
3. >1 viaggio in storage → schermata `SelettoreViaggio` con lista cliccabile.
4. Deep link `?viaggio=<URL>` → importa al volo prima di passare ai rami 1-3.

### Mappa e routing

- 5 tile provider selezionabili dall'utente (`L.control.layers` in alto a destra): **OpenStreetMap** (default), CartoDB Voyager, CartoDB Positron, **OpenTopoMap** (utile per camper in montagna), CartoDB Dark Matter. Scelta persistita come `preferenze.stileMappa`.
- In **tema scuro** con OSM attivo, il `.leaflet-tile-pane` ottiene la classe `tile-scuro-invertito` che applica `filter: invert(1) hue-rotate(180deg) brightness(1.05) contrast(0.92) saturate(0.95)` — inverte la luminosità preservando gli hue (fiumi restano blu, verde resta verde). Marker e polyline restano fuori dal filtro perché vivono in pane separati.
- **Routing OSRM** via `src/utils/routing-osrm.js → ottieniPercorso()`:
  1. legge cache IndexedDB per `(viaggio, area)` → se presente, rendering immediato (funziona offline indefinitamente)
  2. altrimenti chiama `router.project-osrm.org` con timeout 5s → salva la geometria in cache
  3. se OSRM fallisce → polyline retta tratteggiata + banner "Percorso non ancora calcolato"
- Bottone "Ricalcola percorso area" nel modal Info forza un nuovo fetch OSRM.

### Struttura repo

```
roadbook/
├── public/
│   ├── viaggi/                    JSON itinerari + manifest.json (autogenerato)
│   └── icons/                     icone PWA (SVG placeholder)
├── src/
│   ├── App.vue                    orchestratore: onboarding, routing UI
│   ├── main.js
│   ├── components/
│   │   ├── HeaderApp.vue          titolo + bottoni cambia/tema/carica/info
│   │   ├── AreaTabs.vue           tab aree scrollabili
│   │   ├── AreaPanel.vue          intro + lista PuntoCard
│   │   ├── PuntoCard.vue          scheda punto + deep link (Google Maps/Waze/Apple Maps/OsmAnd)
│   │   ├── MappaLeaflet.vue       mappa + 5 provider + layer control + routing cached + sync
│   │   ├── ModalInfo.vue          info viaggio + avanzamento + legenda + azioni
│   │   ├── ModalCaricaViaggio.vue file picker + drag&drop + URL
│   │   ├── OnboardingVuoto.vue    primo avvio senza viaggi
│   │   └── SelettoreViaggio.vue   scelta tra viaggi multipli
│   ├── composables/
│   │   ├── useTema.js             tema chiaro/scuro/auto persistito
│   │   ├── useViaggio.js          viaggio + area correnti
│   │   ├── useViaggiLista.js      lista viaggi + import/remove
│   │   ├── useVisitati.js         stato visitato per punto
│   │   └── useNote.js             note personali per punto
│   ├── utils/
│   │   ├── store-viaggi.js        wrapper IndexedDB (CRUD + backup/restore)
│   │   ├── valida-schema.js       validatore schema v1.0 (errori/avvisi in italiano)
│   │   ├── routing-osrm.js        OSRM + decoder polyline5 + cache + fallback
│   │   ├── mappe-esterne.js       deep link Google/Waze/Apple/OsmAnd
│   │   └── esempi.js              auto-discovery primo esempio via manifest
│   └── styles/
│       └── app.css                variabili tema chiaro/scuro/auto + base print
├── docs/
│   ├── SPECIFICHE-APP.md          fonte di verità prodotto
│   ├── STATO-PROGETTO.md          questo file (snapshot corrente)
│   ├── CHANGELOG.md               cronologia modifiche
│   ├── TODO.md                    lista cose future
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
- **Forward-compat del JSON**: campi sconosciuti (`giorni`, `gpx_url`, `bookings`, `meteo_link` e futuri) vanno ignorati silenziosamente. Il validatore segnala solo errori sui campi v1.0.
- **Cache routing senza scadenza applicativa**: il percorso reale deve essere disponibile offline indefinitamente dopo il primo fetch riuscito. Solo l'utente può invalidarla via "Ricalcola percorso".
- **Percorsi sempre relativi**: `import.meta.env.BASE_URL` ovunque serva un path dinamico (manifest, fetch viaggi). `base: '/roadbook/'` in `vite.config.js` è fisso.
- **Tile ESRI vietate** senza `esri-leaflet` (problema di proiezione documentato in [SPECIFICHE-APP.md §7.2](SPECIFICHE-APP.md)).

## Limiti attuali

- **Icone PWA** placeholder SVG. Per installabilità Android al 100% servono PNG 192 / 512 / 512-maskable. Quando sostituiti, aggiornare anche `manifest.icons` in `vite.config.js`.
- **JS puro**, niente TypeScript. Nessun lint step configurato (quando verrà aggiunto l'ESLint, la deviazione da I-12 in [`CLAUDE.md`](../CLAUDE.md) si riduce).
- **Nessun meccanismo di sync cloud**: tutto locale al dispositivo. Il refactor per supportarlo sarà guidato dall'astrazione già presente in `store-viaggi.js`.
- **WCAG AA non completamente auditato** in v1.0. Obbligatorio sulle modifiche future.
- **Test automatici assenti**: backstop con smoke Playwright manuale su `npm run preview` (vedere [`CLAUDE.md`](../CLAUDE.md) sezione Test).

## Comandi utili

```bash
npm install
npm run dev            # http://localhost:5173/roadbook/  (senza SW)
npm run build          # produce dist/
npm run preview        # http://localhost:4173/roadbook/  (con SW attivo)
```
