# AI Execution Contract — Vue 3 standalone app (no backend)

> **Data ultimo aggiornamento**: 2026-05-12
> **Data ultima sincronizzazione**: 2026-05-12
>
> Origin: derived from `CLAUDE-dotnet-vue-apps.md` (Skoda). **Relaxed** contract for self-contained Vue 3 apps without their own backend, deployed as static sites (GitHub Pages / Netlify / Cloudflare Pages / Vercel).
> Language: English for body, Italian retained for canonical doc templates (ADR/request/incident sections describing files that will be written in Italian unless the per-repo `CLAUDE.md` declares otherwise). Scope: small-scope projects, single or small teams, often in MVP or beta phase.
> See *Revision history* at the bottom for non-trivial revisions.

This document governs AI agent behavior on projects in this family. It is a **runtime execution policy**, not product documentation.

The AI must follow these rules strictly. If a task cannot be executed within these constraints, the AI stops and asks for clarification. Where a rule is marked "relaxed", it can be skipped under the stated conditions.

---

## Scope

Projects that meet **all** of the following:

- **Pure Vue 3 frontend** (`<script setup>`, Composition API), with no active backend of their own. External services consumed (tile servers, public APIs like OSRM, third-party REST endpoints) are read-only and not part of the repo.
- **Static build** — Vite or equivalent, `dist/` output servable from any static CDN.
- **Local storage** — `localStorage`, `IndexedDB`, `sessionStorage`. No DB managed in the repo.
- **Single dev or small team**, deploy to personal/recreational/small-client environment; no dedicated QA.

**Out of scope**: SSR apps (Nuxt/Astro full-stack), frontends tightly coupled to an internal backend in the same repo (→ see `CLAUDE-dotnet-vue-apps.md`), pure marketing/landing sites, native mobile applications.

---

## Project scale

| Scale | Definition |
|---|---|
| 👤 **solo** | Single dev, personal use or small audience. **Default of this family.** |
| 🧪 **mvp** | Early phase before stable public release. `solo` rules + extra commit discipline |
| 👥 **small-team** | 2-4 devs, some external users. PR, review, branch protection are activated |
| 🔧 **porting** | Migration from previous stack (Vue 2 → 3, Options API → Composition) |

Rules **relaxed** for `solo` / `mvp` / `porting`:

- Full branch model (`ai/{slice-type}/{desc}` → `develop` → `main`) → on `solo` / `mvp` **direct commit on `develop`** is allowed without intermediate branch, if the slice is small and well-circumscribed. The `develop` → `main` promotion remains manual.
- Formal PRs with review → on `solo`, PRs are self-merge; on `mvp` the PR is opened anyway (useful as a journal), but the dev can merge alone.
- Mandatory automated Vitest / Playwright tests → relaxed to **recommended**. A documented manual test (checklist, ad-hoc Playwright screenshot) is an acceptable substitute on `solo` / `mvp`.
- Separate staging environment → not required; local preview (`npm run preview`) is the test bench.

Rules **strict regardless of scale**:

- All **Stack Invariants** (I-01..I-15 below).
- `npm run type-check` (if TS) + `npm run build` must pass before commit.
- Secrets (API keys, tokens) never committed. `.env*` never in repo.
- No new runtime dependency without a declared reason in the task/commit.
- No changes to `base` / `publicPath` / deploy paths outside a dedicated slice.

---

## Development model

**AI-First, slice-driven** development.

A *slice* is a unit of work: vertically complete, independently testable, minimal in scope, releasable, and above all **rollback-ready**.

Typical slices: new component, new composable, new view/route, new utility, new settings section, single-file refactor, point bugfix, adaptation to a new dependency version.

A slice should **not** mix:
- new features and "drive-by" refactors
- bugfixes and unsolicited cosmetic style changes
- dependency updates and application logic

If an intervention naturally exceeds these boundaries, it must be **split** into separate slices committed in sequence.

---

## File Scope Rule

The AI must modify only:

- the files explicitly listed in the task
- the files strictly necessary to make the build/type-check pass after the requested changes

The AI **must not**:

- refactor components not touched by the slice
- change path aliases, tsconfig, vite.config outside a dedicated slice
- add a new dependency without a task that justifies it
- bump major framework versions (Vue 3.x → 4, Vite 5 → 6) in a slice not dedicated to the bump
- touch deploy configurations (`vite.config.js` `base`, `.github/workflows/*`, PWA `manifest`) outside an infrastructure slice

---

## Technical debt — in-line markers

The *File Scope Rule* forbids opportunistic refactors but does not forbid **annotating** debt found along the way.

Convention: `// TODO(<tag>): <reason>` on a single line. Canonical tags:

- `TODO(refactor):` structural debt
- `TODO(perf):` performance debt (unnecessary re-renders, bundle size, N+1 fetch)
- `TODO(a11y):` accessibility (aria, contrast, keyboard)
- `TODO(i-NN):` violation of a specific invariant of this contract (e.g., `TODO(i-05): reads directly from localStorage, should go through the abstract store`)
- `FIXME:` broken behavior the author could not fix in the current slice

Annotating a TODO in a slice that is not a refactor is **allowed and encouraged**: it's documentation, not the refactor itself. The actual refactor remains a separate slice.

For cross-file debt without a single natural home, a `docs/TECHDEBT.md` is acceptable with: title, files involved, severity, suggested approach.

---

## Execution workflow

### Phase 1 — Task intake

