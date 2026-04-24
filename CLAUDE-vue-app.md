# Contratto di esecuzione AI — Vue 3 app standalone (senza backend)

> **Versione contratto**: `1.1.0` (semver). Incrementi minor = aggiunte compatibili (nuovi invarianti, chiarimenti). Incrementi major = breaking change (rimozione o rinomina di invarianti, cambio di default che rompe repo conformi). Il `CLAUDE.md` di repo dichiara la versione a cui si conforma.
> Origine: derivazione da `CLAUDE-dotnet-vue-apps.md` (Skoda). Contratto **rilassato** per app Vue 3 autonome senza backend proprio, deployate come sito statico (GitHub Pages / Netlify / Cloudflare Pages / Vercel).
> Lingua: italiano per corpo, inglese per termini tecnici universali (slice, gate, commit, push, PR). Ambito: progetti di portata contenuta, team mono-developer o piccolo, spesso in fase MVP o beta.
> Storico revisioni in coda.

Questo documento regola il comportamento dell'agente AI sui progetti di questa famiglia. **Non è documentazione di prodotto**: è una policy di esecuzione in runtime.

L'AI deve seguire queste regole in modo stretto. Se un task non è eseguibile entro questi vincoli, l'AI si ferma e chiede chiarimento. Dove un punto è segnato come "rilassato" può essere saltato nelle condizioni indicate.

---

## Ambito

Progetti che soddisfano **tutte** le seguenti:

- **Frontend puro Vue 3** (`<script setup>`, Composition API), senza un proprio backend attivo. Eventuali servizi esterni consumati (tile server, API pubbliche come OSRM, endpoint REST di terzi) sono usati in *sola lettura* e non fanno parte del repo.
- **Build statico** — Vite o equivalente, output `dist/` servibile da qualsiasi CDN statica.
- **Storage locale** — `localStorage`, `IndexedDB`, `sessionStorage`. Nessun DB gestito nel repo.
- **Single dev o piccolo team**, deploy su ambiente personale/ricreativo/piccolo cliente; nessuna QA dedicata.

**Fuori scope**: app SSR (Nuxt/Astro full-stack), front-end accoppiati tightly a un backend interno nello stesso repo (→ vedere `CLAUDE-dotnet-vue-apps.md`), siti marketing / landing puri, applicazioni mobile native.

---

## Scale del progetto

| Scale | Definizione |
|---|---|
| 👤 **solo** | Dev singolo, uso personale o piccolo pubblico. **Default di questa famiglia.** |
| 🧪 **mvp** | Prima fase prima del rilascio pubblico stabile. Le regole di `solo` + disciplina di commit extra |
| 👥 **piccolo-team** | 2-4 dev, una parte d'utenti esterni. Si attivano PR, review, branch protection |
| 🔧 **porting** | Migrazione da stack precedente (Vue 2 → 3, Options API → Composition) |

Regole **rilassate** per `solo` / `mvp` / `porting`:

- Branch model completo (`ai/{slice-type}/{desc}` → `develop` → `main`) → su `solo` / `mvp` è ammesso **commit diretto su `develop`** senza branch intermedio, se la slice è piccola e ben circoscritta. Il passaggio `develop` → `main` resta manuale.
- PR formali con review → su `solo` le PR sono self-merge; su `mvp` si apre comunque la PR (utile come diario), ma il dev può mergiare da solo.
- Test automatici Vitest / Playwright obbligatori → rilassati a **consigliati**. Un test manuale documentato (checklist, screenshot Playwright ad hoc) è un sostituto accettabile su `solo` / `mvp`.
- Separate staging environment → non richiesto; il preview locale (`npm run preview`) è il banco di prova.

Regole **strette** indipendentemente dalla scale:

- Tutti gli **Invariants di stack** (I-01..I-15 più sotto).
- `npm run type-check` (se TS) + `npm run build` devono passare prima di un commit.
- Secrets (API key, token) mai committati. `.env*` mai nel repo.
- Nessuna nuova dipendenza runtime senza una ragione dichiarata nella task/commit.
- Nessuna modifica di `base` / `publicPath` / percorsi di deploy fuori da una slice dedicata.

---

## Modello di sviluppo

Sviluppo **AI-First, slice-driven**.

Una *slice* è un'unità di lavoro: verticalmente completa, testabile indipendentemente, minimale nello scope, rilasciabile e soprattutto **rollback-ready**.

Slice tipiche: nuovo componente, nuovo composable, nuovo view/route, nuova utility, nuova sezione di settings, refactor di un unico file, bugfix puntuale, adeguamento a una nuova versione di dipendenza.

