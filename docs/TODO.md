# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## Alta priorità — prossime slice

### 1. Precaricamento offline totale al primo import

**Analisi completata**: vedere [`analisi/prefetch-offline.md`](analisi/prefetch-offline.md). Verdetto SEMPLICE, 4 file toccati, ~198 righe, 0 nuove dipendenze.

**Scope implementativo** (`risk:medium`):
- Nuova utility `src/utils/prefetch-offline.js` che espone `avviaPrefetch(viaggio, providerId)`, `annulla()`, `statoPrefetch` reattivo
- Sezione "Uso offline" in `ModalInfo.vue` con bottone "Prepara per uso offline" + progresso (tile / foto / routing)
- Wiring in `App.vue`
- Nuovo pattern `runtimeCaching` in `vite.config.js` per le foto dei punti

Raccomandazioni dall'analisi: zoom default 12, zoom 13 solo su conferma esplicita dell'utente con spiegazione della policy OSM; bbox calcolata per area (non globale); UI annullabile.

### 2. Gestione utenti con login social

**Obiettivo**: permettere a ciascun utente di avere una lista **privata e personale** di percorsi, sincronizzata tra i suoi dispositivi (camper, telefono, desktop).

**Approccio proposto** (da discutere quando prenderemo il task):
- **Provider di identità**: login social leggero. Candidati: Google, Apple, GitHub.
- **Backend**: Firebase (Auth + Firestore, zero backend proprio) vs Supabase (Postgres + Auth) vs Clerk. Firebase è l'opzione più rapida.
- **Modello dati**:
  - utente anonimo → tutto resta in IndexedDB locale, come oggi. Zero regressioni.
  - utente loggato → i viaggi, visitati, note, routing, preferenze vengono sincronizzati tra device. Lo **store astratto** `src/utils/store-viaggi.js` è già predisposto: va sostituito/affiancato da una versione cloud-aware.
- **Conflitti di sync**: last-write-wins su timestamp. Nessun merge semantico.
- **Privacy**: viaggi privati per default. Condivisione esplicita solo via link firmato (v2.x, non in questo task).

**Scope v1**:
- Bottone "Accedi" nell'header
- Sync trasparente dei dati al login; al logout restano in cache locale i dati già presenti
- Indicatore di sync

**Rischio**: `risk:high`. Andrà spezzata in più sub-slice (scelta provider → integrazione Auth → refactor store → UI login → sync effettivo → test).

**Nota architetturale**: lo schema v1.1 con annotazioni embedded (già mergiato) è un prerequisito naturale per il sync cloud — il formato di serializzazione di note + visitati è lo stesso.

---

## Media priorità

### 3. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 4. Filtri per categoria e tag

Dalla v2 delle specifiche iniziali. In header o in un drawer laterale: checkbox per categoria (attive di default), filtro per tag. Il filtro si applica sia alla lista sia ai marker della mappa.

### 5. Ricerca testuale nei punti

Campo di ricerca che filtra in tempo reale nome/descrizione/tag dei punti. Tollerante a varianti diacritiche (è/e).

### 6. Galleria foto a tutto schermo

Per i punti che hanno `foto: [...]` nel JSON: click su thumbnail → lightbox con swipe, zoom, download.

---

## Bassa priorità / nice-to-have

### 7. Pulsante "naviga al prossimo non visitato"

Bottone che apre il prossimo punto non marcato come visitato nell'area corrente, centrando la mappa e aprendo il popup.

### 8. Condivisione punto come URL profondo

`?viaggio=<id>&area=<id>&punto=<n>` → apre l'app focalizzata su quel punto. Utile per condividere un luogo specifico via WhatsApp/email senza dover descrivere dove cercarlo.

### 9. Estensioni schema JSON (v1.2+)

Già previste come campi opzionali, da implementare quando emergono esigenze:
- `giorni`: array opzionale per viaggi suddivisi in giornate (alternativa a `aree`)
- `gpx_url`: traccia GPX sovrapposta al percorso
- `bookings`: collegamenti a prenotazioni hotel/ristoranti
- `meteo_link`: URL al forecast per il luogo/data

---

## Debito tecnico

- **Test Vitest** per le utility pure (`valida-schema`, `routing-osrm` decoder, `mappe-esterne`). Non blocca nulla ora, ma crescerà di utilità man mano che le utility si complicano.
- **Audit WCAG 2.1 AA**: skip link → `#main-content` (mancante), `aria-expanded` sul modal, controllo contrasti in tutti e 5 i provider tile + tema scuro, navigazione tastiera completa.
- **ESLint + Prettier** configurati. Al momento non c'è lint step — un semplice `eslint-config` Vue 3 con regole blande coprirebbe già i casi critici (unused imports, var drift).
- **TypeScript**: eventuale migrazione JS → TS. Scope contenuto (~15 file), beneficio concreto su `store-viaggi.js` e `valida-schema.js` che oggi ricostruiscono tipi "a mano" nei commenti. Da valutare quando la codebase cresce.
- **Hook Claude Code** (`.claude/settings.json`): PostToolUse per auto-build su edit + SessionStart briefing. Utile soprattutto quando la codebase cresce o passiamo a `piccolo-team`.

---

## Completati di recente

Rimossi da questo elenco e spostati su [`CHANGELOG.md`](CHANGELOG.md) — di solito nella sezione `[Unreleased]` finché non si promuove a `main`.

Al 2026-04-24 sono state completate:

- ✅ Selettore stile mappa in-app con 5 provider + default OSM leggibile
- ✅ Geolocalizzazione "tu sei qui" sulla mappa
- ✅ Export/import viaggio con note e stato "visitato" embedded nello schema v1.1
- ✅ Analisi di fattibilità del prefetch offline con verdetto (il prefetch implementativo resta in alta priorità come voce #1)
- ✅ Numero di versione visibile nell'app + auto-update PWA con toast "Aggiorna ora"
- ✅ Alleggerimento `docs/SPECIFICHE-APP.md` a documento storico del giorno zero (schema rimosso, disclaimer in testa)
- ✅ Help sostanzioso nella modal import + schema JSON vivente accessibile via URL statica (`public/schema/viaggio-1.1.md`) pensata per essere passata a un LLM
- ✅ Bottone GitHub nell'header dell'app con deep link al repo
- ✅ Fix sanitizzazione emoji delle categorie nel popup marker (chiusa una minuscola potenziale XSS se un JSON maligno avesse iniettato HTML in `categorie.<k>.icona_emoji`)
- ✅ Regola "Self-review come PR review" nel contratto `CLAUDE-vue-app.md` (Step 4.5, gate bloccante pre-commit)
