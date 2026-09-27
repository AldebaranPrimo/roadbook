# AI Execution Contract — Vue 3 standalone app (no backend)

> **Data ultimo aggiornamento**: 2026-09-27 (rev 2026-09-27 — trimmed: drawer templates and rules left to the skills that emit them, per-repo required sections moved to the `master-sync` skill, revision history left to the registry; drawer files through the skill `nuovo-file-cassetto`, completion gate and two-axis self-review through `chiusura-slice`. Gradual adherence for existing repos. History: `_master-contracts/STATO-CONTRATTI.md` §7, `CHANGELOG.md`.)
> **Data ultima sincronizzazione**: 2026-09-27 (sync2, propagazione generale; snapshot `storico/2026-09-27-sync2/`).
>
> Derived 2026-04-24 from `CLAUDE-dotnet-vue-apps.md` as a relaxed contract for self-contained Vue 3 apps deployed as static sites. Consumer: Roadbook.

Runtime execution policy for projects that are a **pure Vue 3 frontend** (`<script setup>`, Composition API) with no backend of their own, a **static build** (Vite, `dist/` servable from any CDN: GitHub Pages, Netlify, Cloudflare Pages, Vercel), **local storage** (`localStorage`, `IndexedDB`, `sessionStorage`) and read-only external services (tile servers, public APIs), by a single developer or a small team. Out of scope: SSR apps, frontends coupled to an in-repo backend, marketing sites, native mobile.

This file is loaded after the user-global rules (conduct, git, language, safety, incidents: never repeated here) and before the per-repo `CLAUDE.md` (actual versions, declared scale, storage keys, performance budget, service-worker policy, current git policy, exceptions to the invariants below).

An existing repo adapts to this contract on its own schedule: deviations recorded in the per-repo `CLAUDE.md` (an override, or an *adeguamento in corso* with a `docs/tech-debt.md` entry) are known and decided — follow the per-repo, never raise them again, report only a new deviation, once.

---

## Project scale

`solo` (default: single developer, personal or small audience), `mvp` (before the stable public release), `small-team` (2-4 developers, external users: review and branch protection on), `porting` (Vue 2 → 3, Options → Composition).

Relaxable in `solo` / `mvp` / `porting`: automated Vitest or Playwright tests become recommended (a documented manual check or an ad-hoc Playwright screenshot is an acceptable substitute), a separate staging environment is not required (`npm run preview` is the test bench). The git flow itself follows the global default with the per-repo override, never this table.

Strict at every scale: all invariants I-01..I-15; `npm run type-check` (when `tsconfig.json` exists) and `npm run build` green before every commit; no secrets committed, `.env*` never in the repo; no new runtime dependency without a declared reason; no change to `base`, `publicPath` or deploy paths outside a dedicated slice.

---

## Slices and file scope

A slice is vertically complete, independently testable, minimal, releasable and rollback-ready (new component, composable, view or route, utility, settings section, single-file refactor, point bug fix, adaptation to a new dependency version). A slice never mixes features with drive-by refactors, bug fixes with cosmetic changes, or dependency updates with application logic: split and commit in sequence.

The AI modifies only the files the task lists plus those strictly needed to keep build and type-check green. Never, outside a dedicated slice: refactor untouched components; change path aliases, `tsconfig` or `vite.config`; add a dependency; bump a major framework version; touch deploy configuration (`base`, `.github/workflows/*`, PWA `manifest`).

Debt seen outside scope is recorded, not fixed: inline `// TODO(<tag>): <reason>` with tags `refactor`, `perf`, `a11y`, `i-NN` (invariant violation), or `FIXME:`; cross-file debt goes to `docs/tech-debt.md`.

---

## Execution workflow

**Intake.** The task states Context, Goal, Files, Constraints, Acceptance; ask for what is missing on business-observable semantics (data schema, visible behavior, formats), otherwise make the routine call and say so. Declare a risk class:

- `risk:low` — label swap, cosmetic tweak, isolated new component, dev script, comment.
- `risk:medium` — new view or route, composable, utility with manual test, in-version storage schema change with declared migration.
- `risk:high` — deploy `base` change, breaking change to the local storage format, heavy runtime dependency (> 100 KB gzip), service-worker change with forced cache invalidation.
- `risk:critical` — removal of an IndexedDB store without migration, breaking change to the import/export interface, deploy domain change.

