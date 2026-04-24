# Specifiche - Itinerary Viewer (PWA)

> **Documento di handover** dal progetto "Viaggi" verso il nuovo progetto dedicato allo sviluppo dell'app.
> Versione: 1.0 — 24 aprile 2026
> Stato: pronto per implementazione

---

## 1. Obiettivo

Costruire una **Progressive Web App** che, caricando un file JSON con la struttura definita in questo documento, mostri un itinerario di viaggio organizzato in **aree geografiche**, con per ciascuna area: descrizione testuale, mappa interattiva con marker numerati e percorso, lista punti dettagliata.

L'app deve essere **riutilizzabile per qualsiasi viaggio**: cambia il JSON, cambia il viaggio. Nessun dato hardcoded nel codice.

## 2. Caratteristiche del caso d'uso primario

- **Utente target**: viaggiatore in camper, consultazione prevalentemente da telefono (Android), cane al seguito.
- **Contesto d'uso**: spesso offline o connessione scarsa (zone montane di confine).
- **Esigenza chiave**: lista descrittiva dei punti SEMPRE leggibile, mappe possibilmente sì ma con fallback grazioso quando assenti.
- **Vincolo dimensionale**: il viaggio tipico ha 5-10 aree, ciascuna con 3-8 punti. Niente migliaia di marker.
- **No multi-utente, no cloud sync**: tutto locale al dispositivo.

## 3. Schema JSON (versione 1.0)

Il file JSON è la fonte unica di verità del viaggio. Struttura completa:

### 3.1 Root

```json
{
  "$schema_version": "1.0",
  "viaggio": { ... },
  "categorie": { ... },
  "aree": [ ... ]
}
```

`$schema_version` è obbligatorio e verrà usato in futuro per gestire migrazioni di schema.

### 3.2 Oggetto `viaggio`

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `id` | string | sì | Identificatore univoco (slug, ASCII, no spazi). Usato per chiavi in localStorage. |
| `titolo` | string | sì | Titolo principale mostrato nell'header. |
| `sottotitolo` | string | no | Sottotitolo (es. "Ponte 25-26 aprile 2026"). |
| `descrizione_estesa` | string | no | Descrizione lunga del viaggio, mostrata nel modal info. |
| `data_inizio` | string ISO date | no | Es. "2026-04-24". |
| `data_fine` | string ISO date | no | Es. "2026-04-26". |
| `partenza` | object | no | Vedi schema "Punto geografico" sotto. |
| `rientro` | object | no | Vedi schema "Punto geografico" sotto. |
| `documenti_richiesti` | string | no | Note su documenti, vignette, ecc. |
| `tags` | array di string | no | Tag liberi a livello viaggio. |
| `lingua` | string | no | Codice ISO 639-1 (es. "it"). Default: "it". |

**Schema "Punto geografico"** (per `partenza`, `rientro`):
```json
{ "nome": "...", "lat": 45.78, "lon": 11.84, "quando": "...", "descrizione": "..." }
```
`nome`, `lat`, `lon` obbligatori; `quando` e `descrizione` opzionali.

### 3.3 Oggetto `categorie`

Mappa chiave→definizione di categoria. Ogni categoria definisce colore e label (e opzionalmente emoji) usati per i marker e la legenda.

```json
"categorie": {
  "natura": {
    "colore": "#16a34a",
    "label": "Natura / fiumi / animali",
    "icona_emoji": "🌳"
  }
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `colore` | string hex | sì | Colore CSS valido (es. `#16a34a`). |
| `label` | string | sì | Etichetta umana mostrata in legenda e popup. |
| `icona_emoji` | string | no | Emoji opzionale per UI compatte. |

Le chiavi delle categorie sono libere; verranno referenziate dal campo `categoria` di ogni punto.

### 3.4 Array `aree`

Ogni area è un blocco geografico/tematico del viaggio.

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `id` | int | sì | Numero progressivo unico. |
| `nome` | string | sì | Nome dell'area, mostrato nei tab. |
| `intro` | string | no | Descrizione introduttiva mostrata sopra la lista punti. |
| `modalita` | enum | no | `"auto"` o `"piedi"`. Default: `"auto"`. Determina il profilo OSRM e lo stile della linea percorso. |
| `tags` | array string | no | Tag liberi a livello area. |
| `punti` | array | sì | Vedi sezione 3.5. Almeno 1 punto. |

### 3.5 Array `punti` (dentro ogni area)

