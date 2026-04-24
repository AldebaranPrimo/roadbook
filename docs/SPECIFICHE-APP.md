# Specifiche iniziali — Roadbook (PWA)

> ⚠ **Documento storico non vivente.** Questo file conserva le specifiche iniziali con cui è nato il progetto il 24 aprile 2026. **Non rappresenta lo stato corrente dell'app**, che è evoluto in direzioni diverse.
>
> Per lo stato corrente: [`STATO-PROGETTO.md`](STATO-PROGETTO.md) · Per la cronologia: [`CHANGELOG.md`](CHANGELOG.md) · Per lo schema JSON vivente: [`../README.md`](../README.md) ("Schema del JSON di viaggio") o la versione accessibile agli LLM in [`../public/schema/viaggio-1.1.md`](../public/schema/viaggio-1.1.md).
>
> Il file è mantenuto per memoria storica: quali decisioni sono state prese al giorno zero, quali problemi tecnici erano previsti, quali scelte sono state sostituite in corso d'opera. Consultare per **contesto**, non per indicazioni operative correnti.

---

## 1. Obiettivo iniziale

Costruire una Progressive Web App che, caricando un file JSON con la struttura definita dal progetto, mostri un itinerario di viaggio organizzato in **aree geografiche**, con per ciascuna area: descrizione testuale, mappa interattiva con marker numerati e percorso, lista punti dettagliata.

L'app doveva essere **riutilizzabile per qualsiasi viaggio**: cambia il JSON, cambia il viaggio. Nessun dato hardcoded nel codice.

## 2. Caso d'uso primario — come descritto al giorno zero

- **Utente target**: viaggiatore in camper, consultazione prevalentemente da telefono (Android), cane al seguito.
- **Contesto d'uso**: spesso offline o connessione scarsa (zone montane di confine).
- **Esigenza chiave**: lista descrittiva dei punti SEMPRE leggibile, mappe con fallback grazioso.
- **Vincolo dimensionale**: viaggio tipico 5-10 aree, ciascuna 3-8 punti. Niente migliaia di marker.
- **No multi-utente, no cloud sync**: tutto locale al dispositivo.

*Oggi: il vincolo "no multi-utente / no cloud sync" è in fase di revisione (voce TODO alta priorità). Resta tutto locale in v1, ma lo store `src/utils/store-viaggi.js` è già predisposto per un refactor cloud-aware.*

## 3. Schema JSON — *rimosso dal documento storico*

Lo schema iniziale era una struttura piatta `$schema_version + viaggio + categorie + aree`, documentata con 6 sotto-sezioni tabellari. È stato successivamente esteso nella v1.1 con il campo `annotazioni` per rendere portabili note e visitati dell'utente.

**Lo schema corrente vivente** è mantenuto in due posizioni, NON qui:

- [`README.md`](../README.md) sezione "Schema del JSON di viaggio" — versione sintetica con esempio
- [`public/schema/viaggio-1.1.md`](../public/schema/viaggio-1.1.md) — versione estesa accessibile via URL statica (`https://AldebaranPrimo.github.io/roadbook/schema/viaggio-1.1.md`), progettata per essere passata a un LLM per produrre nuovi viaggi nel formato standard

Le implementazioni del validatore sono in [`src/utils/valida-schema.js`](../src/utils/valida-schema.js).

## 4. Funzionalità previste al giorno zero

**"Must" dichiarate nella v1 iniziale** (12 voci): caricamento JSON via file picker / drag-drop / URL; validazione; header con titolo; tab aree scrollabili; pannello area con lista punti; mappa Leaflet con marker numerati + popup + percorso OSRM; sincronizzazione lista↔mappa; deep link Google Maps / Waze / Apple Maps; tema chiaro/scuro; stampa; stato "visitato"; modal info con legenda.

**"Nice to have" dichiarate per v2**: filtri categoria/tag, ricerca testuale, geolocalizzazione, prossimo non visitato, backup visitati, galleria foto, condivisione punto.

