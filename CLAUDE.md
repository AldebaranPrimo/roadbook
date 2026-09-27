# Claude Code — Roadbook

PWA per consultare itinerari di viaggio da file JSON, online e offline. Caso d'uso primario: viaggiatore in camper, consultazione da Android in zone montane senza connessione. Frontend Vue 3 + Vite + Leaflet + IndexedDB, deploy statico su GitHub Pages.

> **Questo file contiene solo le regole specifiche del repo Roadbook.** Tutto il resto lo stabilisce il contratto di famiglia `CLAUDE-vue-app.md`, importato qui sotto e quindi caricato a ogni sessione.

@CLAUDE-vue-app.md

## Allineamento col contratto di famiglia

**Data ultima sincronizzazione**: 2026-09-27 (contratto alleggerito del 2026-09-27, import `@` attivato; sync dal master `_master-contracts`, pilota della propagazione).

## Data adozione Documentation Layout

**Data adozione Documentation Layout**: 2026-05-13.

Tutto ciò che era in `docs/` prima del 2026-05-13 è da considerarsi documentazione legacy ai sensi del capitolo *Documentation layout* del contratto, salvo i tre file dell'ex `docs/analisi/` che sono stati convertiti retroattivamente in ADR sotto `docs/decisions/` con la stessa data di sincronizzazione (scelta consapevole dell'autore di praticare il nuovo pattern, in deroga alla raccomandazione del contratto sulla non-retroattività).

## Legacy documentation

L'unico file dichiarato legacy ai sensi del capitolo *Documentation layout*:

- [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md) — Specifiche iniziali del 24/4/2026. Alleggerito al 24/4 a documento storico del giorno zero. Contiene contesto iniziale e §6 "Problemi noti e lezioni apprese" ancora valido. Non consultare per scelte correnti.

Tutti gli altri file in `docs/` sono **doc viva** (`TODO.md`, `STATO-PROGETTO.md`, `tech-debt.md`; il `CHANGELOG.md` sta in radice dal 2026-09-26) o **ADR** (`docs/decisions/*.md`), nessun altro legacy.

## Issue tracker

- **Piattaforma**: GitHub, account `AldebaranPrimo`, repo `roadbook`; CLI `gh` autenticata come AldebaranPrimo (vedi memoria progetto `reference_account_github`).
- **Categoria proprietà**: `personal` — progetto personale pubblico di Marco Preti (Aldebaran Primo).
- **Collegamento cassetti↔issue**: ogni file in `docs/requests/` e `docs/incidents/` ha la sua issue GitHub, con rimando nei due sensi (file → URL issue, issue → percorso del file); facoltativo per `docs/tech-debt.md` e `docs/decisions/`.

**Politica corrente sulle voci `docs/tech-debt.md`: tutte file-only.** Le voci `TD-001..TD-006` aperte al 2026-05-13 sono note di compilazione, configurazione e tooling a uso interno dell'autore — non rivolte a utenti esterni, non funzionali, non bisognose di label / comment / assignment / input di terzi, quindi nessuna issue GitHub corrispondente.

Se in futuro emergerà una voce TD significativa (es. che richiede input di un tester o di un secondo dev, che ha contorni decisionali aperti, che beneficia di tracking visibile), si aprirà la corrispondente issue GitHub con cross-link `→ issue #N` nella voce. La policy resta `github`, l'applicazione è graduata caso per caso.