Cuore del JSON. Ogni punto ha campi obbligatori e molti opzionali.

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `n` | int | sì | Numero progressivo dentro l'area (1, 2, 3...). Visualizzato nei marker. |
| `name` | string | sì | Nome del luogo. |
| `lat` | float | sì | Latitudine WGS84. |
| `lon` | float | sì | Longitudine WGS84. |
| `categoria` | string | sì | Chiave esistente in `categorie`. |
| `desc` | string | sì | Descrizione principale del luogo. |
| `avvertenze` | string | no | Avvisi importanti (vertigini, furti, restrizioni). Mostrato evidenziato. |
| `orari` | string | no | Orari di apertura (testo libero). |
| `costo` | string | no | Costo di ingresso/sosta (testo libero per gestire "5€/24h", "8€ adulti, 5€ bambini" ecc.). |
| `sito_web` | string URL | no | URL del sito ufficiale. |
| `telefono` | string | no | Numero di telefono. |
| `note_pratiche` | string | no | Info utili (dove ritirare le chiavi, dove parcheggiare). |
| `foto` | array di string URL | no | Immagini del luogo. |
| `tags` | array string | no | Tag liberi del punto, usabili per filtri. |

### 3.6 Estensioni future già previste

Lo schema 1.0 NON include i seguenti, ma 1.x potrà aggiungerli:
- `giorni`: array opzionale per viaggi suddivisi in giornate (alternativa a `aree`)
- `gpx_url`: traccia GPX da sovrapporre al percorso
- `bookings`: collegamenti a prenotazioni (hotel, ristoranti)
- `meteo_link`: URL al forecast del luogo

L'app deve **ignorare silenziosamente i campi non riconosciuti** per supportare forward-compatibility.

## 4. Funzionalità dell'app

### 4.1 Funzionalità "must" (v1)

1. **Caricamento JSON**: input file picker + drag&drop sull'area centrale + URL parametro query (`?viaggio=https://...`).
2. **Validazione JSON**: messaggio chiaro se manca `$schema_version` o se la struttura è invalida.
3. **Header app**: titolo viaggio + sottotitolo, sempre visibile.
4. **Tab navigazione aree**: scrollabili orizzontalmente su mobile, click cambia area corrente.
5. **Sidebar/pannello area**: intro dell'area + lista punti numerati e colorati per categoria.
6. **Mappa Leaflet** con:
   - Marker numerati colorati per categoria (riprendere lo stile usato finora: cerchio col numero al centro)
   - Popup ricco al click sul marker (titolo, categoria, descrizione, link esterni)
   - Percorso fra i punti, tracciato via OSRM (driving o foot in base a `modalita`), con fallback a polyline retta in caso di errore
7. **Sincronizzazione lista⇄mappa**: click su voce della lista → fly-to sul marker + popup; click sul marker → scroll della lista al punto corrispondente.
8. **Link diretti** in popup e lista: apri in Google Maps, Waze, Apple Maps (rilevamento OS).
9. **Tema chiaro/scuro** con preferenza salvata in localStorage.
10. **Stampa nativa** del browser (CSS `@media print` ben fatto: nasconde mappa, lascia liste leggibili).
11. **Stato "visitato"** per ogni punto, salvato in localStorage con chiave `${viaggio.id}:${area.id}-${punto.n}`.
12. **Modal info** con: descrizione viaggio, documenti, legenda categorie, conteggio visitati.

### 4.2 Funzionalità "nice to have" (v2)

- Filtro per categoria (mostra solo natura, solo castelli, ecc.)
- Filtro per tag
- Ricerca testuale nei punti
- Geolocalizzazione utente con marker "tu sei qui"
- Pulsante "naviga al prossimo non visitato"
- Esporta/importa stato visitati (backup)
- Galleria foto a tutto schermo per i punti che le hanno
- Condivisione di un singolo punto come URL profondo

### 4.3 Caratteristiche PWA specifiche

- **Manifest** con nome, icone (192 e 512), colore tema, display `standalone`
- **Service worker** per cache offline:
  - Cache strategy: app shell → cache-first (HTML/JS/CSS sempre disponibili)
  - JSON viaggi caricati → cache su prima visualizzazione
  - Tile mappa → cache opportunistica (le tile viste vengono salvate, max ~100 MB con eviction LRU)
- **Installabile**: prompt `beforeinstallprompt` gestito, bottone "Installa app" se disponibile
- **Aggiornamenti**: rileva nuova versione del SW, banner "Aggiornamento disponibile, ricarica"

## 5. Stack tecnico raccomandato