*Oggi, delle "nice to have", sono già implementate: geolocalizzazione "tu sei qui" (v1.1), OsmAnd aggiunto ai deep link (v1.0.1), backup/restore completo dell'app (v1.0), export/import singolo viaggio con annotazioni embedded (v1.1). Restano in TODO: filtri categoria/tag, ricerca testuale, prossimo non visitato, galleria foto full-screen, condivisione punto come URL profondo.*

## 5. Stack raccomandato al giorno zero

Lo handover iniziale proponeva **Alpine.js** (~15 KB) come framework UI per mantenere la semplicità "no build step". Era accompagnato da: Leaflet per la mappa, OSRM pubblico per il routing, hosting da scegliere tra GitHub Pages / Netlify / Cloudflare / Vercel.

*Oggi: la scelta è stata **Vue 3 + Vite + vite-plugin-pwa** (non Alpine). Motivo: migliore DX, PWA più robusta via Workbox, ecosistema di componenti più ricco per UI che ha continuato ad arricchirsi (selettore stile mappa, import/export, toast aggiornamento, ecc.). Hosting: GitHub Pages.*

## 6. Problemi noti affrontati al giorno zero

Queste sono le lezioni apprese dall'iterazione precedente (progetto "Viaggi") che hanno guidato le prime scelte. Restano tutte **valide ancora oggi**:

### 6.1 Tile cartografiche e header `Referer`

Dal 2022 OpenStreetMap (`tile.openstreetmap.org`) richiede header `Referer` non vuoto come misura anti-abuso. Il browser non lo invia su `file://`, quindi le tile OSM risultano bloccate se si apre l'app come file locale.

**Soluzione**: usare **CartoDB** (`basemaps.cartocdn.com/*`) che non richiede Referer, oppure deployare come PWA su HTTPS (caso Roadbook: GitHub Pages). Oggi l'app supporta entrambi i provider come stili selezionabili dal control.layers.

### 6.2 ⚠ Tile ESRI — problema di proiezione

Usando i layer ESRI (`server.arcgisonline.com/.../World_Topo_Map`, `World_Imagery`) in Leaflet i marker appaiono **spostati rispetto alla cartografia**, con sfasamento crescente allontanandosi dall'equatore. Esempio osservato: marker che dovrebbero essere a Spilimbergo finiscono in mare aperto a sud di Venezia.

Causa probabile: i MapServer ESRI usano un grid non compatibile con Web Mercator standard di Leaflet.

**Raccomandazione**: **non usare tile ESRI** senza il plugin `esri-leaflet` che gestisce correttamente i grid ESRI. Oggi l'app usa OpenStreetMap standard (default), CartoDB Voyager/Positron/Dark Matter, OpenTopoMap — tutti Web Mercator compatibili — e questa regola è codificata nelle "scelte non negoziabili" di [`STATO-PROGETTO.md`](STATO-PROGETTO.md).

### 6.3 OSRM pubblico — limiti

L'endpoint `router.project-osrm.org` è demo, senza SLA. Per produzione vera andrebbe API key gratuita su OpenRouteService (~2000 req/giorno). Comunque: predisporre sempre fallback a polyline retta se il routing fallisce.

Oggi l'app ha ancora il rate limiting implicito di OSRM pubblico; ha però **cache persistente in IndexedDB** senza scadenza applicativa: dopo la prima apertura online di un'area, il percorso resta disponibile offline indefinitamente. Fallback polyline retta con banner. Dettagli in [`STATO-PROGETTO.md`](STATO-PROGETTO.md).

### 6.4 Marker numerati con DivIcon

Pattern noto funzionante: non usare l'icona di default Leaflet ma un `L.divIcon` con HTML inline (`<div class="numbered-marker">N</div>`). Vantaggi: leggerissimo (no immagini), colorabile dinamicamente, accessibile. Scelta confermata in Roadbook.

### 6.5 Alpine.js — ordine degli script

*Non più rilevante: stack scelto è Vue 3 + Vite.*

### 6.6 localStorage e privacy

