# Roadbook

PWA per consultare itinerari di viaggio da file JSON, online e offline.

Specifiche complete in [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md).

## Stack

- Vue 3 + Vite
- Leaflet (mappe)
- `vite-plugin-pwa` (service worker + manifest)
- Hosting: GitHub Pages (`https://AldebaranPrimo.github.io/roadbook/`)

## Sviluppo locale

```bash
npm install
npm run dev
```

Apre `http://localhost:5173/roadbook/`.

## Build di produzione

```bash
npm run build
npm run preview   # anteprima locale del build
```

Il build finisce in `dist/` ed è ciò che GitHub Pages serve.

## Deploy

Deploy automatico via GitHub Actions ad ogni push su `main` (vedi `.github/workflows/deploy.yml`).
Richiede che in *Settings → Pages* del repo sia impostato **Source: GitHub Actions**.

## Aggiungere un nuovo viaggio

1. Mettere il file JSON in `public/viaggi/`.
2. (Futuro) Aggiornare l'indice dei viaggi disponibili.

Schema del JSON: vedi §3 delle specifiche.

## Struttura

```
roadbook/
├── public/
│   ├── viaggi/          # file JSON degli itinerari
│   └── icons/           # icone PWA (sostituire con PNG finali)
├── src/
│   ├── App.vue
│   ├── main.js
│   ├── components/      # UI (tab, liste, mappa, popup...)
│   ├── composables/     # logica riusabile (stato, storage, mappa)
│   ├── utils/           # validatore schema, deep-link mappe esterne
│   └── styles/
├── docs/SPECIFICHE-APP.md
├── .github/workflows/deploy.yml
└── vite.config.js
```

## Note

- Icone in `public/icons/` sono placeholder SVG. Per una PWA pienamente compatibile con Android sostituire con PNG 192×192 e 512×512 (anche `maskable`).
- Tile mappa: usare provider **CartoDB** (vedi §7.1 delle specifiche).
- OSRM demo pubblico va bene per v1 ma è senza SLA.
