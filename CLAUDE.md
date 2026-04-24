# Claude Code — Roadbook

PWA per consultare itinerari di viaggio da file JSON, online e offline. Caso d'uso primario: viaggiatore in camper, consultazione da Android in zone montane senza connessione. Frontend Vue 3 + Vite + Leaflet + IndexedDB, deploy statico su GitHub Pages.

> **Questo file contiene solo le regole specifiche del repo Roadbook.** Tutto ciò che non è qui segue il contratto di famiglia `CLAUDE-vue-app.md` nella stessa cartella. Leggere prima quello, poi questo.

## Versione contratto di famiglia

Conforme a [`CLAUDE-vue-app.md`](CLAUDE-vue-app.md) **v1.1.0** (rev 4 del 2026-04-24).

## Lingua del progetto

- **Identificatori** (variabili, funzioni, file, composables): **italiano** sul dominio (`useViaggio`, `aree`, `chiavePunto`, `PuntoCard.vue`), inglese per primitivi Vue/JS universali (`ref`, `computed`, `onMounted`, `fetch`).
- **UI utente** (testi a schermo, etichette, bottoni, messaggi di errore di validazione): **italiano**.
- **Commenti e log**: **italiano**.
- **Descrizioni tool destinate a LLM** (se presenti, es. README dello schema `public/schema/viaggio-1.1.md`): italiano, ma con gli esempi di prompt al LLM mostrati in italiano anch'essi (l'utente parla italiano col suo LLM).

## Performance budget

Valori effettivi in uso al 2026-04-24 (override motivato rispetto ai default di I-13):

- **Bundle JS iniziale**: **≤ 280 KB gzip** (override del default 150 KB). Motivazione: stack include Leaflet (~150 KB gzip) + idb + 5 tile provider registrati + 2 composable PWA — è il prezzo delle feature correnti. Oggi siamo a ~90 KB gzip per il chunk principale + ~2 KB workbox-window, quindi lontani dal tetto.
- **CSS totale**: **≤ 35 KB gzip** (leggero override del default 30 KB). Oggi ~10 KB gzip.
- **Score Lighthouse PWA**: **≥ 85** (leggero override del default 90). Motivazione: icone PWA placeholder SVG finché non sostituite con PNG 192/512/maskable (voce in TODO).
- Regressioni di performance sostanziali (aumento >20% del bundle in una sola slice) richiedono una slice `perf` dedicata.

## Policy aggiornamento Service Worker

**`autoUpdate` + toast utente** (rev 4 del contratto, I-08):

- `registerType: 'autoUpdate'` in `vite.config.js`: il SW nuovo viene scaricato automaticamente in background quando Workbox lo rileva.
- `virtual:pwa-register/vue` wrappato in `src/composables/useAggiornamentoPwa.js`: espone `aggiornamentoDisponibile` reattivo + `aggiornaOra()`.
- Toast in `App.vue` mostrato quando `aggiornamentoDisponibile === true`: "✨ Nuova versione disponibile — Aggiorna ora". Click → `updateServiceWorker(true)` = `skipWaiting` + reload.
- Se l'utente ignora il toast, l'aggiornamento avviene alla prossima chiusura/riapertura tab (comportamento default di `autoUpdate`).

---

## Repo & ecosistema

- Repo: **https://github.com/AldebaranPrimo/roadbook** (pubblico)
- Path locale: `D:\_RedBones\Tomita\roadbook`
- Sito live: **https://AldebaranPrimo.github.io/roadbook/**
- Specifiche funzionali: [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md) (fonte di verità prodotto)
- Stato attuale del sistema: [`docs/STATO-PROGETTO.md`](docs/STATO-PROGETTO.md)
- Cronologia modifiche: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
- Cose da fare: [`docs/TODO.md`](docs/TODO.md)

Nessun ecosistema multi-repo. Roadbook è un progetto standalone, non comunica con backend propri.