Una slice **non** dovrebbe mescolare:
- feature nuove e refactor "di passaggio"
- bugfix e modifiche di stile cosmetiche non richieste
- aggiornamenti di dipendenze e logica applicativa

Se un intervento supera naturalmente questi confini, va **spezzato** in slice separate committate in sequenza.

---

## File Scope Rule

L'AI deve modificare solo:

- i file esplicitamente listati nel task
- i file strettamente necessari a far compilare / buildare / passare il type-check dopo le modifiche richieste

L'AI **non** deve:

- refattorizzare componenti non toccati dalla slice
- cambiare path alias, tsconfig, vite.config fuori da una slice dedicata
- aggiungere una nuova dipendenza senza un task che lo giustifichi
- fare bump major di framework (Vue 3.x → 4, Vite 5 → 6) in una slice non dedicata al bump
- toccare configurazioni di deploy (`vite.config.js` `base`, `.github/workflows/*`, `manifest` di PWA) fuori da una slice di infrastructure

---

## Debito tecnico — in-line markers

Il *File Scope Rule* vieta i refactor opportunistici, ma non vieta di **annotare** il debito trovato lungo il percorso.

Convenzione: `// TODO(<tag>): <motivo>` in una riga sola. Tag canonici:

- `TODO(refactor):` debito strutturale
- `TODO(perf):` debito di performance (re-render inutili, bundle size, N+1 fetch)
- `TODO(a11y):` accessibilità (aria, contrasto, keyboard)
- `TODO(i-NN):` violazione di un invariante specifico di questo contratto (es. `TODO(i-05): legge direttamente da localStorage, va passato dallo store astratto`)
- `FIXME:` comportamento rotto che l'autore non ha potuto sistemare nella slice corrente

Annotare un TODO in una slice che non è un refactor è **permesso e incoraggiato**: è documentazione, non il refactor stesso. Il refactor vero resta un'altra slice.

Per debito cross-file senza una sola home naturale, è accettabile un `docs/TECHDEBT.md` con: titolo, file coinvolti, severity, approccio suggerito.

---

## Workflow di esecuzione

### Fase 1 — Intake del task

Verificare che il task abbia: **Contesto**, **Goal**, **File coinvolti**, **Vincoli**, **Criteri di accettazione**. Se manca uno di questi, fermarsi e chiedere.

**Risk classification** (guida le gate della Fase 4):

- `risk:low` — label swap, tweak cosmetico, nuovo componente isolato, script di dev, commento
- `risk:medium` — nuova view/route, nuovo composable, nuova utility con test manuale, cambio schema storage in-versione con migrazione dichiarata
- `risk:high` — cambio del `base` di deploy, rotture di formato nello storage locale esistente (breaking schema), nuova dipendenza runtime pesante (>100KB gzip), modifica del service worker con invalidazione cache forzata
- `risk:critical` — rimozione di tutto uno store IndexedDB esistente senza migrazione, rotture breaking dell'interfaccia di import/export, cambio del dominio di deploy

### Fase 2 — Branch (su `piccolo-team`; rilassata su `solo`/`mvp`)

Creare `ai/{slice-type}/{short-description}` dal branch di integrazione (`develop` se esiste, altrimenti `main`).

Slice types: `component`, `view`, `composable`, `utility`, `store`, `fix`, `perf`, `refactor`, `a11y`, `style`, `config`, `docs`, `ci`, `deps`.

Il prefisso `ai/` è **sempre** usato quando Claude tocca il codice in modo sostanziale, indipendentemente dalla quantità di guida umana. È una traccia di authorship per l'audit, non un giudizio di qualità.

Commit umani non-banali usano prefissi liberi (`feat/`, `fix/` o diretti su `develop` per `solo`).

### Fase 3 — Implementazione

Prima di scrivere:

1. Se la task tocca API di una libreria poco conosciuta, consultare la docs ufficiale o usare uno stack-docs MCP (es. `context7`). Evitare di andare a memoria su API che potrebbero essere cambiate tra major.
2. Se la task ha >3 file da modificare, abbozzare un piano testuale (non serve plan-mode formale, basta un commento in chat).
3. Implementare **solo** ciò che è dichiarato. Debito osservato di passaggio → marker TODO.

### Fase 4 — Completamento (atomico)

Step 0 (**gate bloccante**) — Domande pendenti aperte all'utente. Se esistono domande non risposte su semantica business-observable (schema dei dati, comportamento visibile, scelte di formato), fermarsi e riaprirle.

