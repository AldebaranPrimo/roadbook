# Tech Debt

> Registro centralizzato del debito tecnico di Roadbook. Singolo file vivente, schema previsto dal capitolo *Documentation Layout & Lifecycle* del contratto `CLAUDE-vue-app.md` (rev 8).

## Convention

- **ID format**: `TD-NNN` (zero-padded 3 cifre).
- **Stato**: `aperto` | `in-corso` | `chiuso` (le voci chiuse restano archiviate sotto la sezione "Voci chiuse").
- **Inline marker (opzionale)**: `TODO(td-NNN)` nel codice → corrisponde alla voce qui. Marker in-code senza voce qui = bug, va aperta la voce.

## Voci aperte

### TD-001 — Ristrutturazione branch a tre livelli `main` + `production` + `develop`

- **Stato**: aperto
- **Priorità**: media
- **Tipo**: processo / CI
- **File coinvolti**: `.github/workflows/deploy.yml`, `CLAUDE.md` (sezioni "Scale" e "Hosting")
- **Aperto il**: 2026-04-24
- **Motivo**: dopo il banner GitHub ricorrente "Compare & pull request" sul branch `main`, l'utente ha pianificato di separare il branch di lavoro da quello di deploy. Modello target: `main` = lavoro, `production` = pubblicazione (deploy GitHub Pages solo da qui), `develop` = feature complesse multi-slice (dormiente quando non serve).
- **Approccio suggerito**:
  1. Allinea locale: `git pull` su main e develop, cancella eventuali branch slice già mergiati.
  2. Crea `production` da `origin/main` (snapshot attuale = stato pubblicato).
  3. Modifica `.github/workflows/deploy.yml`: trigger `branches: [main]` → `branches: [production]`.
  4. Riscrivi `CLAUDE.md` sezioni "Scale" e "Hosting" con il nuovo flusso a tre branch, rimuovi la regola "commit diretti su main solo per docs-only".
  5. Bumpa versione (patch).
  6. Aggiorna `CHANGELOG.md`.
  7. Commit + push su main + primo push a production (per attivare il nuovo trigger sul deploy corrente).
  8. Branch protection su production da Settings → Branches (a mano, lato utente).
- **Note di rischio**: dopo il cambio trigger, il prossimo commit su main **non** sarà deployato finché non si fa il primo push a production (passo 7 parte integrante). Il default branch GitHub resta `main` (niente da toccare). Da discutere al kickoff: (a) push diretto vs PR per main → production; (b) tenere `develop` sincronizzato con main o lasciarlo indietro fino all'uso; (c) branch protection stringente o light.

### TD-002 — Test Vitest per le utility pure

- **Stato**: aperto
- **Priorità**: bassa
- **Tipo**: test
- **File coinvolti**: `src/utils/valida-schema.js`, `src/utils/routing-osrm.js` (decoder polyline), `src/utils/mappe-esterne.js`
- **Aperto il**: 2026-04-24
- **Motivo**: queste utility sono pure (input → output deterministico) e ad alta criticità funzionale, ma oggi non hanno test automatici. Non blocca nulla nello sviluppo corrente perché il backstop è lo smoke manuale Playwright, ma la confidenza nelle modifiche scala male man mano che la logica si complica.
- **Approccio suggerito**: introdurre Vitest come dev dependency, configurare in `vite.config.js` (o `vitest.config.js` separato), partire con `valida-schema.test.js` (massima copertura su input malformati) e `routing-osrm.test.js` per il decoder polyline. Mantenere il pattern manual smoke per i componenti Vue, dove l'overhead di mocking è alto.

### TD-003 — Audit WCAG 2.1 AA

- **Stato**: aperto
- **Priorità**: media
- **Tipo**: a11y
- **File coinvolti**: trasversale, in particolare `App.vue`, `HeaderApp.vue`, `MappaLeaflet.vue`, tutti i modal e PuntoCard
- **Aperto il**: 2026-04-24
- **Motivo**: l'invariante I-09 del contratto di famiglia richiede WCAG 2.1 AA come obiettivo. In v1.0 non c'è stato un audit completo. Carenze note: skip link a `#main-content` mancante, `aria-expanded` da verificare sui modal, controllo contrasti in tutti e 5 i provider tile + tema scuro non sistematico, navigazione tastiera completa non testata.
- **Approccio suggerito**: slice dedicata `ai/a11y/audit-wcag-aa` con run di Lighthouse a11y + axe-core su desktop e mobile, lista di fix per priorità, applicazione progressiva. Tracking di marker `TODO(a11y):` in-code dove si rileva un problema durante una slice diversa.

### TD-004 — ESLint + Prettier non configurati

- **Stato**: aperto
- **Priorità**: bassa
- **Tipo**: tooling
- **File coinvolti**: `package.json`, nuovi file `.eslintrc.*` e `.prettierrc`
- **Aperto il**: 2026-04-24
- **Motivo**: oggi il progetto non ha lint step. Un semplice `eslint-config` Vue 3 con regole blande coprirebbe già i casi critici (unused imports, var drift, mismatch di indentazione, hook lifecycle in posizioni sbagliate).
- **Approccio suggerito**: slice `ai/config/eslint-prettier`. Config base Vue 3 + Prettier, fix automatico delle violazioni esistenti in commit separato, `npm run lint` aggiunto agli script. Probabile attivazione di pre-commit hook in slice successiva.

### TD-005 — Possibile migrazione JS → TS

- **Stato**: aperto
- **Priorità**: bassa (valutativa)
- **Tipo**: refactor
- **File coinvolti**: trasversale, ~15 file
- **Aperto il**: 2026-04-24
- **Motivo**: progetto oggi JS puro, scope contenuto (~15 file). Beneficio concreto su `src/utils/store-viaggi.js` e `src/utils/valida-schema.js` che oggi ricostruiscono i tipi "a mano" nei commenti. La codebase è ancora piccola, la migrazione richiederebbe sforzo non trascurabile, e il valore aggiunto è scarso finché si lavora solo l'autore. Da valutare quando la codebase cresce o quando arriverà un secondo dev.
- **Approccio suggerito**: rinviato. Decisione di principio prima di slice implementativa. Se ci si muove: rename progressivo `.js` → `.ts`, `jsconfig.json` esiste già e regge tipi globali Vite, mantenere `strict: true` come default come da invariante I-12.

### TD-006 — Hook Claude Code (`.claude/settings.json`)

- **Stato**: aperto
- **Priorità**: bassa
- **Tipo**: tooling / DX
- **File coinvolti**: `.claude/settings.json` (già esistente con SessionStart per MCP Playwright)
- **Aperto il**: 2026-04-24
- **Motivo**: hook PostToolUse per auto-build su Edit + briefing aggiuntivi su SessionStart sarebbero utili soprattutto quando la codebase cresce o quando si passa a `piccolo-team`. Oggi gli hook esistenti sono sufficienti per il flusso solo dev.
- **Approccio suggerito**: rinviato. Da attivare quando emerge un pain point concreto (es. dimenticanza ricorrente di rebuild, o secondo dev che non ricorda i pre-requisiti di sessione).

## Voci chiuse

*Nessuna voce chiusa al momento.*

> Quando una voce passa da `aperto` / `in-corso` a `chiuso`, spostarla qui sotto. Aggiungere `**Stato**: chiuso il YYYY-MM-DD`, `**Risolto da**: branch/commit/PR`, e una breve `**Note**` di chiusura. Non eliminare le voci chiuse: la storia del debito è parte integrante della documentazione del progetto.
