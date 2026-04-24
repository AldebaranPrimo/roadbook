# Stato progetto Roadbook

> Documento di handover per riprendere lo sviluppo (es. passando da Claude Code CLI a Claude Code in VS Code).
> Ultimo aggiornamento: 2026-04-24

---

## Cos'è

PWA per consultare itinerari di viaggio da file JSON, online e offline. Scheletro Vue 3 + Vite + vite-plugin-pwa, deploy su GitHub Pages.

Le specifiche complete sono in [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md). **Leggere quello come fonte di verità del prodotto.**

## Decisioni prese (risposte dell'utente alle 6 domande fondamentali)

1. **Nome repo**: `roadbook`
2. **GitHub**: utente `AldebaranPrimo`, repo **pubblico**
3. **Stack UI**: **Vue 3 con build step** (non Alpine come nelle specifiche originali) — scelta per migliore DX e meccanismo PWA più robusto via Workbox
4. **Note personali**: salvate in `localStorage` (fuori dal JSON del viaggio). In futuro arriverà login multi-utente con note per-utente. Schema chiave suggerito: `${viaggio.id}:note:${area.id}-${punto.n}`
5. **"In locale" = PWA offline** dopo primo caricamento da GitHub Pages. **Non** `file://`. Niente vincoli particolari oltre a percorsi relativi.
6. **Avvio app**: lista dei viaggi disponibili; se ce n'è uno solo, caricalo di default. Attualmente c'è solo `viaggio-friuli-2026.json`.

## Cosa è stato fatto

- Cartella `D:\_RedBones\Tomita\roadbook\` creata
- Scaffold Vue 3 + Vite + vite-plugin-pwa funzionante
- `vite.config.js` configurato con:
  - `base: '/roadbook/'` per GitHub Pages
  - Manifest PWA (nome, icone SVG, theme color verde `#16a34a`, display standalone, lang it)
  - Service worker Workbox con runtime caching per:
    - tile CartoDB (`basemaps.cartocdn.com`) → CacheFirst 30gg, max 3000 tile
    - OSRM (`router.project-osrm.org`) → NetworkFirst 5s timeout
- `index.html` + `src/main.js` + `src/App.vue` minimali: carica il JSON Friuli di default via `fetch()` e mostra titolo + conteggio aree/punti (placeholder per verificare che la pipeline funzioni)
- `src/styles/app.css` con CSS variables per tema chiaro/scuro via `prefers-color-scheme`
- Icona PWA placeholder SVG in `public/icons/icon.svg` (da sostituire con PNG 192/512 + maskable per Android)
- `docs/SPECIFICHE-APP.md` copiata dalla root Tomita
- `public/viaggi/viaggio-friuli-2026.json` copiato, caricato di default
- `.gitignore`, `.editorconfig`, `.vscode/{extensions,settings}.json`, `roadbook.code-workspace`
- Workflow GitHub Actions `.github/workflows/deploy.yml` (build + deploy su Pages ad ogni push su `main`)
- `npm install` eseguito (`node_modules/` + `package-lock.json` presenti)
- `npm run build` verificato: build pulito, ~85 KB, SW generato
- `git init -b main` + **primo commit locale** creato:
  ```
  11b27a6 chore: setup iniziale progetto Roadbook
  ```

## Cosa manca per andare live

1. **Creare repo GitHub** `AldebaranPrimo/roadbook` (pubblico, vuoto, senza README/gitignore/license)
2. **Aggiungere remote e push**:
   ```bash
   git remote add origin https://github.com/AldebaranPrimo/roadbook.git
   git push -u origin main
   ```
3. **Abilitare Pages**: *Settings → Pages → Build and deployment → Source: **GitHub Actions*** (senza questo passo il workflow gira ma Pages non pubblica nulla)
4. Attesa primo run del workflow → sito live su `https://AldebaranPrimo.github.io/roadbook/`

## Prossimi passi di sviluppo (roadmap v1)