Step 1–3: verifiche build. Se l'harness supporta hook automatici (Claude Code via `.claude/settings.json` PostToolUse, GitHub Actions pre-commit, lefthook, husky, o equivalenti), questi step si eseguono automaticamente su ogni edit e non richiedono esecuzione manuale prima del commit. Altrove, l'AI li esegue esplicitamente.

1. `npm run type-check` — deve passare (se TS, cioè se esiste `tsconfig.json`)
2. `npm run lint -- --fix` — deve passare (se lint configurato, es. ESLint + Prettier)
3. `npm run build` — deve passare

Step 4: test.

4. Se la slice ha aggiunto test automatici, eseguirli. Se la slice è UI-visibile e classificata `risk:high` o superiore, eseguire uno smoke test manuale (Playwright ad hoc o in-browser su `npm run preview`).

Step 4.5 (**gate bloccante pre-commit**) — **Self-review come PR review**. Prima di committare e aprire la PR, leggere **come se fossimo il reviewer umano** il diff completo della slice. L'obiettivo è cogliere in questa fase gli errori che un review umano avrebbe identificato (bug logici, edge case non gestiti, regressioni, XSS/injection, imports inutilizzati, pattern incoerenti con il resto del codebase, documentazione disallineata).

**Come si fa**: `git diff HEAD` (o `git diff --cached` dopo `git add`) sul branch di lavoro, letto dall'inizio alla fine con attenzione file per file. Per ciascun file toccato porsi la checklist minima:

