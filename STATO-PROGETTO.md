# Stato progetto Roadbook

> Documento di handover per riprendere lo sviluppo.
> Ultimo aggiornamento: 2026-04-24

---

## Cos'è

PWA per consultare itinerari di viaggio da file JSON, online e offline. Vue 3 + Vite + vite-plugin-pwa, deploy previsto su GitHub Pages.

Specifiche complete: [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md) (fonte di verità del prodotto).

## Stato attuale: v1 funzionalmente completa

Tutte le funzionalità "must" del §4.1 delle specifiche sono implementate e verificate con test visuali Playwright (desktop + mobile + simulazione offline).

### Architettura

- **Storage**: IndexedDB via libreria `idb`, wrapper unico in `src/utils/store-viaggi.js` con 5 object store (`viaggi`, `visitati`, `note`, `routing`, `preferenze`). Nessun viaggio hardcoded nel codice: i viaggi vivono tutti nello storage, l'utente li importa.
- **Onboarding**: al primo avvio, se lo storage è vuoto, l'app scopre il primo JSON disponibile leggendo `/viaggi/manifest.json` generato da un plugin Vite che scansiona `public/viaggi/` (dev via middleware, build via `writeBundle`). Oggi il primo file è `viaggio-friuli-2026.json`.
- **Avvio dopo primo uso**: se c'è un solo viaggio in storage → apre quello; se ce ne sono più → schermata `SelettoreViaggio` con lista.
- **Cache routing offline**: quando OSRM risponde, la geometria (polyline encoded) è salvata in IndexedDB per `(viaggioId, areaId)`. Alla riapertura dell'area il percorso reale viene letto dalla cache senza toccare la rete. Se la cache manca e OSRM non risponde in 5s, fallback a polyline retta con banner "Percorso non ancora calcolato". La polyline retta scompare alla prima apertura online riuscita.
- **v2-ready**: ogni scrittura/lettura passa dallo store astratto. In v2 sarà affiancabile o sostituibile da un backend cloud per utente.

### Struttura file aggiunti (rispetto allo scaffold iniziale)

```
src/
  utils/
    store-viaggi.js         wrapper IndexedDB (CRUD + backup/restore)
    valida-schema.js        validatore JSON schema v1.0 (errori/avvisi in italiano)
    mappe-esterne.js        deep link Google/Waze/Apple con rilevamento OS
    routing-osrm.js         chiamata OSRM + decoder polyline + cache + fallback
    esempi.js               scoperta primo JSON disponibile in public/viaggi/
  composables/
    useTema.js              tema chiaro/scuro/auto persistito
    useViaggio.js           viaggio corrente + area corrente
    useViaggiLista.js       lista viaggi in storage + import/remove
    useVisitati.js          stato visitato per punto
    useNote.js              note personali per punto
  components/
    HeaderApp.vue           titolo + bottoni (cambia/tema/carica/info)
    AreaTabs.vue            tab aree scrollabili orizzontalmente
    AreaPanel.vue           intro area + lista PuntoCard
    PuntoCard.vue           scheda punto completa (orari, costo, avvertenze, foto, link, check, note)
    MappaLeaflet.vue        mappa CartoDB + marker DivIcon + routing cached + sync bidirezionale
    ModalInfo.vue           descrizione, legenda, avanzamento, stampa, backup, elimina, ricalcola
    ModalCaricaViaggio.vue  file picker + drag&drop + URL
    OnboardingVuoto.vue     schermata primo avvio
    SelettoreViaggio.vue    scelta tra viaggi multipli in storage
  styles/
    app.css                 variabili tema (chiaro/scuro/auto via data-tema) + stampa
vite.config.js              + plugin manifestViaggiEsempio() per scoperta automatica
```

### Funzionalità verificate con Playwright

Test eseguiti su `npm run preview` a `http://localhost:4173/roadbook/`:

- **Desktop 1280×820**: onboarding automatico, 7 tab aree, mappa con marker DivIcon colorati per categoria + polyline OSRM verde, popup su click marker con "Dettagli", sync marker→lista (auto-scroll + evidenziatura), toggle visitato con testo barrato/opacity, ciclo tema chiaro/scuro/auto (tiles CartoDB cambiano correttamente), modal info con conteggio "1/30 punti (3%)", barra avanzamento, legenda categorie.
- **Mobile 390×844**: layout responsive (mappa 40vh sopra + lista sotto), tab scrollabili orizzontalmente, modal carica viaggio leggibile, tema persistito tra sessioni (caricato da IndexedDB al reload).
- **Offline simulato** (override `fetch` su OSRM): area mai cached → banner "Percorso non ancora calcolato" + polyline tratteggiata grigia; area già cached → percorso reale verde letto da IndexedDB senza chiamate di rete. Obiettivo del requisito raggiunto: la retta appare solo al primissimo caricamento senza rete.
- **Build**: pulita in 1.84s, 255KB JS (83KB gzip) + 31KB CSS. Service worker precacha 10 entries (302KB). Nessun errore né warning in console.