**Servizi esterni consumati (sola lettura)**:
- Tile CartoDB (`basemaps.cartocdn.com`) — cartografia raster
- OSRM pubblico (`router.project-osrm.org`) — calcolo percorsi stradali/pedonali
- Deep link a Google Maps / Waze / Apple Maps / OSMAnd — navigazione turn-by-turn esterna

---

## Stack

Versioni bloccate in `package.json`:

- **Vue 3.5+**, Composition API + `<script setup>`
- **Vite 6+** (JS puro, senza TypeScript)
- **Leaflet 1.9+** (tile + marker DivIcon)
- **idb 8+** (wrapper IndexedDB)
- **@vueuse/core 11+** (utilità reattive)
- **vite-plugin-pwa 0.21+** (manifest + service worker Workbox)

Node locale di sviluppo: `22+`. Le JavaScript actions di CI girano su Node 24 (forzato dal runner GitHub).

---

## Scale

**`solo` + `mvp`** al 2026-04-24.

Implicazioni attive:

- Commit diretti su `develop` ammessi per slice piccole (prefisso `ai/` opzionale, raccomandato per slice AI-led significative).
- Commit diretti su `main` **solo** per docs-only (`*.md`, `docs/**`, `CLAUDE*.md`, commenti codice) o per la gestione del contratto AI stesso. Tutto il resto passa da `develop`.
- PR `develop` → `main` sono self-merge fatte dal dev.
- Test automatici Vitest/Playwright **non obbligatori** — il backstop è uno smoke test manuale su `npm run preview` via Playwright MCP quando la slice tocca UI visibile (classificata almeno `risk:medium`).

Quando passeremo a `piccolo-team` (>1 dev attivo), questa sezione va aggiornata e si attivano: PR obbligatorie verso `develop`, review richiesta su `main`.

---

## Storage locale

Tutti i dati persistenti vivono in **IndexedDB** (database `roadbook`, schema v1), dietro il wrapper `src/utils/store-viaggi.js`. I componenti non accedono mai a `indexedDB` diretto né a `localStorage`.

Object store attivi (schema v1):

| Store | Chiave | Uso |
|---|---|---|
| `viaggi` | `viaggio.id` (slug ASCII) | record viaggio + metadati (origine, data import, dimensione) |
| `visitati` | `${viaggioId}:${areaId}-${n}` | flag "visitato" per punto |
| `note` | `${viaggioId}:${areaId}-${n}` | testo libero note personali |
| `routing` | `${viaggioId}:${areaId}` | geometria polyline encoded OSRM + modalità |
| `preferenze` | chiave semantica (es. `tema`) | valore |

**Convenzione chiavi composte**: `${viaggio.id}:${area.id}-${punto.n}` per i punti, `${viaggio.id}:${area.id}` per le aree. Le funzioni `chiavePunto()` e `chiaveArea()` sono esportate dallo store per costruirle in modo coerente.

**Bump di schema** (es. aggiunta di un nuovo object store): slice dedicata `store` con `risk:high`, che include migrazione all'interno di `upgrade()` in `openDB()`. **Non** droppare store esistenti senza migrazione di dati.

Niente `localStorage` / `sessionStorage` per dati applicativi. Niente cookies.

---

## Eccezioni al contratto di famiglia

Deviazioni da `CLAUDE-vue-app.md`:

- **JavaScript, non TypeScript** — il progetto è JS puro. Di conseguenza I-12 si applica solo per le parti disponibili: `npm run build` obbligatorio; `npm run type-check` non esiste (non c'è lint step configurato al momento — quando sarà aggiunto l'eslint, questa eccezione si accorcia).
- **Lingua di UI, errori e commenti**: **italiano**. Anche gli identificatori di dominio (variabili, funzioni, file) sono in italiano (`useViaggio`, `aree`, `chiavePunto`). I nomi tecnici universali (hook Vue, API standard: `ref`, `computed`, `onMounted`, `fetch`) restano inglesi.
- **Accessibilità WCAG AA (I-09)** è un obiettivo, ma non completamente auditato in v1.0. Obbligatorio sulle modifiche future; debito attuale tracciato come `TODO(a11y):` dove rilevato.