- *Semantica*: il codice fa davvero quello che il task richiedeva? Ci sono rami logici mai eseguiti, condizioni impossibili, early-return che bypassano logica intenzionale?
- *Edge case*: valori `null`/`undefined`/stringa vuota/array vuoto/unicode/input ostili entrano bene nelle funzioni toccate?
- *Sicurezza*: ogni input utente o esterno passa da `escapeHtml` / `encodeURIComponent` / sanitize dove finisce in `innerHTML`, URL, storage? Ogni `fetch()` ha timeout e gestione errore?
- *Consistenza*: naming, pattern, uso di composables, passaggio dati tra componenti coerenti con il resto del codebase?
- *Dead code*: `TODO` obsoleti, variabili/import non usati, CSS orfano, `console.log` dimenticati?
- *Documentazione*: README/CHANGELOG/STATO-PROGETTO allineati con i cambi? Commenti al codice che spiegano il *perché* (non il cosa)?
- *Numerazione/lista*: se la slice modifica file strutturati (TODO.md numerati, CHANGELOG versioni), la rinumerazione è coerente? Non ci sono gap (#1 → #3 senza #2)?

**Se la self-review trova un problema**: correggerlo **prima** del commit. Se il problema è non-risolvibile (ambiguità sul comportamento atteso, scelta di design non banale, bug profondo che richiede una ri-progettazione della slice) **non chiudere la slice**: lasciarla aperta in locale o come draft PR, descrivere il problema trovato nel messaggio all'operatore umano, richiederne esplicitamente il supporto. Chiudere una slice con un problema noto per "velocità" è una violazione del contratto — si accumulano debiti invisibili che ripresentano il lavoro come bug nelle sessioni successive.

**Why**: esperienza concreta del 2026-04-24: più slice sono state chiuse dichiarando "smoke ok, build verde, zero errori console" pur contenendo problemi poi emersi alla review umana (numerazioni TODO non riallineate, voci del backlog ignorate in pianificazioni successive, stato di develop dichiarato incoerente con quello remoto, ecc.). Step 4.5 esiste per intercettare questa classe di errori senza richiedere un secondo paio d'occhi umano a ogni slice, indipendentemente dalla scale del progetto.

**Relazione con Step 5 (Copilot review)**: lo Step 4.5 resta obbligatorio anche quando al commit viene aggiunto `@copilot esegui revisione` (Step 5). I due gate sono **complementari, non alternativi**: Step 4.5 cattura errori che richiedono contesto del codebase e della sessione (scelte consolidate, convenzioni interne, coerenza tra docs e codice), Copilot cattura pattern generici di best-practice che la self-review può aver normalizzato per consuetudine di stile. La rimozione di Step 4.5 "perché tanto c'è Copilot" è una violazione del contratto.

Step 5–7: commit e deploy.

5. Commit — formato: `{slice-type}: {descrizione breve}\n\n{dettagli opzionali}`. **Se il commit andrà a popolare una PR** (branch `ai/*` o comunque non diretto su `main`/`develop` "piatti"), aggiungere al messaggio di commit — tipicamente in fondo, su riga dedicata — la stringa `@copilot esegui revisione`. Questo attiva la review automatica di GitHub Copilot sulla PR.
   > ⚠ **Regola temporanea / in valutazione** (introdotta 2026-04-24): la presenza simultanea di Step 4.5 self-review e Copilot review è intenzionale — l'utente sta testando Copilot come reviewer e vuole confrontare i due approcci in parallelo. Al termine del periodo di test deciderà se mantenere entrambi i gate, rimuovere la self-review (affidandosi a Copilot), o rimuovere Copilot (mantenendo solo la self-review). Finché la regola resta, **entrambi i gate sono obbligatori** (vedere nota nello Step 4.5).
6. Push branch
7. Se `solo` e la slice è su `develop`, fine. Se `piccolo-team` o la slice è su un branch `ai/`, aprire PR verso il branch di integrazione.

---

## Vietato senza autorizzazione esplicita

- Commit diretti su `main` quando esiste un branch `develop` e la slice non è docs-only. L'**eccezione docs-only** si applica a modifiche che toccano *esclusivamente*: `*.md`, `docs/**`, `CLAUDE*.md`, commenti di codice, e **opzionalmente** i soli campi *metadata* di `package.json` (`scripts`, `name`, `version`, `description`, `keywords`, `author`, `license`, `repository`, `bugs`, `homepage`). L'eccezione **non** copre `dependencies`, `devDependencies`, `peerDependencies`, `engines`, `type`, `main`, `exports`, `private`, o qualsiasi altro campo con effetto runtime/build. Se il diff di `package.json` tocca sia metadata sia campi runtime, la slice non è docs-only.
- Committare segreti: API key, token, credenziali di terze parti, chiavi private. `.env*` mai nel repo.
- Aggiungere una nuova dipendenza runtime (npm dependency, non devDependency) senza un task dedicato. `devDependencies` solo se davvero necessarie al flusso di build/test.
- Bumpare la versione major di framework (Vue, Vite, TS) fuori da una slice `deps` dedicata.
- Toccare `base` / `publicPath` / `.github/workflows/*.yml` fuori da una slice `ci` o `config`.
- Modificare `manifest` / `Workbox runtime caching` fuori da una slice dedicata alla PWA.
- Pushare con `--force` su `main` o su branch condivisi. `--force-with-lease` solo su branch personali.
- Saltare `npm run type-check` / `npm run build` con `git commit --no-verify` per aggirare hook falliti: il hook va capito e risolto, non bypassato.
- **Cancellare o rigenerare manualmente** `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`. Il lockfile è un artefatto deterministico del gestore pacchetti; va committato e modificato solo via `npm install` / `yarn add` / `pnpm add`. Conflitti di merge sul lockfile si risolvono rigenerando via `npm install` a partire dalla versione corretta di `package.json`, **non** cancellando il file.
- Spostare un modulo dallo store astratto (es. `useStorage`, `useSettings`) a un accesso diretto a `localStorage`/`IndexedDB`: l'astrazione esiste apposta per la portabilità futura (sync cloud, cambio backend).
- Usare `eval` / `new Function` / template injection con input esterni. Ogni JSON caricato dall'utente va prima **validato** secondo lo schema dichiarato.

---

## Invariants di stack

### Frontend Vue 3 + Vite

- **I-01** Nuovi componenti in Composition API con `<script setup>` (+ `lang="ts"` se il progetto è TS). Options API tollerata solo nei file non ancora migrati da Vue 2.
- **I-02** Nessun `this.$xxx` in file nuovi. In particolare `this.$store` → `useStore()` / Pinia; `this.$router` / `this.$route` → `useRouter()` / `useRoute()`; `this.$refs.xxx` → `const xxxRef = ref()`; `this.$nextTick` → `nextTick()`.
- **I-03** State globale condiviso: **Pinia** (se il progetto lo usa). Altrimenti composables con stato privato al modulo (`const state = ref(...)` fuori dal `useXxx()` esportato). Mai `window.*` per stato applicativo.
- **I-04** Path importazioni: se il progetto definisce un alias (es. `@/`), usarlo per moduli propri. Niente import a profondità `../../../`.
- **I-05** Storage locale sempre dietro uno **store astratto** (composable o utility function). I componenti non chiamano direttamente `localStorage.setItem` / `indexedDB.open`. La ragione è rendere possibile la sostituzione futura con un backend cloud o una diversa strategia di persistenza senza riscrivere i componenti.
  - **Droppare un object store / rinominare chiavi / cambiare formato di un record è vietato senza migrazione.** Una slice che modifica lo schema di storage deve implementare almeno una *migrazione forward* (i dati esistenti vengono letti e riformattati); deve documentare in un commento nel codice o nella PR se è ragionevole anche una *migrazione reverse*; se nessuna migrazione è possibile (caso raro e strutturale), deve prevedere un *reset esplicito* con conferma utente bloccante.
- **I-06** Percorsi statici sempre **relativi al `base` URL** — usare `import.meta.env.BASE_URL` per costruire URL di asset pubblici. Niente path assoluti con `/foo` che rompono il deploy in sottopath (GitHub Pages tipicamente serve da `/<nome-repo>/`).
- **I-07** Schema dei dati persisti o scambiati con l'esterno (JSON di configurazione, JSON importabili dall'utente) **versionato** con un campo esplicito (es. `$schema_version: "1.0"`). Una validazione dedicata con errori/avvisi chiari in lingua utente è il gate all'accesso dei dati all'app. Campi sconosciuti vanno **ignorati silenziosamente** per forward-compatibility.
  - **Sanitizzazione input**: ogni valore testuale proveniente da JSON utente, URL, `postMessage` o altri canali esterni che finisce in `innerHTML` / `v-html` / concatenato in stringhe HTML deve passare da una funzione di escape (es. `escapeHtml`). Se la feature richiede davvero HTML arbitrario, usare un sanitizer dichiarato (DOMPurify o equivalente), mai `v-html` raw. URL esterne inserite dall'utente (es. parametro `?viaggio=<url>`) passano da `new URL()` con whitelist di protocollo esplicita (tipicamente `http:` / `https:` e basta).