Verify the task has: **Context**, **Goal**, **Files involved**, **Constraints**, **Acceptance criteria**. If any of these is missing, stop and ask.

**Risk classification** (drives Phase 4 gates):

- `risk:low` — label swap, cosmetic tweak, isolated new component, dev script, comment
- `risk:medium` — new view/route, new composable, new utility with manual test, in-version storage schema change with declared migration
- `risk:high` — deploy `base` change, format breakage in existing local storage (breaking schema), new heavy runtime dependency (>100KB gzip), service worker change with forced cache invalidation
- `risk:critical` — removal of an entire existing IndexedDB store without migration, breaking changes to import/export interface, deploy domain change

### Phase 2 — Branch (on `small-team`; relaxed on `solo`/`mvp`)

Create `ai/{slice-type}/{short-description}` from the integration branch (`develop` if it exists, otherwise `main`).

Slice types: `component`, `view`, `composable`, `utility`, `store`, `fix`, `perf`, `refactor`, `a11y`, `style`, `config`, `docs`, `ci`, `deps`.

The `ai/` prefix is **always** used when Claude touches code substantially, regardless of how much human guidance there is. It is an authorship trace for audit, not a quality judgment.

Non-trivial human commits use free prefixes (`feat/`, `fix/`, or direct on `develop` for `solo`).

### Phase 3 — Implementation

Before writing:

1. If the task touches APIs of a less-known library, consult the official docs or use a stack-docs MCP (e.g., `context7`). Avoid going from memory on APIs that may have changed between majors.
2. If the task has >3 files to modify, sketch a textual plan (no formal plan-mode needed, just a chat comment).
3. Implement **only** what is declared. Drive-by debt observed → TODO marker.

### Phase 4 — Completion (atomic)

Step 0 (**blocking gate**) — Pending questions to the user. If unanswered questions exist on business-observable semantics (data schema, visible behavior, format choices), stop and reopen them.

Steps 1–3: build verifications. If the harness supports automated hooks (Claude Code via `.claude/settings.json` PostToolUse, GitHub Actions pre-commit, lefthook, husky, or equivalent), these steps run automatically on every edit and don't require manual execution before commit. Elsewhere, the AI runs them explicitly.

1. `npm run type-check` — must pass (if TS, i.e., if `tsconfig.json` exists)
2. `npm run lint -- --fix` — must pass (if lint configured, e.g., ESLint + Prettier)
3. `npm run build` — must pass

Step 4: tests.

4. If the slice added automated tests, run them. If the slice is UI-visible and classified `risk:high` or above, run a manual smoke test (ad-hoc Playwright or in-browser on `npm run preview`).

Step 4.5 (**blocking pre-commit gate**) — **Self-review as PR review**. Before committing and opening the PR, read the full diff of the slice **as if we were the human reviewer**. The goal is to catch in this phase the errors a human review would have identified (logic bugs, unhandled edge cases, regressions, XSS/injection, unused imports, patterns inconsistent with the rest of the codebase, misaligned documentation).

**How**: `git diff HEAD` (or `git diff --cached` after `git add`) on the working branch, read from start to end carefully file by file. For each touched file pose the minimum checklist:

- *Semantics*: does the code really do what the task required? Are there logic branches never executed, impossible conditions, early-returns that bypass intentional logic?
- *Edge cases*: do `null`/`undefined`/empty string/empty array/unicode/hostile inputs flow correctly through the touched functions?
- *Security*: does every user or external input go through `escapeHtml` / `encodeURIComponent` / sanitize where it ends up in `innerHTML`, URL, storage? Does every `fetch()` have timeout and error handling?
- *Consistency*: naming, patterns, composables usage, data passing between components consistent with the rest of the codebase?
- *Dead code*: stale `TODO`s, unused variables/imports, orphan CSS, forgotten `console.log`?
- *Documentation*: README/CHANGELOG/STATO-PROGETTO aligned with changes? Code comments that explain the *why* (not the what)?
- *Numbering/list*: if the slice modifies structured files (numbered TODO.md, CHANGELOG versions), is renumbering coherent? No gaps (#1 → #3 without #2)?

**If self-review finds a problem**: fix it **before** commit. If the problem is unresolvable (ambiguity on expected behavior, non-trivial design choice, deep bug requiring slice redesign) **do not close the slice**: leave it open locally or as a draft PR, describe the found problem in the message to the human operator, explicitly request support. Closing a slice with a known problem for "speed" is a contract violation — it accumulates invisible debt that resurfaces as bugs in later sessions.

**Why**: concrete experience from 2026-04-24: multiple slices were closed declaring "smoke ok, build green, zero console errors" while containing problems that emerged at human review (TODO numbering not realigned, backlog items ignored in subsequent planning, declared develop state inconsistent with remote, etc.). Step 4.5 exists to catch this class of errors without requiring a second pair of human eyes on every slice, regardless of project scale.

**Relation with Step 5 (Copilot review)**: Step 4.5 remains mandatory even when `@copilot review` is added at commit (Step 5). The two gates are **complementary, not alternative**: Step 4.5 catches errors requiring codebase and session context (consolidated choices, internal conventions, coherence between docs and code), Copilot catches generic best-practice patterns that self-review may have normalized through style habit. Removing Step 4.5 "because there's Copilot" is a contract violation.

Steps 5–7: commit and deploy.

5. Commit — format: `{slice-type}: {short description}\n\n{optional details}`. **If the commit will populate a PR** (branch `ai/*` or otherwise not direct on flat `main`/`develop`), append to the commit message — typically at the bottom on a dedicated line — the string `@copilot review`. This activates GitHub Copilot's automatic review on the PR.
   > ⚠ **Temporary / under evaluation rule** (introduced 2026-04-24): the simultaneous presence of Step 4.5 self-review and Copilot review is intentional — the user is testing Copilot as reviewer and wants to compare the two approaches in parallel. At the end of the test period the user will decide whether to keep both gates, remove self-review (relying on Copilot), or remove Copilot (keeping only self-review). While the rule stands, **both gates are mandatory** (see note in Step 4.5).
6. Push branch.
7. If `solo` and the slice is on `develop`, done. If `small-team` or the slice is on an `ai/` branch, open PR toward the integration branch.

---

## Forbidden without explicit authorization

- Direct commits on `main` when a `develop` branch exists and the slice is not docs-only. The **docs-only exception** applies to changes that touch *exclusively*: `*.md`, `docs/**`, `CLAUDE*.md` and code comments. The exception **does not** cover `package.json`: any modification to `package.json` (including metadata fields like `scripts`, `name`, `version`, `description`, `keywords`, `author`, `license`, `repository`, `bugs`, `homepage`) makes the slice non-docs-only.
- Committing secrets: API keys, tokens, third-party credentials, private keys. `.env*` never in repo.
- Adding a new runtime dependency (npm dependency, not devDependency) without a dedicated task. `devDependencies` only if truly necessary to the build/test flow.
- Bumping major framework versions (Vue, Vite, TS) outside a dedicated `deps` slice.
- Touching `base` / `publicPath` / `.github/workflows/*.yml` outside a `ci` or `config` slice.
- Modifying `manifest` / `Workbox runtime caching` outside a slice dedicated to PWA.
- Pushing with `--force` on `main` or shared branches. `--force-with-lease` only on personal branches.
- Bypassing `npm run type-check` / `npm run build` with `git commit --no-verify` to circumvent failed hooks: the hook must be understood and resolved, not bypassed.
- **Manually deleting or regenerating** `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`. The lockfile is a deterministic artifact of the package manager; it must be committed and modified only via `npm install` / `yarn add` / `pnpm add`. Lockfile merge conflicts are resolved by regenerating via `npm install` from the correct version of `package.json`, **not** by deleting the file.
- Moving a module from the abstract store (e.g., `useStorage`, `useSettings`) to direct access of `localStorage`/`IndexedDB`: the abstraction exists precisely for future portability (cloud sync, backend swap).
- Using `eval` / `new Function` / template injection with external inputs. Every JSON loaded by the user must first be **validated** against the declared schema.

---

## Stack Invariants

### Vue 3 + Vite Frontend

- **I-01** New components in Composition API with `<script setup>` (+ `lang="ts"` if the project is TS). Options API tolerated only in files not yet migrated from Vue 2.
- **I-02** No `this.$xxx` in new files. In particular `this.$store` → `useStore()` / Pinia; `this.$router` / `this.$route` → `useRouter()` / `useRoute()`; `this.$refs.xxx` → `const xxxRef = ref()`; `this.$nextTick` → `nextTick()`.
- **I-03** Shared global state: **Pinia** (if the project uses it). Otherwise composables with module-private state (`const state = ref(...)` outside the exported `useXxx()`). Never `window.*` for application state.
- **I-04** Import paths: if the project defines an alias (e.g., `@/`), use it for own modules. No `../../../` deep imports.
- **I-05** Local storage always behind an **abstract store** (composable or utility function). Components do not call `localStorage.setItem` / `indexedDB.open` directly. The reason is to make future replacement with a cloud backend or a different persistence strategy possible without rewriting components.
  - **Dropping an object store / renaming keys / changing record format is forbidden without migration.** A slice that modifies the storage schema must implement at least a *forward migration* (existing data is read and reformatted); it must document in a code comment or PR whether a *reverse migration* is also reasonable; if no migration is possible (rare structural case), it must provide an *explicit reset* with blocking user confirmation.
- **I-06** Static paths always **relative to `base` URL** — use `import.meta.env.BASE_URL` to build public asset URLs. No absolute paths with `/foo` that break deploy in subpath (GitHub Pages typically serves from `/<repo-name>/`).
- **I-07** Schema of data persisted or exchanged externally (config JSON, user-importable JSON) **versioned** with an explicit field (e.g., `$schema_version: "1.0"`). A dedicated validation with errors/warnings clear in user language is the gate to data access in the app. Unknown fields must be **silently ignored** for forward compatibility.
  - **Input sanitization**: every textual value coming from user JSON, URLs, `postMessage` or other external channels that ends up in `innerHTML` / `v-html` / concatenated into HTML strings must pass through an escape function (e.g., `escapeHtml`). If the feature truly requires arbitrary HTML, use a declared sanitizer (DOMPurify or equivalent), never raw `v-html`. External URLs inserted by the user (e.g., `?viaggio=<url>` parameter) pass through `new URL()` with explicit protocol whitelist (typically `http:` / `https:` only).
- **I-08** PWA, if present: must **actually work**. A `<v-snackbar>` of "update available" with a flag never touched by the service worker is worse than not having a PWA — it hides the missing implementation behind the appearance of having one. Either the flag is driven by an SW event (typically via `virtual:pwa-register/vue` of `vite-plugin-pwa`), or the PWA must be removed from the project.
  - **Declared SW update policy**: the per-repo `CLAUDE.md` must explicitly declare how the app behaves when Workbox downloads a new SW. Typical options: silent `autoUpdate` (skipWaiting + automatic reload), `user-prompt` (the SW remains in waiting until the user clicks a toast), `periodic-check` (update polling). Without an explicit policy, users may stay stuck on an old version for weeks.
  - **Adding a new external resource (tile provider, photo CDN, API endpoint) to the PWA also requires updating `workbox.runtimeCaching` in `vite.config.js` / equivalent.** A resource without a caching pattern works online and **silently breaks offline** — a sneaky behavior discovered only when someone tries to use the app without network.
- **I-09** Baseline accessibility: **WCAG 2.1 AA** as objective. At minimum: skip link to `#main-content`, `aria-label` on controls without visible text, `aria-expanded` on toggleables, visible focus with contrast ≥3:1, color never the sole carrier of meaning. Light/dark theme CSS must pass contrasts in both modes.
- **I-10** Dates and numbers: format through a single passage point (`src/utils/formatters.js` or `src/composables/useFormatters.js`). No `new Date().toLocaleString()` scattered in templates.
- **I-11** Fetch toward external endpoints (tile servers, OSRM, third-party APIs): always with **explicit timeout** (e.g., `AbortController`), **graceful fallback** when the service does not respond, and **persistent application cache** when the data is reusable across offline sessions. A Workbox runtime cache is not sufficient: it has eviction and TTL decided by the SW, not by the app.
  - **Application cache duration**: data reusable offline (typically routing results, map tiles, slow API responses) has no TTL imposed by application code. Invalidation goes through an explicit user action (e.g., "Recompute" button) or a declared schema change. The "stale data" risk is accepted because compensated by offline reliability.
  - **Mandatory attribution**: many external providers (OpenStreetMap, CartoDB, OpenTopoMap, Mapbox) require visible attribution in the UI as a condition of their ToS. Verify before committing that attribution is present and **not accidentally removed** by CSS overrides, Leaflet's `attributionControl: false`, or similar. Hidden attribution is a license violation.
- **I-12** `npm run build` + any `npm run type-check` (if TS) + `npm run lint -- --fix` (if lint configured) **all green** before commit. The `type-check` clause applies only if `tsconfig.json` is present in the repo: for pure JS projects no exception needs to be declared. When TS is present, `tsconfig` with `strict: true` is the default; any relaxation must be declared in the per-repo `CLAUDE.md` with rationale.
- **I-13** **Performance budget** declared in the per-repo `CLAUDE.md`. Suggested defaults (overridable with rationale):
  - Initial JS bundle (main chunk): **≤ 150 KB gzip**.
  - Total CSS: **≤ 30 KB gzip**.
  - Lighthouse PWA score: **≥ 90** ("PWA" category if PWA is active).
  - Exceeding the defaults requires a dedicated `perf` slice, or a justified override in the per-repo `CLAUDE.md` (e.g., *"bundle budget: 200 KB gzip due to Leaflet + idb + 5 tile providers"*). Without a budget, performance regressions don't trigger in `risk classification`.
- **I-14** **External links**: every `<a target="_blank">` element requires `rel="noopener"` to close the tabnabbing vector (the new tab can no longer manipulate `window.opener`). `noreferrer` is optional: it strips `document.referrer`, useful if integration with third-party analytics is undesired, but may break functionality tied to origin tracking.
- **I-15** **Export/import of local user data**: if the app stores in local storage data of value to the user (personal notes, states, imported trips, non-trivial configurations), it must provide an **export** feature (download a JSON backup) and **import** (load a previous backup) accessible from the UI. Rationale: IndexedDB / localStorage are clearable by the browser, by the OS, by PWA reinstall — without export the user loses everything irretrievably. The export is not required to be granular (single record): a complete dump suffices.

---

## Branch & Promotion Model

- `main` → production (automatic deploy via CI, typically GitHub Pages)
- `develop` → integration (where slices arrive, and where the dev tests before promotion)
- `ai/{slice-type}/{desc}` → slice in progress, from `develop`

```
ai/{slice-type}/{desc} → develop → main (manual promotion via PR or merge)
```

On `solo` / `mvp` scale, the `ai/` prefix can be skipped for small reversible slices; the commit still goes on `develop`, not on `main`.

**Docs-only exception** — changes touching *exclusively* `*.md`, `docs/**`, `CLAUDE*.md`, `.gitignore` with pattern-only additions, code comments, may go directly on the promotion target (`main`) skipping the `ai/* → develop → main` flow. The exception **does not** cover `package.json`, `vite.config.*`, `tsconfig*.json`, `.github/workflows/*`, `.env.example`, runtime-consumed i18n files.

**Rebase vs merge** — before opening a PR it's good practice to rebase the `ai/*` branch on the tip of the integration branch, to keep history linear. After the PR is open, no more rebase + force-push, otherwise review comments are invalidated.

---

## Incident Response

When deploy is broken, the production app doesn't start, or a platform (hosting, CDN, tile provider) behaves unexpectedly, three principles bind behavior:

### 1. Read official docs before speculating

Before proposing a change to hosting configuration flags (build command, env vars, redirect rules), open the provider's official docs or use a web search. A sentence like "weird — X happens even with flag Y disabled" without a docs citation is a stop signal, not an iteration signal.

### 2. Recovery before optimization

In incident mode the goal is **to return to the last known good state**, not to improve. Proposing an unvalidated optimization *during* an incident lengthens the incident. Optimizations are planned **outside** the incident, with an explicit rollback plan.

### 3. Verify before insisting when the user contradicts

The user sees their own screen; the AI does not. If the user reports that a file / log / UI state is missing and the AI's inference (from old logs or past context) says otherwise, **verify via a live command**, do not insist. Ask for a screenshot or fresh output of a command.

---

## Documentation Layout & Lifecycle

This is the **primary architectural decision** of this contract for documentation. The repo's `Docs/` folder is the single source of truth for project documentation. Git provides versioning, **not the reading interface** — the AI and the human read filesystem markdown files, not PR threads or external trackers.

### Documentation primary target: LLM, secondarily human

Documentation is structured to be efficiently consumable by an LLM agent (full-text searchable, predictable section structure, atomic units when possible). Human readability is a secondary goal, achieved through markdown formatting.

This priority ordering has practical consequences:
- Predictable section headers > prose narrative
- Status fields and IDs > descriptive paragraphs
- Lists and tables > flowing text
- Atomic single-purpose files > multi-topic catch-all files (when the lifecycle allows)

### Three ADR-style cassetti — atomic, immutable-once-sealed

The three folders below host **atomic** documents: one event = one file, sealed once its lifecycle ends. File naming: `YYYY-MM-DD-slug.md` (date the item was opened). Slug in Italian, kebab-case, max 4-5 words.

```
Docs/
├── decisions/        ← architectural / technical decisions (ADR-style)
├── requests/         ← client requests with full interlocution log
└── incidents/        ← production incidents and post-mortems
```

**`Docs/decisions/`** — Decisions taken by the team about how to build/configure something. Once accepted, immutable. Superseded only by a later decision file that explicitly references the predecessor.

Sezioni canoniche (italiano):
```
## Stato
[aperta | accettata | superata-da: <file>]

## Situazione
[contesto, vincoli, alternative considerate]

## Scelta
[la decisione presa, in modo dichiarativo]

## Conseguenze
[impatti positivi e negativi, vincoli che si introducono]
```

**`Docs/requests/`** — Client-originated requests with the full interlocution. The file is *active* (status updated as interlocution progresses) until the request is closed (implemented, rejected, or withdrawn).

Sezioni canoniche:
```
## Stato
[aperta | approvata | implementata | chiusa | respinta | superata-da: <file>]

## Richiesta
[testo originale del cliente, mail/messaggio, citazione letterale]

## Interlocuzione
[lista cronologica delle domande nostre + risposte cliente, con date]

## Decisione
[scope finale, stima, vincoli accettati]

## Implementazione
[link al branch/commit/PR, eventuali note di chiusura, link a doc tecnica nuova se prodotta]
```

**`Docs/incidents/`** — Production incidents and post-mortems. Sealed once the incident is closed and the lesson is documented.

Sezioni canoniche:
```
## Stato
[in-corso | risolto | chiuso]

## Sintomo
[cosa l'utente / il monitoraggio ha visto]

## Causa
[root cause con evidenze]

## Risoluzione
[fix applicato, comandi/passi]

## Lezione
[cosa si impara — patterns da evitare in futuro, doc da aggiornare]
```

### Soglia "file singolo vs cartella dedicata"

**Default: file singolo** dentro la cassetto.

Promuovi a cartella `Docs/<cassetto>/YYYY-MM-DD-slug/` con `README.md` indice + allegati solo se almeno **due** dei seguenti sono veri:
- Stima > 1 settimana di lavoro
- ≥ 3 interlocuzioni cliente formali previste
- ≥ 2 artefatti tecnici aggiuntivi (mockup, diagrammi, dati di esempio, allegati binari)
- Coinvolge ≥ 2 sotto-progetti del repo

Sotto la soglia: il file `.md` singolo è auto-sufficiente. **Mai** creare cartelle scheletro vuote o file scheletro con sezioni vuote in attesa di essere riempite.

### Live tech debt — `Docs/tech-debt.md` (single file)

Technical debt accumulates in fragments across the codebase. Inline `TODO(refactor):` / `TODO(perf):` / `FIXME:` markers are the **primary discovery mechanism for the human reading code** but are insufficient as a tracking system: they're easily lost in greps, hard to prioritize, hard to summarize.

A **single living file** `Docs/tech-debt.md` is the central registry. Single file (not a cassetto folder) because:
- Tech debt is a **catalog** that grows and shrinks, not a series of atomic events
- LLM agents consume it more efficiently as a single read (one ID lookup, full context)
- Items have shared lifecycle (opened → in-progress → closed), not independent ones
- Closed items are archived in-place under a fold, not deleted (history preserved)

Format (LLM-friendly):

```markdown
# Tech Debt

## Convention
- ID format: `TD-NNN` (zero-padded 3 digits)
- Status: `aperto` | `in-corso` | `chiuso` (closed entries kept under "Voci chiuse" section)
- Inline marker (optional): `TODO(td-001)` in code → matches the entry here

## Voci aperte

### TD-001 — <titolo breve>
- **Stato**: aperto
- **Priorità**: bassa | media | alta
- **File coinvolti**: `path/to/foo.ext`, `path/to/bar.ext`
- **Aperto il**: YYYY-MM-DD
- **Motivo**: ...
- **Approccio suggerito**: ...

(altre voci...)

## Voci chiuse

### TD-XYZ — <titolo>
- **Stato**: chiuso il YYYY-MM-DD
- **Risolto da**: branch/commit/PR
- **Note**: ...
```

When an entry transitions to `chiuso`, move it under "Voci chiuse" with a closure note. Don't delete — closed items are part of the project's debt history.

When the corresponding inline marker exists in code (e.g. `TODO(td-001):`), it must match the ID in this file. The marker is the in-code pointer; this file is the authoritative tracker. **In-code marker without entry here = bug**: open the entry.

### Doc viva (non ADR-style) — root of `Docs/`

Beyond the cassetti and `tech-debt.md`, `Docs/` hosts **living technical docs** that change over time as the codebase evolves:

- `README-*.md` — operational guides (deploy, import/export, alert system)
- `DEPLOY-*.md` — deploy procedures
- `TODO.md` — operational roadmap (long-term planned initiatives, distinct from tech-debt fragments)
- `CHANGELOG.md` — version history
- `HOWTO-*.md` — point-in-time tutorials

Naming: free-form descriptive Title-Case or kebab-case, no `YYYY-MM-DD-` prefix. These files are **edited in place** as the underlying behavior changes — git carries the history.

### Claude memory — internal vs external (project decision)

Claude Code's memory layer can live in **two places**:

- **External** (default): `~/.claude/projects/<project-hash>/memory/` — gitignored by definition (outside the repo), lives on the developer's machine.
- **Internal**: `Docs/claude-memory/` — committed to the repo, shared across machines/team members.

The choice is **per-project**, taken once and held consistently. Mixing the two (some memory files inside, some outside) is forbidden — it creates ambiguity about which is authoritative.

Per-repo `CLAUDE.md` declares which mode the project uses. If internal, `CLAUDE.md` instructs the AI to read `Docs/claude-memory/*.md` at session start. If external, the AI reads via the standard auto-memory mechanism.

### Anti-pattern da evitare

1. **Cartelle scheletro vuote** (`Docs/requests/2026-05-01-foo/{request,questions,answers,decision}.md` con file vuoti) — pure noise, harms LLM efficiency.
2. **`README.md` indice manuale aggiornato a mano** in ogni sottocartella — diventa stale rapidamente. Se serve un indice, lasciar fare a `git ls-files` o a uno script.
3. **Strutture > 2 livelli di profondità** sotto `Docs/` — `Docs/clients/zordan/requests/2026/05/...` è ingegnerizzazione preventiva.
4. **Mescolare doc viva e doc atomica** nella stessa cartella.
5. **Eliminare voci chiuse di tech-debt** invece di archiviarle in-place — perde la storia.
6. **Cassetti annidati** (`Docs/decisions/architettura/`, `Docs/requests/2026/`) — flat per definition.

### Legacy documentation — co-existence with pre-existing docs

This chapter does not impose retroactive migration of existing documentation. When a repo adopts this contract, the documentation already present stays where it is and operates in **permanent co-existence** with the new structure. The rules:

**A. Definition of "legacy"** — Everything in `Docs/` (or equivalent) **at the date this chapter is adopted in the per-repo `CLAUDE.md`**. That date must be explicitly declared in the per-repo `CLAUDE.md` as `Data adozione Documentation Layout: YYYY-MM-DD`. Without an explicit adoption date, legacy and new are indistinguishable.

**B. Physical position** — Legacy docs stay where they are. They are not moved into `Docs/legacy/` or elsewhere. Moving them breaks internal links from code/commit messages, bookmarks, external references — high cost, zero benefit.

**C. Distinction by position** — Anything inside `Docs/decisions/`, `Docs/requests/`, `Docs/incidents/`, and `Docs/tech-debt.md` follows the new structure. Anything outside these cassetti is legacy *or* a stack-specific living doc (architecture, runbook, glossaries) that does not fit the three cassetti — they co-exist.

**D. Conversion is optional** — Conversion from legacy to the new format is **not mandatory**. It happens ONLY when, during an update to a legacy doc, a new decision/incident/request emerges that deserves to live in a cassetto. In that case:
- create the ADR-style file in the cassetto,
- leave the legacy where it is, optionally with a cross-reference (`> See Docs/decisions/2026-MM-DD-X.md for the current decision`),
- the legacy remains as historical memory / pre-decision snapshot.

An overly rigid rule ("every time you touch X, you must redo it as ADR") leads to workarounds. Optional is better.

**E. Legacy docs that WOULD be a cassetto** — If a legacy doc retroactively contains a decision/incident/request that today would live in a cassetto: **do not touch it**. It stays where it is. The lesson, if still relevant, may be registered as a new file in the cassetto with a back-reference to the legacy — but at the maintainer's discretion, never as a retroactive obligation.

**F. "Legacy documentation" section in the per-repo `CLAUDE.md`** — The per-repo `CLAUDE.md` lists legacy files/folders with a one-line summary each. Without this list, legacy docs become invisible to anyone landing on the repo. It is updated when a legacy doc is replaced or summarized in a cassetto. If there is no legacy doc, state so explicitly.

**G. Co-existence over time** — On mature projects, legacy docs may remain for years. **OK**. No obligation to migrate everything. The system works in permanent co-existence.

---

## Code documentation standard

In this family, **every code artifact carries a header comment** — explicit override of the "no comments by default" rule from Claude Code's global instructions. Opening any file cold must immediately tell the reader (human or AI) **what it is** and **what it does**, without having to read the code.

**Mandatory header on**:
- **Files** (`.vue` / `.ts` / `.js` / `.liquid` / `.cs` / `.rs` / equivalent): top-of-file block.
- **Exported functions / composables / classes / methods**: short JSDoc-style description.
- **Components** (Vue SFC / Liquid section / Razor component / etc.): purpose + key inputs.

**Content — 2-5 lines, concise**:
1. *What this is* — one phrase identifying role ("Composable for X", "Page for `/post/[slug]`", "Liquid section for the homepage hero", "Service for token validation").
2. *What it does* — one phrase summarizing responsibility.
3. *(Optional)* Non-obvious constraints, dependencies, or contracts ("requires sanity-image plugin", "consumed by `/post/[slug].vue`", "client-only by design", "throws if `id` is null").

**Still in force**: inline comments within function bodies follow the default global rule — write none unless the *WHY* is non-obvious (hidden constraint, workaround, subtle invariant). Headers are file/function-level documentation, not inline narration.

**Why this override**: opening any file should immediately answer "what am I looking at?" and "what does this do?" without reading the code. With multiple devs and AI agents touching a multi-project codebase, the lookup-on-open is high frequency; a 2-line header saves 20 seconds × hundreds of opens × multiple readers. The default "no comments" rule existed to prevent narrating obvious code line-by-line — that purpose is unaffected.

---

## Knowledge Layers

| Layer | File | Scope | Change velocity |
|---|---|---|---|
| Family contract | `CLAUDE-vue-app.md` (this file) | Cross-repo standalone Vue app | Rare — months between revisions |
| Per-repo contract | `CLAUDE.md` at repo root | This single project: exceptions, hosting choices, deviations | Per sprint / per relevant decision |
| Dynamic per-repo memory | `MEMORY.md` + topic files under `~/.claude/projects/<hash>/memory/` | Single project, single dev, single machine | Continuous — after every session |

**Promotion rule**: a pattern observed in **≥2 repos** of the same family is a candidate to be promoted from per-repo `CLAUDE.md` to `CLAUDE-vue-app.md`.

**Demotion rule**: a rule in `CLAUDE-vue-app.md` that turns out to be variable per project must be demoted to per-repo `CLAUDE.md`, and replaced here with a more general principle.

**What NOT to put in memory**: state reconstructible from the codebase (`git log`, file reads, `git status`). Memory is for **lessons learned**, not state snapshots. Don't duplicate the contract in memory.

---

## Per-repo CLAUDE.md — minimum viable sections

When scaffolding a new repo of this family, the root `CLAUDE.md` should contain at minimum:

### Mandatory

1. **Intro** — one paragraph on the app's purpose, in the project's working language.
2. **Alignment with family contract** — the per-repo `CLAUDE.md` declares the `Data ultima sincronizzazione` with `CLAUDE-vue-app.md`. Alignment happens through explicit sync sessions (guided brainstorming between user and AI, never automation): repos remain valid on their version until the next sync.
3. **Project language** — declare the three operational languages:
   - *identifiers* (variables, functions, classes, files): English universally, or project language if the user prefers (e.g., `useViaggio` vs `useTrip`);
   - *user UI* (texts shown on screen, labels, validation error messages): language of the recipients;
   - *comments / logs* (developer audience): usually matches the project language.
   If not declared, the default is: **identifiers and comments in English**, **UI in the declared product language**.
4. **Repo & ecosystem** — repo URL, local path, position in any multi-repo ecosystem.
5. **Stack** — runtime and framework versions actually locked in `package.json`. They go here because versions drift quickly.
6. **Declared scale** — `solo` / `mvp` / `small-team` / `porting`.
7. **Local storage** — what lives in `localStorage` / `IndexedDB` / URL / etc., with key conventions.
8. **Performance budget** — actual values in use (gzip bundle, gzip CSS, Lighthouse target), with explicit rationale for any override of I-13 defaults.
9. **SW update policy** (if PWA active) — `autoUpdate`, `user-prompt`, `periodic-check`, or other; with any details (e.g., "Update now" toast).
10. **Exceptions to family contract** — every deviation from I-01..I-15 with rationale. If none, state so explicitly.
11. **Do-not list** — repo-specific footguns, **not** duplicates of the *Forbidden* section of the generic contract.
12. **Documentation Layout adoption date** — date this repo adopted the *Documentation Layout & Lifecycle* chapter (`Data adozione Documentation Layout: YYYY-MM-DD`). Everything in `Docs/` before this date is legacy documentation per that chapter.
13. **Legacy documentation** — list of legacy files/folders in `Docs/` (or equivalent) pre-existing the chapter adoption, with a one-line summary each. If there is no legacy doc, state so explicitly.

### Recommended

14. **Hosting** — where it deploys, what configurations exist on the provider, link to any `docs/DEPLOY.md`.
15. **Conventions** — path aliases, specific naming conventions, logging.
16. **Main flow** — the mental map of what the app does end-to-end, in one page.
17. **Tests** — what is tested automatically vs manually, and why.

### What does NOT belong in per-repo `CLAUDE.md`

- Restatements of invariants I-01..I-15.
- Generic Vue / Pinia / Vite patterns (they live in stack skills or official docs).
- Current session state (that's SessionStart hook territory or memory).
- Accumulated lessons (memory).

### Minimum viable skeleton

```markdown
# Claude Code — <App Name>

<one paragraph on what it does>

## Repo & ecosystem
...

## Stack
## Scale
## Local storage
## Exceptions to family contract
## Do-not list

> Sections not listed here follow the family contract in `CLAUDE-vue-app.md`.
```

If a section would be empty, declare it ("no deviation from family contract") rather than omitting it. Section absence is ambiguous; an empty section is unequivocal.

---

## Glossary

| Term | Meaning in this family |
|---|---|
| Slice | Atomic unit of work |
| Task | Structured description of a slice |
| View | `.vue` file mapped to a route, under `src/views/` |
| Component | Reusable `.vue` file, under `src/components/` |
| Composable | TS/JS function with reactive state, under `src/composables/` |
| Abstract store | Persistence wrapper (composable or utility) that hides `localStorage` / `IndexedDB` from components, to make persistence replaceable |
| Scale | Project complexity/criticality tier (`solo`, `mvp`, `small-team`, `porting`) |
| AI-led slice | Slice in which Claude has touched code substantially; branch prefix `ai/` |

---

## Revision history

Only non-trivial revisions are recorded here.

- **2026-05-12** (rev 8) — Added the cross-family chapter `Code documentation standard` after *Documentation Layout & Lifecycle*. Mandatory header comments on files, exported functions, and components — explicit override of the Claude Code global "no comments by default" rule for this family (file/function-level documentation, not inline narration). Propagated in one direct-modification session to all 9 master contracts and all 9 consumer copies. Snapshot pre-modification in `storico/2026-05-12-direct-code-doc-standard/`.
- **2026-05-08** (rev 7) — Translated the contract from Italian to English for consistency with the other family contracts (5/8 already in English including the family root `CLAUDE-dotnet-vue-legacy.md`) and to gain ~25–40% token efficiency on every context load. The canonical sections of ADR/request/incident/tech-debt templates inside *Documentation Layout & Lifecycle* remain in Italian (they describe the doc files which are written in Italian unless the per-repo `CLAUDE.md` declares otherwise). H3 headers inside that chapter (`### Anti-pattern da evitare`, `### Doc viva (non ADR-style) — root of Docs/`, `### Soglia "file singolo vs cartella dedicata"`) also remain in Italian, matching the precedent set by the other 5 English contracts. No semantic change to any rule.
- **2026-05-07** (rev 6) — Removed the contract's semver versioning system in favor of the "Data ultimo aggiornamento" convention (alignment with `_master-contracts/CLAUDE.md` §4). The header no longer declares `Versione contratto: vX.Y.Z`. The mandatory point "Versione contratto di famiglia" of the per-repo `CLAUDE.md` minimum sections has been rewritten as "Allineamento col contratto di famiglia" in terms of `Data ultima sincronizzazione`. Past historical entries retain `(rev N)` as atomic identifier, only `= vX.Y.Z` removed. Change applied as direct modification not from sync (`_master-contracts/CLAUDE.md` §9.3).
- **2026-04-24** (rev 5) — Fix of the syntax to activate GitHub Copilot's automatic review: the correct string is `@copilot review`, **not** `@copilot esegui revisione`. Applied in 3 points of the contract (Step 5 Phase 4, Step 4.5 ↔ Step 5 relation note, revision history). No semantic change.
- **2026-04-24** (rev 4) — Consolidated update derived from constructive criticism of rev 1. Explicit semver versioning of the contract (declared in header, every per-repo `CLAUDE.md` must declare the version it conforms to). New invariants added: I-13 performance budget with override-able defaults, I-14 external links with `rel="noopener"`, I-15 export/import of local user data. Expanded invariants: I-05 (mandatory storage migrations, reverse or reset), I-07 (user input sanitization + URL protocol whitelist), I-08 (declared SW update policy + new external resource requires SW runtime caching), I-11 (indefinite cache duration + mandatory attribution), I-12 (TS only if `tsconfig.json` present). Per-repo `CLAUDE.md` minimum sections extended: contract version, project language, performance budget, SW policy. Docs-only exception now includes `package.json` metadata. New prohibition: regenerating lockfiles by hand. Phase 4 Steps 1-3 made harness-agnostic. Clarified that Step 4.5 remains a mandatory gate even with `@copilot review` (rev 3). Repos conformant to rev 1 must add to their `CLAUDE.md` the sections "Contract version" (later renamed, see rev 6), "Project language", "Performance budget", "SW policy"; no other breaking changes.
- **2026-04-24** (rev 3) — Added at Phase 4 Step 5: every commit destined to become a PR must include `@copilot review` in the message, to activate GitHub Copilot's automatic review as a second pass complementary to Step 4.5 self-review.
- **2026-04-24** (rev 2) — Added Step 4.5 "Self-review as PR review" in workflow Phase 4. Pre-commit blocking gate: read the full diff as if we were the human reviewer (semantics, edge case, security, consistency, dead code, documentation, numbering). If self-review finds a non-trivial problem, do not close the slice. First trigger: slices closed without realigning TODO.md / CHANGELOG, generating inconsistencies that the user had to flag manually.
- **2026-04-24** (rev 1) — Initial derivation from `CLAUDE-dotnet-vue-apps.md` (Skoda) rev 1. Removed backend sections (Dapper, EF, JWT, SQL, publish profiles, Vuetify). Rewrote invariants as `I-01..I-15`: frontend-only Vue 3 + Vite + optional Pinia, local storage behind abstraction, versioned JSON schema, real PWA or absent, paths relative to `base`, external fetches with timeout + application cache, WCAG 2.1 AA. `solo` admitted as default scale with explicit relaxations on branch model and automated tests. Docs-only exception extended to `CLAUDE*.md`. First application on the **Roadbook** project.
