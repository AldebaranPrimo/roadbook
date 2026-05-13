# TODO

Lista delle cose da fare in futuro, in ordine di priorità logica (non strettamente temporale). Quando una voce entra in lavorazione, diventa una slice `ai/{slice-type}/{desc}` su `develop`; quando viene rilasciata, si sposta dal `TODO.md` al [`CHANGELOG.md`](CHANGELOG.md).

---

## 🐛 Bug — da correggere asap

*(nessun bug aperto. B-1 fix fase 1, B-2 workaround, B-3 fix PWA, B-4 e B-5 palliativo già applicati — vedere [`CHANGELOG.md`](CHANGELOG.md). La fase 2 di B-1 (hamburger / raggruppamento / label azioni) e il fix definitivo B-5 con deep link nativi restano in valutazione: per B-5 il task è tracciato come voce backlog #12 in media priorità.)*

---

## Alta priorità — prossime slice

### 1. Precaricamento offline totale al primo import

**Analisi completata**: vedere [`decisions/2026-04-24-prefetch-offline-strategia.md`](decisions/2026-04-24-prefetch-offline-strategia.md). Verdetto SEMPLICE, 4 file toccati, ~198 righe, 0 nuove dipendenze.

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

**Obiettivo**: permettere a un utente che sta lavorando a un itinerario con Claude (Desktop o Web) di **vedere in anteprima** il viaggio Roadbook via una tool MCP, sfruttando il viaggio JSON come fonte unica di verità.

**Design alternativi disponibili — scelta di scope ancora aperta**:

- **Opzione A — URL-payload + tab esterna** ([`decisions/2026-04-24-mcp-server-roadbook-scope-v1.md`](decisions/2026-04-24-mcp-server-roadbook-scope-v1.md), pianificata in dettaglio): server MCP stdio, tool `visualizza_itinerario` che ritorna URL `?viaggio_data=<base64url>` cliccabile. La PWA Roadbook aperta in nuova tab decodifica e importa. Nessun hosting, costo zero, ~1 settimana di lavoro.
- **Opzione B — MCP App con UI bundled inline** (estensione MCP Apps recente, riferimento [Microsoft, 8 aprile 2026](https://techcommunity.microsoft.com/blog/appsonazureblog/build-and-host-mcp-apps-on-azure-app-service/4509705)): server MCP HTTP che espone una risorsa UI (HTML+JS+CSS bundled) renderizzata in iframe sandbox direttamente nella chat Claude / VS Code Copilot / ChatGPT. Anteprima inline, niente cambio di contesto. Richiede hosting (Cloudflare Workers / Azure / altro) e bundle UI dedicato. ~1.5-2 settimane.
- **Opzione C — Ibrida**: A + B come due tool dello stesso server MCP (`anteprima_itinerario` per consultazione inline + `apri_in_roadbook` per salvataggio definitivo nella PWA dell'utente). ~3 settimane.

**Analisi di fattibilità dettagliata** delle tre opzioni: [`decisions/2026-04-28-mcp-apps-fattibilita-scope.md`](decisions/2026-04-28-mcp-apps-fattibilita-scope.md). Contiene confronto su costo, dipendenze (hosting, supporto host MCP Apps), vincoli iframe sandbox, raggiungibilità tile mappa, raccomandazione sintetica e roadmap proposte.

**Raccomandazione attuale**: opzione A come v1.0 (status quo già pianificato), opzione B in backlog per v1.1 dopo POC di verifica. Decisione finale rimandata al kickoff del task quando l'utente sceglie roadmap conservativa o aggressiva (vedere ultima sezione del documento di fattibilità).

**Scope su questo repo (Roadbook PWA), opzione A**: una slice `feat` additiva che aggiunge la gestione `?viaggio_data` in `App.vue` (decodifica base64url → validatore esistente → import in IndexedDB → pulizia URL). Risk: medium (input nuovo dall'esterno, ma riusa il flusso esistente). Preceduta dal nuovo repo `roadbook-mcp` che produce il parametro.

**Scope su questo repo, opzione B**: nessuna modifica alla PWA. Il bundle MCP App vive nel repo `roadbook-mcp` e riusa selettivamente codice del frontend Roadbook (componenti `MappaLeaflet`, `AreaPanel`, `PuntoCard`, validatore) come pacchetto interno o link git submodule.

**Prerequisito concettuale**: la voce #2 "Gestione utenti con login social" è **fortemente raccomandata prima** (per opzione A e C). Con utente anonimo la feature funziona ma il viaggio modificato in chat va re-importato a mano nella PWA del device. Con login, sync automatico tra chat e PWA.

**Rischio di slice**: `risk:medium` sul lato Roadbook PWA (modifica additiva ma su input esterno, richiede validazione + escape). Sul lato `roadbook-mcp` repo è nuovo, risk classification da rifare al kickoff in base all'opzione scelta.

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

### 8. Scheda dettagliata punto (modal full-screen)

Modal dedicata che mostra un singolo punto in pieno: foto gallery (integra #7), mappa zoomata singola sul punto, tutti i link (Google Maps / Waze / Apple Maps / OsmAnd), nota personale modificabile inline, flag visitato, coordinate copiabili. Componente nuovo suggerito: `src/components/ModalDettagliPunto.vue`.

**Trigger**: riattivare il bottone *"Dettagli →"* nel popup del marker (oggi nascosto con flag `mostraBottoneDettagli = false` in `MappaLeaflet.vue` per via del bug B-2), collegandolo all'apertura di questa modal. Così il bottone riacquista una funzione concreta distinta dal click sul marker (che continua a fare scroll + evidenzia la scheda in lista).

**Scope implementativo** (`risk:medium`):
- Nuovo `ModalDettagliPunto.vue` con layout mobile-first, chiusura via backdrop / tasto Esc / bottone ✕.
- In `MappaLeaflet.vue`: flag `mostraBottoneDettagli = true`, listener `popupopen` già presente emette un nuovo evento (es. `apriDettagliPunto`) invece del `clickPunto` ridondante.
- `App.vue`: wiring che apre la modal sul nuovo evento.

**Dipendenze**: integrabile con #7 (Galleria foto) come sub-feature dello stesso task se le si sviluppa insieme.

---

## Bassa priorità / nice-to-have

### 9. Pulsante "naviga al prossimo non visitato"

Bottone che apre il prossimo punto non marcato come visitato nell'area corrente, centrando la mappa e aprendo il popup.

### 10. Condivisione punto come URL profondo

`?viaggio=<id>&area=<id>&punto=<n>` → apre l'app focalizzata su quel punto. Utile per condividere un luogo specifico via WhatsApp/email senza dover descrivere dove cercarlo.

### 11. Multimodalità all'interno di una singola area

Oggi `area.modalita` vale per tutti i punti dell'area. Scenario non coperto: "arrivo in macchina al parcheggio del rifugio, poi sentiero a piedi, ritorno in funivia" come **unica** escursione, dove spezzare in due o tre aree contigue snatura l'unitarietà dell'attività dal punto di vista dell'utente.

**Approcci da progettare** (almeno tre, non mutuamente esclusivi):

- `modalita` sulla tratta `punto-N → punto-(N+1)`, magari come campo opzionale sul punto di destinazione della tratta
- Sotto-tratte esplicite con array `tratte: [{ da: 1, a: 2, modalita: 'auto' }, ...]` a livello area
- Modalità ereditata dal punto di partenza, con un campo `modalita` opzionale sul singolo punto

**Impatti implementativi attesi**:

- OSRM chiamato a pezzi per le tratte stradali, risultati concatenati
- Polyline disegnata con stile diverso per ogni tratta (colore? linea tratteggiata vs piena? differenziazione per modalità non stradale)
- Cache routing IndexedDB con granularità per tratta (oggi è per area)
- Validatore + schema doc + UI etichette aggiornati
- Backwards-compat: viaggi v1.1 con solo `area.modalita` devono continuare a funzionare uguale

**Non urgente**: prima valutiamo se le 6 modalità per area introdotte con la slice di maggio 2026 coprono già abbastanza casi reali. Riapriamo la discussione quando emerge un itinerario concreto che lo richiede. Aperta una issue GitHub dedicata per il follow-up.

### 12. Estensioni schema JSON (v1.2+)

Già previste come campi opzionali, da implementare quando emergono esigenze:
- `giorni`: array opzionale per viaggi suddivisi in giornate (alternativa a `aree`)
- `gpx_url`: traccia GPX sovrapposta al percorso
- `bookings`: collegamenti a prenotazioni hotel/ristoranti
- `meteo_link`: URL al forecast per il luogo/data

---

## Debito tecnico

Il debito tecnico è ora tracciato come **registro centralizzato** in [`docs/tech-debt.md`](tech-debt.md), in formato `TD-NNN` con sezioni di approccio suggerito per ciascuna voce. Vedi quel file per voci aperte e chiuse.

Voci attuali (riassunto, vedi il file per i dettagli completi):

| ID | Titolo | Priorità |
|---|---|---|
| TD-001 | Ristrutturazione branch a tre livelli `main` + `production` + `develop` | media |
| TD-002 | Test Vitest per le utility pure | bassa |
| TD-003 | Audit WCAG 2.1 AA | media |
| TD-004 | ESLint + Prettier non configurati | bassa |
| TD-005 | Possibile migrazione JS → TS | bassa (valutativa) |
| TD-006 | Hook Claude Code (`.claude/settings.json`) ulteriori | bassa |

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
- ✅ B-1 fase 1: fix altezza uniforme pulsanti header mobile + `ⓘ` Info viaggio spostato accanto al titolo (contestuale al viaggio, non globale). Fase 2 (hamburger / raggruppamento / label) resta in valutazione.
- ✅ B-2 (parziale, opzione C scelta): bottone *"Dettagli →"* nel popup marker temporaneamente nascosto (flag `mostraBottoneDettagli = false` in `MappaLeaflet.vue`). Sarà riattivato con funzione concreta quando verrà implementata la voce #8 "Scheda dettagliata punto (modal full-screen)".
- ✅ Contratto `CLAUDE-vue-app.md` v1.1.1 — aggiornamento consolidato da critica costruttiva (nuovi invarianti I-13/14/15, ampliamenti I-05/07/08/11/12, sezioni minime CLAUDE.md di repo estese, fix sintassi `@copilot review`)