- **I-08** PWA, se presente: deve **funzionare davvero**. Un `<v-snackbar>` di "aggiornamento disponibile" con un flag mai toccato dal service worker è peggio che non avere PWA — nasconde la mancata implementazione dietro l'apparenza di averne una. O il flag è guidato da un evento del SW (tipicamente via `virtual:pwa-register/vue` di `vite-plugin-pwa`), o la PWA va rimossa dal progetto.
  - **Policy di aggiornamento SW dichiarata**: il `CLAUDE.md` di repo deve dichiarare esplicitamente come l'app si comporta quando Workbox scarica un nuovo SW. Opzioni tipiche: `autoUpdate` silenzioso (skipWaiting + reload automatico), `prompt-utente` (il SW resta in waiting finché l'utente non clicca un toast), `periodic-check` (polling di aggiornamenti). Senza policy esplicita, gli utenti possono restare bloccati su versione vecchia per settimane.
  - **Aggiungere una nuova risorsa esterna (tile provider, CDN foto, API endpoint) alla PWA richiede di aggiornare anche il `workbox.runtimeCaching` in `vite.config.js` / equivalente.** La risorsa senza pattern di caching funziona online e **si rompe silenziosamente offline** — è un comportamento subdolo scoperto solo quando qualcuno prova a usare l'app senza rete.
- **I-09** Accessibilità baseline: **WCAG 2.1 AA** come obiettivo. Almeno: skip link a `#main-content`, `aria-label` su controlli senza testo visibile, `aria-expanded` su toggleable, focus visibile con contrasto ≥3:1, colore mai l'unico veicolo di significato. Il CSS di tema chiaro/scuro deve passare i contrasti su entrambe le modalità.
- **I-10** Date e numeri: formattare tramite un singolo punto di passaggio (`src/utils/formatters.js` o `src/composables/useFormatters.js`). Niente `new Date().toLocaleString()` sparsi nei template.
- **I-11** Fetch verso endpoint esterni (tile server, OSRM, API di terzi): sempre con **timeout esplicito** (es. `AbortController`), **fallback graceful** quando il servizio non risponde, e **cache applicativa persistente** quando il dato è riutilizzabile tra sessioni offline. Un Workbox runtime cache non è sufficiente: ha eviction e TTL decisi dal SW, non dall'app.
  - **Durata della cache applicativa**: i dati riutilizzabili offline (tipicamente risultati di routing, map tiles, risposte di API lente) non hanno TTL imposto dal codice applicativo. L'invalidazione passa da un'azione utente esplicita (es. bottone "Ricalcola") o da un cambio di schema dichiarato. Il rischio "dati stantii" è accettato perché compensato dall'affidabilità offline.
  - **Attribuzione obbligatoria**: molti provider esterni (OpenStreetMap, CartoDB, OpenTopoMap, Mapbox) richiedono l'attribuzione visibile nella UI come condizione dei loro ToS. Verificare prima di committare che l'attribuzione sia presente e **non accidentalmente rimossa** da override CSS, `attributionControl: false` di Leaflet, o simili. Un'attribuzione nascosta è una violazione di licenza.