Le issue oggi aperte (#30 estensione modalità, #31 multimodalità intra-area) sono **feature/enhancement utenti-rilevanti**, non voci di tech-debt — sono tracciate dove devono essere, su GitHub Issues, non in `tech-debt.md`.

**Convenzioni issue su questo repo**:

- **Lingua**: italiano.
- **Tono**: tecnico, succinto, niente prosa lunga.
- **Branch ↔ issue**: i branch che chiudono una issue specifica usano il pattern `ai/<slice-type>/<issue-id>-<slug>` (es. `ai/feat/30-modalita-mezzi-vari`); gli altri `ai/<slice-type>/<slug>`. Le modifiche di sola documentazione non aprono branch (vedi *Politica git corrente*).
- **Commit message**: riferimento `(#N)` se la slice chiude una issue; PR body con `Closes #N` / `Fixes #N` per auto-close al merge.
- **`risk:<level>` label**: ogni issue code-change porta `risk:low` / `risk:medium` / `risk:high` / `risk:critical` (label create il 2026-05-13). Le definizioni stack-specific vivono nel capitolo *Execution workflow* (Intake) del contratto di famiglia: riflettono il *cognitive blast radius* (cosa va riconsiderato dopo il cambio + complessità del rollback plan), non un file-count. La label guida la review depth, il flusso PR, e il rollback plan.
  - Stato attuale repo: #30 ha `risk:low` (chiusa dalla PR #32 confermata risk:low); #31 ha `risk:high` (multimodalità intra-area con decisione di design ancora aperta).

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

**`prompt` + toast utente + check periodico** (rev 4 del contratto, I-08, aggiornata 2026-04-24):

- `registerType: 'prompt'` in `vite.config.js`: il SW nuovo scaricato resta in stato `waiting`; non prende il controllo finché l'utente non clicca il toast. **Non usare `autoUpdate`**: attiverebbe il SW in silenzio (`skipWaiting` + `clientsClaim`) ma la UI già caricata in memoria resterebbe vecchia, e su PWA installate con tab sempre aperta l'utente vedrebbe per giorni la versione precedente senza segnali visibili. Questo è esattamente il bug osservato in produzione il 2026-04-24 (B-3 nel CHANGELOG).
- `virtual:pwa-register/vue` wrappato in `src/composables/useAggiornamentoPwa.js`: espone `aggiornamentoDisponibile` reattivo + `aggiornaOra()`.
- Toast in `App.vue` mostrato quando `aggiornamentoDisponibile === true`: "✨ Nuova versione disponibile — Aggiorna ora". Click → `updateServiceWorker(true)` = `skipWaiting` + reload.
- **Check periodico obbligatorio**: `useAggiornamentoPwa` registra un `setInterval(registration.update(), 60min)` per forzare il browser a verificare il SW anche quando l'utente non chiude mai la tab (caso PWA installata). Senza questo controllo le PWA installate resterebbero sulla versione vecchia indefinitamente, perché il check del SW avviene di default solo alle navigation e una PWA installata non navighi mai.
- Se l'utente ignora il toast, l'aggiornamento avviene alla prossima chiusura di tutte le tab che tengono attivo il SW vecchio.

## Versionamento

Ogni commit destinato a essere visibile online **deve portare avanti `package.json.version`**, minimo la patch (`1.1.0 → 1.1.1`). Il bump vale per:

- Modifiche di codice (`src/**`, `vite.config.js`, `package.json` di dipendenze): sempre.
- Modifiche di docs (`docs/**`, `*.md`, commenti): sì se sono accompagnate da un deploy (promozione a `main`). No se restano in uno slice `docs` interno.
- Tooling puro o configurazione CI che non cambia il bundle prodotto: opzionale, ma raccomandato per tenere il badge sincronizzato con la SHA di build.

**Ragione**: il badge `v{version}` nell'header è l'unico modo per l'utente di distinguere a colpo d'occhio se la PWA sta mostrando l'ultima build o una cachata. Dimenticarsi il bump = impossibilità di distinguere bug veri da cache stantia, e rischio di segnalare falsi positivi. **Se dubiti se fare il bump, fallo**: un numero di versione "sprecato" costa nulla, un bug diagnosticato male costa molto.

---

## Repo & ecosistema

- Repo: **https://github.com/AldebaranPrimo/roadbook** (pubblico)
- Path locale: `D:\_RedBones\Tomita\roadbook`
- Sito live: **https://AldebaranPrimo.github.io/roadbook/**
- Specifiche funzionali: [`docs/SPECIFICHE-APP.md`](docs/SPECIFICHE-APP.md) (fonte di verità prodotto)
- Stato attuale del sistema: [`docs/STATO-PROGETTO.md`](docs/STATO-PROGETTO.md)
- Cronologia modifiche: [`CHANGELOG.md`](CHANGELOG.md)
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

Rilassamento attivo, ammesso dal contratto per queste scale: test automatici Vitest/Playwright **non obbligatori** — il backstop è uno smoke test manuale su `npm run preview` via Playwright MCP quando la slice tocca UI visibile (classificata almeno `risk:medium`, vedi *Test*). Quando passeremo a `small-team` (più di un dev attivo) si attivano review sulle PR verso `develop` e protezione di `main`.

---

## Politica git corrente

**Default del contratto e delle regole globali, nessun override** (decisione di Marco del 2026-09-27, che toglie la libertà dichiarata prima in *Scale*: commit diretti su `develop` con prefisso `ai/` facoltativo, sola documentazione su `main`):

- ogni slice su un branch `ai/<slice-type>/<slug>` (o `ai/<slice-type>/<issue-id>-<slug>` se chiude una issue) creato da `develop` prima di toccare file; a fine slice commit, push e PR verso `develop`, fatti da Claudio;
- le modifiche di sola documentazione vanno direttamente su `develop`, senza branch né PR;
- `develop` → `main` alla promozione (PR o merge), che rilascia su GitHub Pages; nessun commit diretto su `main`.

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
- **Accessibilità WCAG AA (I-09)** è un obiettivo, ma non completamente auditato in v1.0. Obbligatorio sulle modifiche future; debito attuale tracciato come [`TD-003`](docs/tech-debt.md) e come `TODO(a11y):` inline dove rilevato.
- **Code documentation applicato solo a file nuovi** — il capitolo *Code documentation* del contratto chiede header su file, funzioni esportate, composable e componenti. In Roadbook applichiamo gli header **a regime su file nuovi** e a file modificati in modo sostanziale (slice tematica su quel file). Niente refactor retroattivo di massa sulla codebase v1.0. Il livello di copertura crescerà organicamente nelle slice future.
- **Cassetti senza skill (temporanea)** — il contratto vuole i file dei cassetti creati con le skill del kit (`/decision-new`, `/request-new`, `/incident-new`, `/review-new`), che qui non sono ancora installate: finché non arrivano, i file si creano a mano sul modello di quelli già presenti nel cassetto, con lo stesso frontmatter.

Nessun'altra deviazione rispetto a I-01..I-15.

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

## Stato fra sessioni e memoria

Lo stato per riprendere il lavoro sta nel repo: `HANDOFF.md` (skill globali `recupera-memoria` / `salva-memoria`), `STATUS.md`, `docs/STATO-PROGETTO.md`. La memoria di Claude Code in `C:\Users\aldeb\.claude\projects\d---RedBones-Tomita-roadbook\memory\` è uno specchio: non duplica questo file né il contratto.

---

## Cassetti documentali

Secondo il capitolo *Documentation layout* di `CLAUDE-vue-app.md`. Stato corrente:

- **`docs/decisions/`** e **`docs/requests/`** — popolati.
- **`docs/incidents/`** — non ancora creato, nasce al primo incidente con impatto su utenti.
- **`docs/reviews/`** — non ancora creato, nasce alla prima revisione di un'AI esterna (Codex).
- **`docs/tech-debt.md`** — popolato.

Le skill del kit non sono installate: vedi l'eccezione *Cassetti senza skill*.

---

## Skill disponibili

Nessuna skill di progetto in `.claude/skills/` (il kit del master non è ancora installato qui). Valgono le skill globali della macchina, in particolare `recupera-memoria` e `salva-memoria` per il passaggio fra sessioni.