Nessun'altra deviazione rispetto a I-01..I-12.

---

## Non fare (specifico di questo repo)

Oltre a quanto già vietato nel contratto di famiglia:

- **Non hardcodare viaggi nel codice.** I viaggi vivono in IndexedDB. Il Friuli in `public/viaggi/` è un file di esempio distribuito col bundle, scoperto via `viaggi/manifest.json` autogenerato dal plugin Vite; ogni altro modo di precaricare contenuto nell'app è un errore di architettura (rompe il principio v2-ready).
- **Non toccare `base: '/roadbook/'`** in `vite.config.js` fuori da una slice di `config` dedicata. Cambiarlo romper il deploy su Pages e richiede di aggiornare anche `start_url`/`scope` nel manifest PWA.
- **Non introdurre tile ESRI** senza il plugin `esri-leaflet`. Il problema di proiezione è documentato in [specifiche §7.2](docs/SPECIFICHE-APP.md): marker sfasati rispetto alle tile. I provider attualmente abilitati sono: OpenStreetMap standard (default), CartoDB Voyager / Positron / Dark Matter, OpenTopoMap. Ognuno ha il proprio pattern di runtime caching nel service worker; **aggiungere un nuovo provider richiede di aggiornare `workbox.runtimeCaching` in `vite.config.js`** oltre alla registrazione in `PROVIDERS` di `MappaLeaflet.vue`, altrimenti funziona online ma non offline.
- **Non chiamare OSRM direttamente da un componente.** Il passaggio obbligato è `src/utils/routing-osrm.js → ottieniPercorso()`, che incapsula: cache IndexedDB, timeout 5s, fallback retta, invalidation esplicita tramite `forzaAggiornamento: true`. Skippare questo pipeline rompe il comportamento offline atteso.
- **Non impostare TTL applicativo sulla cache routing** (store `routing`). Il requisito chiave del progetto è che il percorso reale resti disponibile offline *indefinitamente* dopo il primo calcolo riuscito. Eventuali rotture di dati in quella cache sono invalidate esplicitamente dall'utente via bottone "Ricalcola percorso" nel modal Info.
- **Non rimuovere la polyline retta di fallback.** È il comportamento documentato per la primissima apertura di un'area senza rete; senza fallback l'utente vedrebbe una mappa senza percorso, più ambigua.
- **Non eseguire `Database.EnsureCreated()` mentale** — tradotto al nostro stack: non fare `indexedDB.deleteDatabase('roadbook')` in nessun flusso utente (nemmeno "reset" o "pulizia"). La cancellazione dati passa da un'azione esplicita ben visibile (es. elimina viaggio dal modal Info), non da operazioni a sciami.

---

## Hosting

GitHub Pages, deploy automatico via `.github/workflows/deploy.yml` a ogni push su `main`.

- Build su Node 22, JS actions su Node 24.
- Artefatto servito da `dist/`, path `/roadbook/` (sottopath del dominio GitHub Pages).
- L'abilitazione iniziale di Pages (*Settings → Pages → Source: GitHub Actions*) è stata fatta manualmente il 2026-04-24 (è una operazione una-tantum, non automatizzabile dal workflow per via dei permessi del `GITHUB_TOKEN`).

Rollback: `git revert` + push su `main`, il workflow rideploya da solo. Oppure in modalità urgenza: riattivare il tag di deploy precedente da `Actions → Re-run this workflow` su un run passato.

---

## Flusso principale (mappa mentale)

