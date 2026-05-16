---
id: 2026-05-15-maplibre-rivalutazione
stato: aperta
data-apertura: 2026-05-15
schema-version: 1
tag: [mappa, rendering, dipendenze, performance]
---

## Richiesta

Richiesta originata dall'autore in chat il 2026-05-15:

> Verifica la possibilità di sostituire l'attuale sistema di mapping che se non ricordo male è basato su Leaflet con https://maplibre.org/maplibre-gl-js/

Motivazione successiva precisata dall'autore nello stesso scambio:

> Il motivo per cui MapLibre è nettamente superiore è per la capacità di visualizzazione 3D e relativa rotazione. Anche la velocità sembra superiore.

Esito atteso della richiesta: una **rivalutazione documentata** della scelta del renderer mappa, con analisi puntuale del costo implementativo, non una decisione immediata.

## Interlocuzione

### 2026-05-15 — Prima analisi tecnica (chat)

Sintesi degli aspetti emersi nello scambio iniziale (dettaglio completo in [issue #35](https://github.com/AldebaranPrimo/roadbook/issues/35)):

- **Bundle gzip**: Leaflet ~42 KB → MapLibre ~290 KB. Il bundle iniziale corrente (~90 KB gzip) andrebbe a ~338 KB, sforando il budget `≤ 280 KB gzip` fissato nel `CLAUDE.md`. Mitigazioni proposte: lazy load del componente mappa via `defineAsyncComponent`, oppure rialzo motivato del budget, oppure combinazione.
- **WebGL2 obbligatorio**: MapLibre 4.x ha deprecato WebGL1. Copertura Android dal 2018 (Chrome 56+ / Android 7+). Adeguato per il device target dell'autore, ma chiude la porta a device pre-2018.
- **Cache routing non impattata**: la geometria in IndexedDB è una *polyline5 encoded string*, agnostica all'ordine `lat/lon`. Nessuna migrazione dati necessaria.
- **Marker custom portabili**: i `Marker({element})` di MapLibre sono DOM overlay, fuori dal canvas WebGL — stessa proprietà del pane Leaflet attuale, l'XSS-safety con `escapeHtml` si replica invariata.
- **Dark mode**: il filtro CSS `invert + hue-rotate` sul tilePane Leaflet non si replica identico in MapLibre perché la polyline vive dentro il canvas WebGL. Mitigazione proposta per la prima slice: filtro CSS sul canvas + `setPaintProperty('line-color')` per la polyline in tema scuro. Versione più pulita (style spec dedicati per provider) rimandata.
- **Capability uniche MapLibre**: vista 3D con pitch/tilt, rotazione mappa, rendering WebGL2 hardware-accelerated. Non replicabili in Leaflet senza ginnastica.

**Stima sforzo Claude attivo per slice singola**: ~2 ore (riscrittura `MappaLeaflet.vue` mantenendo l'API pubblica `evidenziaMarker` + `ricalcolaRouting`, dark mode opzione 1, aggiornamento docs). Smoke test manuale utente in aggiunta.

**Classificazione blast radius**: `risk:high`. Cognitive blast radius alto (renderer mappa = cuore visuale dell'app), rollback non immediato dopo bump version live, sei voci aperte da decidere prima del go.

### Voci aperte da decidere prima dell'eventuale go

1. Le tre capability (3D, rotazione, velocità) corrispondono a un bisogno utente concreto che oggi è bloccato? Quale è la singola ragione che farebbe accendere la luce verde?
2. Bundle budget: alziamo o lazy load? (Influenza la struttura della slice.)
3. Dark mode prima slice: accettabile l'opzione 1 (filtro CSS sul canvas + paint polyline scura), o si entra subito con style spec dedicati?
4. Layer switcher Vue custom: posizione del dropdown (header globale o overlay angolo della mappa)?
5. Si valuta in parallelo il passaggio a vector tile provider (MapTiler/Stadia/ProtoMaps con chiave API), o si resta su raster per la prima slice?
6. Lazy load: accettabile un piccolo spinner sopra l'area mappa al primo apertura?

## Decisione

**Non ancora presa.** Stato: `aperta`. Richiesta in attesa di interlocuzione su una o più delle sei voci sopra prima di poter consolidare lo scope. Il valore implementativo è significativo (renderer mappa) e va bilanciato con la motivazione utente, che oggi è "capability di lusso" senza un bisogno utente già articolato.

## Implementazione

Nessuna implementazione in corso.

Tracking esterno: [issue #35 su GitHub](https://github.com/AldebaranPrimo/roadbook/issues/35) (label `enhancement`, `question`, `risk:high`). La issue contiene la stessa analisi tecnica di questo file in forma più estesa; questo cassetto ne è l'eco *interno*, allineato col pattern Documentation Layout & Lifecycle del contratto rev 8 (richieste = cassetto `requests/`, non `decisions/`).