- **I-12** `npm run build` + eventuali `npm run type-check` (se TS) + `npm run lint -- --fix` (se lint configurato) **tutti verdi** prima del commit. La clausola `type-check` si applica solo se `tsconfig.json` è presente nel repo: per progetti JS puri non va dichiarata alcuna eccezione. Quando TS è presente, `tsconfig` con `strict: true` è il default; eventuali rilassamenti vanno dichiarati nel `CLAUDE.md` di repo con motivazione.
- **I-13** **Performance budget** dichiarato nel `CLAUDE.md` di repo. Defaults suggeriti (override-abili con motivazione):
  - Bundle JS iniziale (main chunk): **≤ 150 KB gzip**.
  - CSS totale: **≤ 30 KB gzip**.
  - Score Lighthouse PWA: **≥ 90** (categoria "PWA" se la PWA è attiva).
  - Sforare i default richiede una slice `perf` dedicata, oppure un override motivato nel `CLAUDE.md` di repo (es. *"budget bundle: 200 KB gzip per via di Leaflet + idb + 5 tile provider"*). Senza budget, le regressioni di performance non scattano nella `risk classification`.
- **I-14** **Link esterni**: ogni elemento `<a target="_blank">` richiede `rel="noopener"` per chiudere il vettore tabnabbing (la nuova tab non può più manipolare `window.opener`). `noreferrer` è opzionale: toglie `document.referrer`, utile se l'integrazione con analytics di terzi non è desiderata, ma può rompere funzionalità legate a origin tracking.
- **I-15** **Export/import dei dati utente locali**: se l'app conserva nello storage locale dati con valore per l'utente (note personali, stati, viaggi importati, configurazioni non banali), deve fornire una feature di **export** (scarica un JSON di backup) e **import** (carica un backup precedente) accessibile dalla UI. Motivazione: IndexedDB / localStorage sono cancellabili dal browser, dall'OS, dalla reinstallazione della PWA — senza export l'utente perde tutto in modo non recuperabile. Non è richiesto che l'export sia granulare (singolo record): basta un dump completo.

---

## Branch & Promotion Model

- `main` → produzione (deploy automatico via CI, tipicamente GitHub Pages)
- `develop` → integrazione (dove arrivano le slice, e dove il dev testa prima della promozione)
- `ai/{slice-type}/{desc}` → slice in lavorazione, da `develop`

```
ai/{slice-type}/{desc} → develop → main (promozione manuale via PR o merge)
```

Su scale `solo` / `mvp` il prefisso `ai/` può essere saltato per slice piccole e reversibili; il commit va comunque su `develop`, non su `main`.

**Eccezione docs-only** — modifiche che toccano *esclusivamente* `*.md`, `docs/**`, `CLAUDE*.md`, `.gitignore` con sole aggiunte pattern, commenti di codice, possono andare direttamente sul target di promozione (`main`) saltando il flusso `ai/* → develop → main`. L'eccezione **non** copre `package.json`, `vite.config.*`, `tsconfig*.json`, `.github/workflows/*`, `.env.example`, file di i18n consumati a runtime.

**Rebase vs merge** — prima di aprire una PR è buona abitudine fare rebase del branch `ai/*` sulla cima del branch di integrazione, per mantenere la storia lineare. Dopo la PR aperta non più rebase + force-push, altrimenti si invalidano i commenti di review.

---

## Risposta agli incidenti

Quando il deploy è rotto, l'app in produzione non parte, o una piattaforma (hosting, CDN, tile provider) si comporta in modo inatteso, tre principi vincolano il comportamento:

### 1. Leggere le docs ufficiali prima di speculare

Prima di proporre una modifica a flag di configurazione del hosting (build command, env var, redirect rules), aprire la docs ufficiale del provider o usare una ricerca web. Frase tipo "strano — X succede anche con la flag Y disattivata" senza citazione docs è un segnale di stop, non di itera.

### 2. Recupero prima di ottimizzazione

In modalità incidente il goal è **tornare all'ultimo stato buono noto**, non migliorare. Proporre un'ottimizzazione non ancora validata *durante* un incidente allunga l'incidente. Le ottimizzazioni si pianificano **fuori** dall'incidente, con un rollback plan esplicito.

### 3. Verificare prima di insistere quando l'utente contraddice

L'utente vede il proprio schermo; l'AI no. Se l'utente riporta che un file / log / UI state non c'è e l'inferenza dell'AI (da logs vecchi o contesto passato) dice il contrario, **verificare via comando live**, non insistere. Chiedere uno screenshot o l'output fresco di un comando.