**Branch.** One slice = one branch `ai/<slice-type>/<slug>` from the integration branch (`develop` if it exists, else `main`), before touching any file. A documentation-only change follows the global docs-only exception and the per-repo git policy: it goes on the integration branch directly, no branch unless one of them asks for it. Slice types: `component`, `view`, `composable`, `utility`, `store`, `fix`, `perf`, `refactor`, `a11y`, `style`, `config`, `docs`, `ci`, `deps`. The `ai/` prefix marks every branch the AI works on substantially; human-only branches use free prefixes.

**Implementation.** For a less-known library or an API that changed across majors, read the official docs or a live-docs MCP (`context7`) instead of memory. More than three files to touch: sketch the plan in a sentence or two first.

**Completion gate**, before commit, through the skill `chiusura-slice` (gate, then self-review on the Standard and Specifica axes): `npm run type-check` (if TS), `npm run lint -- --fix` (if configured), `npm run build`; tests added by the slice; a manual smoke test on `npm run preview` for UI-visible slices at `risk:high` or above. Stack review points for the Standard axis: every external input escaped before `innerHTML`, URL or storage; every `fetch` with timeout and error handling; no forgotten `console.log`. Commit, push and PR follow the global default and the per-repo git policy.

---

## Branch model

`main` = production (automatic deploy via CI, typically GitHub Pages); `develop` = integration; `ai/<slice-type>/<slug>` = slice in progress from `develop`. Rebase the slice branch onto the integration tip before opening the PR; after the PR is open, no rebase and force-push. `develop` → `main` by PR or merge at promotion.

---

## Forbidden without explicit authorization

- Committing secrets (API keys, tokens, credentials, private keys); `.env*` never in the repo.
- Adding a runtime dependency without a dedicated task (`devDependencies` only when the build or test flow needs them).
- Bumping major versions of Vue, Vite or TypeScript outside a `deps` slice.
- Touching `base`, `publicPath` or `.github/workflows/*.yml` outside a `ci` or `config` slice; touching the PWA `manifest` or Workbox runtime caching outside a PWA slice.
- `--force` on `main` or shared branches (`--force-with-lease` only on personal branches); `--no-verify` to skip a failing hook.
- Deleting or regenerating `package-lock.json` (or yarn/pnpm lockfiles) by hand: lockfile conflicts are resolved with `npm install` from the correct `package.json`.
- Bypassing the abstract store (`useStorage`, `useSettings`) with direct `localStorage` / `IndexedDB` access.
- `eval`, `new Function` or template injection with external input; user-loaded JSON is validated against the declared schema first.

---

## Stack invariants

- **I-01** Composition API with `<script setup>` (`lang="ts"` when the project is TS); Options API only in files not yet migrated.
- **I-02** No `this.$xxx` in new files: `useStore()`/Pinia, `useRouter()`/`useRoute()`, `ref()` for refs, `nextTick()`.
- **I-03** Shared state in Pinia if the project uses it, otherwise composables with module-private state; never `window.*`.
- **I-04** Use the project alias (`@/`) for own modules; no deep `../../../` imports.
- **I-05** Local storage always behind an abstract store (composable or utility); components never call `localStorage.setItem` or `indexedDB.open`. Dropping a store, renaming keys or changing the record format requires at least a forward migration, and the slice states in a code comment or in the PR whether a reverse migration is reasonable or unavailable (a rollback of the bundle may then leave the app unable to read the converted data); if no migration is possible, an explicit reset with blocking user confirmation.
- **I-06** Public asset paths built from `import.meta.env.BASE_URL`, never absolute `/foo` (GitHub Pages serves from `/<repo>/`).
- **I-07** Persisted or exchanged data schemas carry an explicit version field (`$schema_version`); validation with clear user-language errors gates access; unknown fields are ignored for forward compatibility. Every external text that reaches `innerHTML`, `v-html` or HTML strings goes through `escapeHtml`; arbitrary HTML only through a declared sanitizer (DOMPurify); user-provided URLs go through `new URL()` with an `http:`/`https:` whitelist.
- **I-08** A PWA either works (update flag driven by a real service-worker event via `virtual:pwa-register/vue`) or is removed. The per-repo declares the update policy (`autoUpdate`, `user-prompt`, `periodic-check`). A new external resource (tile provider, CDN, API) also gets a `workbox.runtimeCaching` entry, or it works online and silently breaks offline.
- **I-09** WCAG 2.1 AA: skip link to `#main-content`, `aria-label` on controls without text, `aria-expanded` on toggleables, visible focus ≥ 3:1, color never the sole carrier of meaning, contrasts checked in both light and dark theme.
- **I-10** Dates and numbers formatted through one module (`src/utils/formatters` or `useFormatters`); no scattered `toLocaleString()` in templates.
- **I-11** External fetches (tiles, routing, third-party APIs) with an explicit timeout (`AbortController`), graceful fallback and a persistent application cache for data reused offline (a Workbox runtime cache is not enough: its eviction is the service worker's, not the app's); application cache invalidated by explicit user action or schema change, not by TTL. Provider attribution (OpenStreetMap, CartoDB, OpenTopoMap, Mapbox) visible in the UI and never hidden by CSS or `attributionControl: false`.
- **I-12** `npm run build`, `npm run type-check` (if TS) and `npm run lint -- --fix` (if configured) green before every commit; `strict: true` when TS, relaxations declared in the per-repo.
- **I-13** Performance budget declared in the per-repo; defaults: main JS chunk ≤ 150 KB gzip, CSS ≤ 30 KB gzip, Lighthouse PWA ≥ 90. Exceeding it needs a `perf` slice or a justified override.
- **I-14** Every `<a target="_blank">` carries `rel="noopener"`; `noreferrer` optional.
- **I-15** If the app stores data of value to the user locally, it offers export (JSON backup download) and import from the UI: browsers, OS and PWA reinstalls can wipe local storage.

