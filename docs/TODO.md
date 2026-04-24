# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## 🐛 Bug — da correggere asap

### B-1. Header mobile: pulsanti troppo alti, titolo viaggio troncato

**Screenshot**: [`bug-header.png`](bug-header.png) — cattura da mobile con viewport stretto.

**Sintomo**: in mobile i 4 pulsanti "globali" dell'header (`⇄` cambio viaggio, `◐ Auto` tema, `+` carica viaggio, `ⓘ` info viaggio) hanno altezza maggiore del pulsante GitHub (l'unico "corretto" come altezza). La sproporzione delle righe causa due problemi:

1. Il titolo del viaggio risulta **troncato aggressivamente** (es. *"Friuli + Slov…"* invece di *"Friuli + Slovenia in camper"*) insieme al sottotitolo (*"Ponte del 25-26 …"* invece di *"Ponte del 25-26 aprile 2026 · Camper + cane"*).
2. L'importanza relativa è invertita: il titolo viaggio dovrebbe essere la cosa più visibile, non i bottoni.

**Fase 1 — fix immediato** (`risk:low`, slice `ai/fix/header-altezza-bottoni`):

- Uniformare l'altezza di tutti i `.btn-ghost` al riferimento del pulsante GitHub (padding + `height` fisso + `display: inline-flex; align-items: center; justify-content: center;`). Il link `<a class="btn-ghost">` con SVG 14×14 è la misura da rispettare; i `<button>` con caratteri Unicode (`⇄`, `◐`, `+`, `ⓘ`) oggi crescono più in alto per via del `line-height` del font.
- **Spostare il pulsante `ⓘ` "Info viaggio"** fuori dal gruppo pulsanti globali e sotto il titolo del viaggio (accanto a titolo/sottotitolo). Razionale: l'info è **contestuale al viaggio corrente**, gli altri pulsanti sono globali (cambio viaggio, tema, carica nuovo, GitHub). Separare visivamente le due classi di azione aiuta il riconoscimento.
- Il pulsante `⇄` "Cambia viaggio" resta tra i globali (è l'azione "torna alla lista viaggi", non "info sul viaggio corrente").

File toccati: `src/components/HeaderApp.vue` + CSS associato. Scope chirurgico, nessun impatto su logica o altri componenti.

**Fase 2 — da valutare dopo** (non parte del fix asap):

L'utente ha notato che anche dopo il fix fase 1, il gruppo di pulsanti globali può restare affollato (`⇄` cambio + `◐ Auto` tema + `+` carica + `GitHub`), e in particolare la compresenza di `⇄` (cambio viaggio esistente) e `+` (aggiungi un nuovo viaggio) alle estremità del tema potrebbe confondere — entrambi riguardano la gestione viaggi ma fanno cose opposte. Possibili evoluzioni da valutare:

- **Hamburger `☰`** che racchiude tutti i pulsanti globali in un menu a discesa. Pro: header molto pulito, titolo viaggio + sottotitolo hanno tutto lo spazio. Contro: un click in più per azioni comuni.
- **Raggruppamento visivo** (wrapper con bordo o spaziatura) che isola `⇄` e `+` insieme come "gestione viaggi", separati da tema e GitHub.
- **Label testuali** sui bottoni icona (accettabile su desktop, meno su mobile stretto).

Questa fase 2 è intenzionalmente non dettagliata qui: va ridiscussa dopo aver visto il risultato della fase 1. Probabilmente diventerà una voce TODO separata in "media priorità" una volta definito lo scope.

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

### 3. MCP server Roadbook per integrazione con Claude (nuovo repo `roadbook-mcp`)

**Obiettivo**: permettere a un utente che sta lavorando a un itinerario con Claude (Desktop o Web) di **vedere in anteprima** il viaggio nella PWA Roadbook via un link cliccabile generato da una tool MCP. Il payload JSON viaggia nell'URL (parametro `?viaggio_data=<base64url>`), nessun server intermedio, nessuno storage cloud.

**Design completo** nel documento di progetto: [`analisi/mcp-roadbook-v1.md`](analisi/mcp-roadbook-v1.md). Contiene: flusso utente, architettura end-to-end, stack proposto, struttura del nuovo repo `roadbook-mcp`, specifica della tool `visualizza_itinerario`, validazione lightweight lato MCP (la PWA ha già il validatore completo), soglie URL (ok <16 KB, warn 16-30, rifiuto >60), modifiche alla PWA Roadbook (gestione nuovo parametro `?viaggio_data` in `App.vue`, additiva), test plan, domande aperte, roadmap v1.1+.

**Scope su questo repo**: una slice `feat` additiva che aggiunge la gestione `?viaggio_data` in `App.vue` (decodifica base64url → validatore esistente → import in IndexedDB → pulizia URL). Risk: medium (input nuovo dall'esterno, ma riusa il flusso esistente). Preceduta dal nuovo repo `roadbook-mcp` che produce il parametro.

**Prerequisito concettuale**: la voce #2 "Gestione utenti con login social" è **fortemente raccomandata prima**. Con utente anonimo la feature funziona comunque (il JSON è persistente nel browser come qualsiasi altro import), ma il valore pieno emerge quando un utente può editare un viaggio in Claude e ritrovarlo *automaticamente* sul suo device Roadbook via sync — senza bisogno di passare dall'URL-payload. Finché non c'è login, il MCP resta un comodo "copia-incolla via link" piuttosto che un'integrazione vera.

**Rischio di slice**: `risk:medium` sul lato Roadbook (modifica additiva ma su input esterno, richiede validazione + escape). Sul lato `roadbook-mcp` repo è nuovo quindi risk classification da rifare al kickoff.

---

## Media priorità

### 4. Icone PWA reali

Sostituire i placeholder SVG in `public/icons/` con PNG 192×192, 512×512, 512×512 maskable (per forma Android adattiva). Aggiornare `manifest.icons` in `vite.config.js`.

Effetto: l'app diventa installabile al 100% su Android senza warning del browser, l'icona sulla home avrà forma coerente.

### 5. Filtri per categoria e tag

Dalla v2 delle specifiche iniziali. In header o in un drawer laterale: checkbox per categoria (attive di default), filtro per tag. Il filtro si applica sia alla lista sia ai marker della mappa.

### 6. Ricerca testuale nei punti

Campo di ricerca che filtra in tempo reale nome/descrizione/tag dei punti. Tollerante a varianti diacritiche (è/e).

### 7. Galleria foto a tutto schermo

Per i punti che hanno `foto: [...]` nel JSON: click su thumbnail → lightbox con swipe, zoom, download.

---

## Bassa priorità / nice-to-have

### 8. Pulsante "naviga al prossimo non visitato"

Bottone che apre il prossimo punto non marcato come visitato nell'area corrente, centrando la mappa e aprendo il popup.

### 9. Condivisione punto come URL profondo

`?viaggio=<id>&area=<id>&punto=<n>` → apre l'app focalizzata su quel punto. Utile per condividere un luogo specifico via WhatsApp/email senza dover descrivere dove cercarlo.

### 10. Estensioni schema JSON (v1.2+)

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