| Componente | Scelta | Motivazione |
|---|---|---|
| Framework UI | **Alpine.js** (~15 KB) | Reattività dichiarativa senza build step. Adatto a singola pagina semplice. Alternativa: Vue 3 in modalità no-build se servono più componenti. |
| Mappa | **Leaflet** (~150 KB) | Maturo, leggero, ottime performance mobile, ecosistema enorme. |
| Routing percorso | **OSRM pubblico** (`router.project-osrm.org`) | Gratuito, no API key. Per produzione seria: OpenRouteService con API key gratuita. |
| Tile mappa | Vedi sezione 7 (problema cruciale) | |
| Bundling | **Nessuno** se possibile | Tutto inline o file statici, deploy = copia cartella. Build step solo se si sceglie Vue/React. |
| Hosting | Vedi sezione 6 | |

## 6. Hosting (decisione aperta)

| Opzione | Pro | Contro | Consigliato per |
|---|---|---|---|
| **GitHub Pages** | Gratis, versionato (git), URL stabile `username.github.io/repo` | Richiede account GitHub e familiarità con git | Chi già usa git o vuole imparare |
| **Netlify Drop** | Drag&drop di una cartella, URL immediato, gratis | Aggiornamenti = ri-trascinare | Massima semplicità, niente git |
| **Cloudflare Pages** | Gratis, performance globali, integrazione git | Setup iniziale più complesso | Performance critiche |
| **Vercel** | Gratis, integrazione git eccellente | Tier gratuito ha limiti su uso commerciale | Sviluppatore che già lo usa |

**Decisione**: da prendere all'inizio del nuovo progetto in base alle preferenze.

Indipendentemente dalla scelta, il manifest PWA andrà adattato all'URL finale (campo `start_url` e `scope`).

## 7. ⚠ Problemi noti / lezioni apprese (importanti)

### 7.1 Tile cartografiche e header `Referer`

**Sintomo**: aprendo la mappa da `file://` (file locale) compaiono numerosi rettangoli "Access blocked - Referer is required".

**Causa**: dal 2022 OpenStreetMap (`tile.openstreetmap.org`) richiede header `Referer` non vuoto come misura anti-abuso. Il browser non lo invia su `file://`.

**Soluzioni** (in ordine di affidabilità):
- **CartoDB** (`basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`, `basemaps.cartocdn.com/light_all/...`, `basemaps.cartocdn.com/dark_all/...`): non richiede Referer, funziona da `file://` e da PWA. **Provider raccomandato**.
- Una volta deployata come PWA su un dominio (HTTPS), anche le tile OSM ufficiali tornano a funzionare perché il Referer viene inviato.

### 7.2 ⚠ Tile ESRI: problema proiezione cartografica

**Sintomo**: usando i layer ESRI (`server.arcgisonline.com/.../World_Topo_Map`, `World_Imagery`) in Leaflet, **i marker appaiono spostati rispetto alla cartografia**, con sfasamento crescente allontanandosi dall'equatore. Esempio osservato: marker che dovrebbero essere a Spilimbergo finiscono in mare aperto a sud di Venezia.

**Causa probabile**: i MapServer ESRI usati restituiscono tile in una proiezione (o con un grid) non perfettamente compatibile con Leaflet/Web Mercator standard. Leaflet calcola le coordinate dei marker in EPSG:3857 (Web Mercator) ma le tile vengono renderizzate con offset diverso.

**Soluzioni possibili** (da approfondire nel nuovo progetto):
- Usare il plugin `leaflet.basemaps` o `esri-leaflet` (estensione ufficiale Esri per Leaflet) che gestisce correttamente i grid Esri
- Limitare i layer al solo CartoDB (sconsigliato perdere topografica/satellitare)
- Cercare provider topografici/satellitari alternativi compatibili Web Mercator standard:
  - **OpenTopoMap** (`a.tile.opentopomap.org`) — topografica
  - **Esri via plugin esri-leaflet** — l'integrazione corretta
  - **Stamen Terrain** (via Stadia Maps, può richiedere API key)

**Raccomandazione v1**: partire con **solo Carto Voyager + Carto Light** (entrambi corretti). Aggiungere topografica/satellite solo dopo aver risolto il problema con `esri-leaflet`.

### 7.3 OSRM pubblico: limiti

- L'endpoint `router.project-osrm.org` è demo, non garantisce SLA.
- Per produzione vera: API key gratuita su **OpenRouteService** (openrouteservice.org) con limiti generosi (~2000 richieste/giorno).
- Comunque, predisporre un fallback a polyline retta tra i punti se il routing fallisce.