Salvare in localStorage solo dati non sensibili: tema, stato visitati. Mai dati personali identificabili.

*Oggi: è stato fatto di meglio. Roadbook usa **IndexedDB via `idb`** con wrapper astratto `src/utils/store-viaggi.js`. Nessun dato sensibile, tutto locale al dispositivo, tutto portabile via backup/restore.*

## 7. Hosting — decisione iniziale

Al giorno zero l'handover elencava 4 opzioni (GitHub Pages / Netlify Drop / Cloudflare Pages / Vercel) con la scelta lasciata aperta. **Esito**: GitHub Pages, già attivo, CI via `.github/workflows/deploy.yml` su push a `main`.

## 8. UI/UX raccomandazioni iniziali — ancora valide

- Mobile-first (la maggior parte delle visualizzazioni è da telefono)
- Layout responsive: desktop 2 colonne (sidebar + mappa), mobile mappa sopra + lista sotto
- Tema chiaro come default (uso diurno prevalente)
- Font system-stack, no Google Fonts (privacy + performance offline)

Tutte confermate nel prodotto corrente.

## 9. Roadmap per sprint — come era stata disegnata

1. **Sprint 0** (setup): scegli hosting, scegli stack, inizializza repo + deploy automatico.
2. **Sprint 1** (PWA shell): manifest, service worker base, layout responsive.
3. **Sprint 2** (caricamento JSON): file picker + drag&drop + validazione.
4. **Sprint 3** (mappa): Leaflet + Carto + marker numerati + popup.
5. **Sprint 4** (sincronizzazione): list⇄map binding, fly-to, tema scuro.
6. **Sprint 5** (polish): stampa, modal info, link Maps/Waze, stato visitati.
7. **Sprint 6** (offline): fine-tuning SW per mappe, prompt installa.
8. **Sprint 7+** (v2): filtri, ricerca, geolocalizzazione.

*Sprint 0-7 completati (incluse diverse voci v2). Il progetto ha poi continuato con voci non previste inizialmente: selettore stile mappa con 5 provider, tema scuro OSM con filtro CSS invertito, schema JSON v1.1 con annotazioni embedded, versione visibile + auto-update PWA con toast, OsmAnd nei deep link. Storico completo in [`CHANGELOG.md`](CHANGELOG.md).*

## 10. Test consigliati al giorno zero

- Apertura su Chrome Android (uso primario)
- Verifica installazione PWA
- Verifica funzionamento offline dopo primo caricamento
- Stampa del viaggio (deve venire un PDF leggibile)
- Tema scuro su tutto
- JSON malformato → errore chiaro, non crash
- JSON con campi sconosciuti → ignorati, non crash

Tutti confermati come obiettivi del prodotto, attualmente verificati via smoke Playwright manuale in sede di slice (non ancora automatizzati — vedere debito tecnico in [TODO.md](TODO.md)).

---

## Appendice — Glossario originale

- **PWA** (Progressive Web App): app web installabile sul dispositivo, con icona, splash screen, capacità offline.
- **Service Worker**: script che gira in background nel browser, intercetta richieste di rete e gestisce la cache.
- **Manifest**: file JSON che descrive metadati dell'app (nome, icone, colori) per l'installazione.
- **Tile**: tessera quadrata 256×256px che compone la mappa raster a un certo livello di zoom.
- **OSRM**: Open Source Routing Machine. Calcola percorsi stradali su grafo OpenStreetMap.
- **OSM**: OpenStreetMap, mappa libera del mondo.
- **EPSG:3857**: codice della proiezione "Web Mercator" usata da quasi tutte le mappe web.
- **EPSG:4326**: codice della proiezione WGS84 (latitudine/longitudine pure, non proiettata).

---

*Documento prodotto al termine del progetto "Viaggi" (chat con Claude su Anthropic, 24 aprile 2026), come handover verso il nuovo progetto dedicato all'app. Alleggerito il 24 aprile 2026 a "documento storico" quando il prodotto vivente ha superato le specifiche iniziali in più direzioni.*