Seguire gli sprint in §10 delle specifiche. In sintesi, componenti ancora da creare (cartelle già pronte in `src/`):

- **`src/utils/valida-schema.js`** — validatore del JSON viaggio (check `$schema_version`, campi obbligatori, chiavi categoria referenziate, ecc.). Deve dare messaggi chiari in italiano. Niente AJV: validator custom leggero.
- **`src/composables/`**:
  - `useViaggio.js` — fetch + parse + validazione del JSON, stato reattivo del viaggio corrente
  - `useVisitati.js` — stato "visitato" per punto, persistito in localStorage (`${viaggio.id}:visit:${area.id}-${punto.n}`)
  - `useNote.js` — note personali per punto, stessa logica
  - `useTema.js` — chiaro/scuro/auto, persistito
- **`src/components/`**:
  - `HeaderApp.vue` — titolo + sottotitolo viaggio + menu/info
  - `AreaTabs.vue` — tab scrollabili orizzontalmente
  - `AreaPanel.vue` — intro area + lista punti
  - `PuntoCard.vue` — scheda punto (nome, desc, avvertenze, orari, costo, foto, telefono, deep link mappe, checkbox visitato, textarea note)
  - `MappaLeaflet.vue` — mappa con marker numerati DivIcon, polyline OSRM, fallback polyline retta, sync con lista
  - `ModalInfo.vue` — descrizione viaggio, documenti, legenda categorie, conteggio visitati, export/import backup
- **`src/utils/mappe-esterne.js`** — deep link Google Maps / Waze / Apple Maps con rilevamento OS

## Gotcha e vincoli tecnici da ricordare

- **Percorsi SEMPRE relativi** (`./`), mai assoluti (`/`). GitHub Pages serve da sottopath `/roadbook/`. Usare `import.meta.env.BASE_URL` se serve.
- **Tile mappa**: usare CartoDB Voyager/Light/Dark (già nel SW caching). Tile OSM ufficiali funzionano solo da HTTPS con Referer. Tile ESRI hanno problema di proiezione, non usare senza `esri-leaflet` (§7.2 specifiche).
- **OSRM pubblico** senza SLA, predisporre sempre fallback a polyline retta.
- **Marker numerati** via `L.divIcon` con HTML inline (niente immagini).
- **`vite-plugin-pwa`** in dev è disabilitato (`devOptions.enabled: false`): il SW lavora solo in `npm run build` + `npm run preview` o in produzione. Testare offline in preview, non in dev.
- **Icone PWA SVG** sono placeholder: per Android installabile al 100% servono PNG 192, 512, 512 maskable. Sostituire in `public/icons/` e aggiornare il manifest in `vite.config.js`.
- **Forward-compat JSON**: l'app deve ignorare silenziosamente campi sconosciuti (le specifiche prevedono già estensioni `giorni`, `gpx_url`, `bookings`, `meteo_link`).
- **Stampa**: già prevista `@media print` nel CSS, va espansa quando i componenti saranno pronti (nascondere mappa, linearizzare liste).

## File e tool utili

- Workspace VS Code: apri `roadbook.code-workspace`
- Estensioni raccomandate: Volar (Vue), EditorConfig, Prettier, ESLint, Live Server
- Dev: `npm run dev` → `http://localhost:5173/roadbook/`
- Build: `npm run build`
- Anteprima build: `npm run preview`

## Preferenze utente da onorare

- **Italiano** per conversazioni, UI, commenti, messaggi di errore
- **Risposte brevi** (senza riempitivi, senza sezioni decorative inutili)
- **Fermarsi e chiedere** su scelte fondamentali (architetturali, non reversibili), non procedere con assunzioni
- Termini inglesi tecnici alla prima occorrenza di una conversazione vanno spiegati brevemente tra parentesi

## Link utili

- Specifiche complete: `docs/SPECIFICHE-APP.md`
- JSON di riferimento: `public/viaggi/viaggio-friuli-2026.json`
- Sito live (dopo deploy): `https://AldebaranPrimo.github.io/roadbook/`