---

## Livelli di conoscenza

| Layer | File | Ambito | Velocità di cambio |
|---|---|---|---|
| Contratto di famiglia | `CLAUDE-vue-app.md` (questo file) | Cross-repo Vue app standalone | Raro — mesi tra revisioni |
| Contratto di repo | `CLAUDE.md` alla root del repo | Questo singolo progetto: eccezioni, scelte hosting, deviazioni | Per sprint / per decisione rilevante |
| Memoria dinamica di repo | `MEMORY.md` + file topic sotto `~/.claude/projects/<hash>/memory/` | Singolo progetto, singolo dev, singola macchina | Continua — dopo ogni sessione |

**Regola di promozione**: un pattern osservato in **≥2 repo** della stessa famiglia è candidato a essere promosso dal `CLAUDE.md` di repo a `CLAUDE-vue-app.md`.

**Regola di demozione**: una regola in `CLAUDE-vue-app.md` che si rivela variabile per progetto va demossa a `CLAUDE.md` di repo, e sostituita qui da un principio più generale.

**Cosa NON mettere in memoria**: stato ricostruibile dal codebase (`git log`, lettura file, `git status`). Memoria è per **lezioni apprese**, non per snapshot di stato. Non duplicare il contratto nella memoria.

---

## `CLAUDE.md` di repo — sezioni minime

Quando si scaffold un nuovo repo di questa famiglia, il `CLAUDE.md` di root dovrebbe contenere almeno:

### Obbligatorie

1. **Intro** — un paragrafo sullo scopo dell'app, nella lingua di lavoro del progetto.
2. **Versione contratto di famiglia** — il `CLAUDE.md` di repo dichiara esplicitamente a quale versione di `CLAUDE-vue-app.md` si conforma (es. *"Conforme a CLAUDE-vue-app.md v1.1.0"*). Quando il contratto di famiglia sale di minor, i repo conformi restano validi; quando sale di major, i repo devono aggiornare o dichiarare conformità alla major precedente in modo esplicito.
3. **Lingua del progetto** — dichiarare le tre lingue operative:
   - *identificatori* (variabili, funzioni, classi, file): inglese universalmente, oppure lingua del progetto se l'utente lo preferisce (es. `useViaggio` vs `useTrip`);
   - *UI utente* (testi mostrati a schermo, etichette, messaggi di errore di validazione): lingua dei destinatari;
   - *commenti / log* (audience sviluppatore): di solito coincide con la lingua del progetto.
   Se non dichiarata, il default è: **identificatori e commenti in inglese**, **UI nella lingua dichiarata del prodotto**.
4. **Repo & ecosistema** — URL del repo, path locale, posizione in un eventuale ecosistema multi-repo.
5. **Stack** — versioni di runtime e framework effettivamente bloccate in `package.json`. Vanno qui perché le versioni derivano in fretta.
6. **Scale dichiarata** — `solo` / `mvp` / `piccolo-team` / `porting`.
7. **Storage locale** — cosa vive in `localStorage` / `IndexedDB` / URL / ecc., con convenzioni sulle chiavi.
8. **Performance budget** — valori effettivi in uso (bundle gzip, CSS gzip, Lighthouse target), con motivazione esplicita per eventuali override rispetto ai default di I-13.
9. **Policy di aggiornamento SW** (se PWA attiva) — `autoUpdate`, `prompt-utente`, `periodic-check`, o altro; con eventuali dettagli (es. toast "Aggiorna ora").
10. **Eccezioni al contratto di famiglia** — ogni deviazione da I-01..I-15 con motivazione. Se non ci sono, dichiararlo esplicitamente.
11. **Non fare** — footgun specifici di questo repo, **non** duplicati della sezione *Vietato* del contratto generico.

### Raccomandate

12. **Hosting** — dove deploya, quali configurazioni ci sono sul provider, link a eventuale `docs/DEPLOY.md`.
13. **Convenzioni** — path alias, convenzioni di naming specifiche, logging.
14. **Flusso principale** — la mappa mentale di ciò che l'app fa end-to-end, in una pagina.
15. **Test** — cosa è testato automatico vs manuale, e perché.

### Cosa NON va nel `CLAUDE.md` di repo

- Ripetizione degli invarianti I-01..I-15.
- Pattern generici di Vue / Pinia / Vite (stanno nelle skill di stack o nella docs ufficiale).
- Stato di sessione corrente (è territorio del hook SessionStart o della memoria).
- Lezioni accumulate (memoria).