---

## Documentation layout

Drawers `docs/decisions|requests|incidents|reviews/`, one event = one file, created only through the skill `nuovo-file-cassetto` (it holds templates, frontmatter and drawer rules); `docs/tech-debt.md` as the single debt registry (`TD-NNN`, deferred decisions `TD-D-NNN` with a reopening trigger, closed entries kept, inline `TODO(td-nnn)` matching an entry); living docs at the root of `docs/` (`TODO.md`, `DEPLOY.md`, `HOWTO-*.md`) edited in place; `README.md` + `CHANGELOG.md` at repo root; `HANDOFF.md` for session state (global skills `recupera-memoria` / `salva-memoria`). Legacy docs present at the adoption date stay where they are, listed in the per-repo. No empty skeleton folders, no hand-kept index README except `docs/reviews/README.md`, no nested drawers, no more than two levels under `docs/`.

When a file is born: a decision in the turn it is taken; a client or stakeholder request when it does not close in the same turn; an incident for every anomaly with impact; a debt entry for every conscious deferral. A substantial plan (≥ 2 of: estimate above 8 hours of active Claude time, per the global skill `stima-tempi-sviluppo` (Marco sets the final figure), ≥ 3 formal exchanges, ≥ 2 extra technical artifacts, ≥ 2 sub-projects) promotes the ADR or request to a folder with `README.md` and `<slug>-piano.md`, approved by the user before implementation.

Issue tracker, when a platform CLI is authenticated (`gh` here): one drawer file = one issue, mandatory for requests and incidents, optional for tech debt and decisions; cross-links both ways; branch names and commits carry the id (`(#42)`); the code-change issue carries the slice's `risk:<level>`.

Reviews by an external AI (Codex, thread rules in the skill `nuovo-file-cassetto`): the SessionStart briefing lists the open ones, read and answer them before other work; Claude fills Risposta in place, moves `stato` to `risposta`, fixes only inside the slice's file scope and updates `docs/reviews/README.md`; only the user closes.

---

## Code documentation

Global rule *Codice — commentare sempre* applies. Stack form: every `.vue`, `.ts`/`.js` module and composable opens with a header stating role, key props or inputs and store/composable dependencies; exported functions carry a short JSDoc description.

---

## Glossary

View: `.vue` mapped to a route under `src/views/`; Component: reusable `.vue` under `src/components/`; Composable: function with reactive state under `src/composables/`; Abstract store: the persistence wrapper that hides `localStorage`/`IndexedDB` from components.

---

## Required tooling

Node.js 20+ with npm; Vue 3, Vite and optionally Pinia as project dependencies (no global installs); Playwright for smoke tests; a static hosting target. Base tooling and the platform CLI rule are in `CLAUDE-meta.md`.