### 7.4 Marker numerati con DivIcon

Approccio funzionante (già verificato): non usare l'icona di default Leaflet ma un `L.divIcon` con HTML inline tipo:
```html
<div class="numbered-marker" style="background:#ff0000">N</div>
```
con CSS che lo rende cerchio. Vantaggi: leggerissimo (no immagini), colorabile dinamicamente, accessibile.

### 7.5 Alpine.js: ordine degli script

Alpine fa il bootstrap appena viene caricato. Se le funzioni `x-data="..."` non sono ancora definite, salta tutti i binding. Soluzione: caricare il proprio script con le definizioni **prima** di Alpine, oppure caricare Alpine con `defer`.

### 7.6 localStorage e privacy

Salvare in localStorage solo dati non sensibili: tema, stato visitati. Mai dati personali identificabili.

## 8. UI/UX raccomandazioni

- **Mobile-first**: la maggior parte delle visualizzazioni sarà da telefono.
- Layout responsive: su desktop 2 colonne (sidebar + mappa); su mobile mappa sopra (50vh) e lista sotto, scrollabili indipendentemente.
- Niente bottoni "carica viaggio" ingombranti se un viaggio è già caricato; metterli nelle impostazioni/info.
- Tema chiaro come default (la maggior parte delle consultazioni saranno di giorno alla luce solare).
- Font system-stack, no Google Fonts (privacy + performance offline).
- Niente emoji a casaccio nell'UI; le emoji nelle categorie sono opzionali e usate solo se definite nel JSON.

## 9. Esempio di JSON

Vedi file allegato `viaggio-friuli-2026.json` come implementazione completa di riferimento dello schema 1.0. Contiene 7 aree, 30 punti, copre tutti i campi opzionali documentati.

## 10. Roadmap suggerita

1. **Sprint 0** (setup): scegli hosting, scegli stack (Alpine vs Vue), inizializza repo + deploy automatico vuoto.
2. **Sprint 1** (PWA shell): manifest, service worker base, layout responsive con dati hardcoded.
3. **Sprint 2** (caricamento JSON): file picker + drag&drop + parsing + validazione schema.
4. **Sprint 3** (mappa): Leaflet + Carto + marker numerati + popup base.
5. **Sprint 4** (sincronizzazione): list⇄map binding, fly-to, tema scuro.
6. **Sprint 5** (polish): stampa, modal info, link esterni Maps/Waze, stato visitati.
7. **Sprint 6** (offline): fine-tuning service worker per mappe, prompt installa.
8. **Sprint 7+** (v2): filtri, ricerca, geolocalizzazione.

## 11. Test consigliati

- Apertura su Chrome Android (uso primario)
- Apertura su Firefox desktop e Chrome desktop
- Verifica installazione PWA
- Verifica funzionamento offline dopo aver caricato un viaggio una volta
- Verifica cache tile mappa (zoom su zona, disconnetti rete, riapri zona)
- Stampa il viaggio (deve venire un PDF leggibile)
- Tema scuro su tutto
- Caricamento di un JSON malformato (deve dare errore chiaro, non crashare)
- Caricamento di un JSON con campi sconosciuti (deve ignorarli, non crashare)

## 12. File allegati a questo handover

- `viaggio-friuli-2026.json` — primo viaggio completo, riferimento per lo schema
- (opzionale) `kml` esistente del viaggio, già caricato dall'utente in Google My Maps come backup di navigazione

---

## Appendice A — Glossario

- **PWA** (Progressive Web App): app web installabile sul dispositivo, con icona, splash screen, capacità offline.
- **Service Worker**: script che gira in background nel browser, intercetta richieste di rete e gestisce la cache.
- **Manifest**: file JSON che descrive metadati dell'app (nome, icone, colori) per l'installazione.
- **Tile**: tessera quadrata 256×256px che compone la mappa raster a un certo livello di zoom.
- **OSRM**: Open Source Routing Machine. Calcola percorsi stradali su grafo OpenStreetMap.
- **OSM**: OpenStreetMap, mappa libera del mondo.
- **EPSG:3857**: codice della proiezione "Web Mercator" usata da quasi tutte le mappe web.
- **EPSG:4326**: codice della proiezione WGS84 (latitudine/longitudine pure, non proiettata).

---

*Documento prodotto al termine del progetto "Viaggi" (chat con Claude su Anthropic, 24 aprile 2026), come handover verso il nuovo progetto dedicato all'app.*