1. **Avvio**: leggi storage → se vuoto, autoscopri primo JSON in `public/viaggi/` via `manifest.json` → importa in IndexedDB → apri. Se storage ha 1 viaggio, aprilo. Se ne ha più di uno, mostra `SelettoreViaggio`.
2. **App caricata**: `HeaderApp` + `AreaTabs` + layout split (mobile: mappa sopra 40vh + lista sotto; desktop ≥900px: lista a sinistra 40% + mappa a destra).
3. **Cambio area**: `selezionaArea(id)` → `AreaPanel` renderizza i punti, `MappaLeaflet` ridisegna marker e richiede routing a `ottieniPercorso()` → cache hit o OSRM o retta.
4. **Click sincronizzato**: marker → popup + scroll lista; scheda → fly-to mappa + popup aperto.
5. **Visitato / note**: toggle immediato + persistenza su IndexedDB senza bottone "salva".
6. **Import altro viaggio**: `+` in header → `ModalCaricaViaggio` → drag/file/URL → `validaViaggio` → se id già presente, conferma sovrascrittura.
7. **Persistenza tema**: bottone ciclico header → IndexedDB `preferenze`.
8. **Backup**: modal Info → esporta JSON con tutti gli store, oppure importa un backup che riscrive IndexedDB.

---

## Convenzioni

- **Import** — path relativi (`../utils/store-viaggi.js`). Niente alias configurati al momento.
- **Naming** — italiano sul dominio (`viaggio`, `areaCorrente`, `puntiVisitati`), inglese sui primitivi Vue/JS (`ref`, `computed`, `onMounted`, `fetch`).
- **File** — `PascalCase.vue` per componenti, `camelCase.js` per composables e utilità. Niente estensione `.ts` (progetto JS).
- **Commit** — `{slice-type}: {breve descrizione}` in italiano. Body con bullet `-` per i dettagli quando servono.

---

## Test

**Solo manuale** al 2026-04-24.

Smoke check obbligato dopo slice UI-visibili classificate `risk:medium` o superiore:

1. `npm run build` verde.
2. `npm run preview` → apri `http://localhost:4173/roadbook/`.
3. Playwright (via MCP `mcp__plugin_playwright_playwright__*`) — almeno:
   - load desktop 1280×820
   - load mobile 390×844
   - click su una tab area diversa
   - click su un marker → verifica popup + sync lista
   - console errori vuota (`browser_console_messages level: error`)

Evidenze vanno citate in chat all'utente. Gli screenshot di lavoro vanno sotto `docs/screenshots/` solo se riusati nel README o in docs permanenti — altrimenti restano in `.playwright-mcp/` (gitignored).

Test automatici Vitest sono da aggiungere quando la base di codice cresce oltre un livello di criticità che le revisioni manuali non coprono più — non prima.

---

## Memoria dinamica

I file di memoria Claude Code di questo progetto vivono in:

```
C:\Users\aldeb\.claude\projects\d---RedBones-Tomita-roadbook\memory\
```

Contengono decisioni fondamentali prese dall'utente, profilo utente, pendenze di deploy, architettura dati. **Aggiornare la memoria** quando una decisione rilevante cambia o ne arriva una nuova; **non duplicare** il contenuto di questo `CLAUDE.md` o di `CLAUDE-vue-app.md` nella memoria.

---

## Briefing di inizio sessione (manuale, senza hook)

Mentre non è configurato un hook SessionStart, a ogni nuova sessione Claude:

1. Legge `MEMORY.md` (automatico).
2. Se l'operatore chiede esplicitamente "recupera memoria" o simili, ri-legge `STATO-PROGETTO.md` + `docs/SPECIFICHE-APP.md` per ricostruire il contesto.
3. Prima di una slice su UI, controlla la branch corrente e lo stato di `main` vs `develop` con `git status` / `git log --oneline -5` su entrambi.
4. Verifica la build locale con `npm run build` se sta per toccare codice (opzionale ma consigliato dopo un `git pull`).

Quando verrà attivato un hook `SessionStart` in `.claude/settings.json`, questa sezione si accorcia a un puntatore.