### Decisioni prese (per riferimento futuro)

1. Nome repo: `roadbook`
2. GitHub: utente `AldebaranPrimo`, repo **pubblico** (da creare)
3. Stack UI: **Vue 3 + Vite + vite-plugin-pwa**
4. Note personali e stato visitati: IndexedDB. Chiavi `${viaggio.id}:${area.id}-${punto.n}`. In futuro aggiungibile sync cloud per-utente.
5. "Offline" = PWA offline dopo primo caricamento, non `file://`. Percorsi sempre relativi.
6. Avvio app: scopre il primo JSON in `public/viaggi/` via manifest generato dal plugin Vite.
7. Nessun viaggio hardcoded nel codice. Il Friuli è solo un file in `public/viaggi/` come esempio caricabile, eliminabile dall'utente.
8. Cache routing: salvata in IndexedDB senza scadenza applicativa; letta sempre prima di chiamare OSRM.

## Cosa manca per andare live

1. **Creare repo GitHub** `AldebaranPrimo/roadbook` (pubblico, vuoto, senza README/gitignore/license)
2. **Aggiungere remote e push**:
   ```bash
   git remote add origin https://github.com/AldebaranPrimo/roadbook.git
   git push -u origin main
   ```
3. **Abilitare Pages**: *Settings → Pages → Build and deployment → Source: **GitHub Actions***
4. Attesa primo run del workflow → sito live su `https://AldebaranPrimo.github.io/roadbook/`

## Migliorie rinviate (non bloccanti per v1)

- **Icone PWA**: oggi solo `public/icons/icon.svg` placeholder. Per installabilità Android al 100% servono PNG 192, 512 e 512 maskable — sostituire in `public/icons/` e aggiornare `manifest.icons` in `vite.config.js`.
- **Bottone "Ricalcola percorso"**: disponibile dal modal Info ma è globale per l'area; si potrebbe aggiungere un'azione inline sulla mappa per ogni area.
- **Nice-to-have v2** (§4.2 specifiche): filtri per categoria/tag, ricerca testuale, geolocalizzazione "tu sei qui", pulsante "naviga al prossimo non visitato", galleria foto full-screen, condivisione punto come URL profondo.
- **Sync cloud (v2)**: lo store `src/utils/store-viaggi.js` espone già l'interfaccia astratta necessaria per affiancare un backend senza riscrivere componenti o composables.

## Gotcha e vincoli tecnici da ricordare

- **Percorsi sempre relativi** (`./`), mai assoluti (`/`). GitHub Pages serve da sottopath `/roadbook/`. Usare `import.meta.env.BASE_URL` (fatto in `src/utils/esempi.js` e nel fetch del manifest).
- **Tile mappa**: CartoDB Voyager (chiaro) / Dark (scuro), già in runtime caching del SW. Niente ESRI senza `esri-leaflet` (problema di proiezione documentato in specifiche §7.2).
- **OSRM pubblico** (`router.project-osrm.org`): senza SLA. Il codice ha già timeout 5s + fallback polyline retta + cache applicativa persistente.
- **Marker**: `L.divIcon` con HTML inline, stilizzati via classe `.marker-roadbook` (CSS globale nel componente `MappaLeaflet.vue`).
- **`vite-plugin-pwa`** disabilitato in dev (`devOptions.enabled: false`). Testare PWA solo con `npm run build` + `npm run preview`.
- **Forward-compat JSON**: il validatore in `src/utils/valida-schema.js` segnala solo errori sui campi v1.0; campi sconosciuti (`giorni`, `gpx_url`, `bookings`, `meteo_link` ecc.) sono ignorati silenziosamente.
- **Plugin `manifestViaggiEsempio`** in `vite.config.js`: rigenera `viaggi/manifest.json` a ogni build. In dev un middleware risponde dinamicamente leggendo la cartella. Se aggiungi un nuovo esempio in `public/viaggi/`, basta restartare `npm run dev` o rifare la build.

## File e tool utili

- Workspace VS Code: apri `roadbook.code-workspace`
- Estensioni raccomandate: Volar (Vue), EditorConfig, Prettier, ESLint
- Dev: `npm run dev` → `http://localhost:5173/roadbook/` (SW disabilitato)
- Build: `npm run build`
- Anteprima build (con SW attivo): `npm run preview` → `http://localhost:4173/roadbook/`

## Preferenze utente da onorare

- Italiano per conversazioni, UI, commenti, messaggi di errore
- Risposte brevi, senza sezioni decorative inutili
- Fermarsi e chiedere su scelte fondamentali (architetturali, non reversibili)
- Termini inglesi tecnici alla prima occorrenza di una conversazione vanno spiegati brevemente tra parentesi

## Link utili

- Specifiche complete: `docs/SPECIFICHE-APP.md`
- JSON di riferimento: `public/viaggi/viaggio-friuli-2026.json`
- Sito live (dopo deploy): `https://AldebaranPrimo.github.io/roadbook/`