### Scheletro minimo

```markdown
# Claude Code — <Nome App>

<un paragrafo su cosa fa>

## Repo & ecosistema
...

## Stack
## Scale
## Storage locale
## Eccezioni al contratto di famiglia
## Non fare

> Le parti non elencate qui seguono il contratto di famiglia in `CLAUDE-vue-app.md`.
```

Se una sezione sarebbe vuota, dichiararlo ("nessuna deviazione dal contratto di famiglia") piuttosto che ometterla. L'assenza di una sezione è ambigua, una sezione vuota è inequivoca.

---

## Glossario

| Termine | Significato in questa famiglia |
|---|---|
| Slice | Unità atomica di lavoro |
| Task | Descrizione strutturata di una slice |
| View | File `.vue` mappato a una route, sotto `src/views/` |
| Component | File `.vue` riutilizzabile, sotto `src/components/` |
| Composable | Funzione TS/JS con stato reattivo, sotto `src/composables/` |
| Store astratto | Wrapper di persistenza (composable o utility) che nasconde `localStorage` / `IndexedDB` ai componenti, per rendere la persistenza sostituibile |
| Scale | Fascia di complessità/criticità del progetto (`solo`, `mvp`, `piccolo-team`, `porting`) |
| Slice AI-led | Slice in cui Claude ha toccato il codice in modo sostanziale; prefisso di branch `ai/` |

---

## Storico revisioni

Solo le revisioni non banali sono registrate qui.

- **2026-04-24** (rev 4 = **v1.1.0**) — Aggiornamento consolidato derivato dalla critica costruttiva alla rev 1. Versionamento semver esplicito del contratto (dichiarato in intestazione, ogni `CLAUDE.md` di repo deve dichiarare la versione a cui si conforma). Nuovi invarianti aggiunti: I-13 performance budget con defaults override-abili, I-14 link esterni con `rel="noopener"`, I-15 export/import dati utente locali. Invarianti ampliati: I-05 (migrazioni storage obbligatorie, reverse o reset), I-07 (sanitizzazione input utente + whitelist protocolli URL), I-08 (policy aggiornamento SW dichiarata + nuova risorsa esterna richiede runtime caching SW), I-11 (durata cache indefinita + attribuzione obbligatoria), I-12 (TS solo se `tsconfig.json` presente). Sezioni minime `CLAUDE.md` di repo estese: versione contratto, lingua progetto, performance budget, policy SW. Eccezione docs-only ora include metadata di `package.json`. Nuovo divieto: rigenerare a mano i lockfile. Step 1-3 Fase 4 resi harness-agnostic. Chiarito che Step 4.5 resta gate obbligatorio anche con `@copilot esegui revisione` (rev 3). I repo conformi a v1.0.x devono aggiungere al loro `CLAUDE.md` le sezioni "Versione contratto", "Lingua progetto", "Performance budget", "Policy SW" quando aggiornano a v1.1.0; nessuna altra breaking change.
- **2026-04-24** (rev 3 = v1.0.2) — Aggiunta al Fase 4 Step 5: ogni commit destinato a diventare una PR deve includere `@copilot esegui revisione` nel messaggio, per attivare la review automatica di GitHub Copilot come secondo pass complementare alla self-review dello Step 4.5.
- **2026-04-24** (rev 2 = v1.0.1) — Aggiunto Step 4.5 "Self-review come PR review" nella Fase 4 del workflow. Gate bloccante pre-commit: leggere il diff completo come se fossimo il reviewer umano (semantica, edge case, sicurezza, consistenza, dead code, documentazione, numerazione). Se la self-review trova un problema non banale, non chiudere la slice. Primo trigger: slice chiuse senza riallineare TODO.md / CHANGELOG, generando incoerenze che l'utente ha dovuto segnalare manualmente.
- **2026-04-24** (rev 1 = v1.0.0) — Derivazione iniziale da `CLAUDE-dotnet-vue-apps.md` (Skoda) rev 1. Rimosse sezioni backend (Dapper, EF, JWT, SQL, publish profiles, Vuetify). Riscritti gli invarianti come `I-01..I-15`: solo frontend Vue 3 + Vite + Pinia opzionale, storage locale dietro astrazione, schema JSON versionato, PWA reale o assente, percorsi relativi al `base`, fetch esterni con timeout + cache applicativa, WCAG 2.1 AA. Ammessa `solo` come scale di default con rilassamenti espliciti sul branch model e sui test automatici. Eccezione docs-only estesa a `CLAUDE*.md`. Prima applicazione sul progetto **Roadbook**.
