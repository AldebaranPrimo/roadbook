# Analisi — Precaricamento offline totale al primo import di un viaggio

> Analisi di complessità della voce #5 del [TODO](../TODO.md) prima di iniziare l'implementazione.
> Output richiesto: verdetto **semplice** vs **complesso** sulla base di criteri oggettivi.
> Data: 2026-04-24.

---

## Criterio di decisione

Una slice viene considerata **semplice** se rientra in **tutti** i seguenti limiti:

- **< 300 righe di diff totali**
- **≤ 4 file toccati**
- **0 nuove dipendenze runtime**

Se uno di questi è violato, la slice va classificata **complessa** e suddivisa in più sub-slice incrementali.

---

## Requisito

Al primo accesso online dopo l'import di un nuovo viaggio, l'app deve precaricare:

1. Le **tile cartografiche** che coprono il viaggio, ai livelli di zoom utili per la consultazione offline
2. Le **foto** referenziate nei campi `punto.foto[]` dei punti
3. Il **routing OSRM** di tutte le aree (oggi viene calcolato solo all'apertura di ciascuna)

In modo che l'utente possa poi andare offline e aprire qualsiasi area senza averla preventivamente visitata.

Ulteriore requisito: la UX deve mostrare il progresso, essere annullabile e rispettare le policy dei provider (OSM in particolare vieta il bulk downloading).

---

## Scomposizione tecnica

### 1. Prefetch tile — MEDIA complessità

**Algoritmo**:

- Per ogni area, calcolare il bounding box dei suoi punti.
- Convertire il bbox in coordinate tile Slippy Map (`{ x, y, z }`) per ogni livello di zoom rilevante.
- Le formule sono note e stabili: `x = floor((lon+180)/360 · 2^z)`, `y = floor((1 − ln(tan(lat·π/180) + sec(lat·π/180))/π)/2 · 2^z)`.
- Costruire l'URL di ciascun tile per il provider attivo (template URL `{z}/{x}/{y}.png` da `PROVIDERS[...]` in `MappaLeaflet.vue`).
- `fetch()` sequenziale con pausa tra lotti (~100 ms). Il service worker Workbox intercetta e salva in `map-tiles-osm` / `map-tiles-carto` / `map-tiles-topo`.

**Scelta di default che riduce il volume**: bbox calcolato **per area** invece di un bbox unico del viaggio. Riduce a poche decine di tile per area anche a zoom profondo.

**Volumi attesi per viaggio medio** (Friuli v1, 7 aree, ognuna ~30×40 km):

| Zoom | Tile per area | Tile totali (7 aree) |
|---|---|---|
| 10 | 1 | 7 |
| 11 | 2×2 = 4 | 28 |
| 12 | 4×4 = 16 | 112 |
| 13 | 8×8 = 64 | 448 |

Range utile per camper = **zoom 10–13**: **~595 tile totali**. A ~30 KB/tile = **~18 MB** (una tantum, una sola volta nella vita del viaggio su quel device).

**Complessità di codice**: ~60 righe in una nuova utility `src/utils/prefetch-offline.js`.

### 2. Prefetch foto — BASSA complessità

**Algoritmo**:

- Iterare `viaggio.aree[].punti[].foto[]` e raccogliere tutti gli URL univoci.
- `fetch()` parallelo (max 3–4 concurrent) con `Promise.allSettled`.
- Il service worker Workbox salva in una nuova cache runtime per le immagini.

**Volumi attesi**: dipendono dal JSON. Per il Friuli attuale (v1) non ci sono foto, quindi 0. Per JSON futuri con 1–3 foto per punto da ~200 KB ciascuna → 30 punti × 2 foto × 200 KB = ~12 MB.

**Complessità di codice**: ~20 righe per la raccolta + fetch.

**Cambio SW necessario**: +1 pattern `runtimeCaching` in `vite.config.js` per URL `image/*` (o più permissivo: qualsiasi hostname non in blacklist). Rischio: la cache delle immagini può crescere molto; va limitata con `expiration: { maxEntries: 500, maxAgeSeconds: 60*60*24*90 }`.

### 3. Prefetch routing — TRIVIAL

**Algoritmo**:

```js
for (const area of viaggio.aree) {
  await ottieniPercorso({ viaggioId, areaId: area.id, punti: area.punti, modalita })
}
```

Usa infrastruttura esistente (`src/utils/routing-osrm.js`), la cache è già persistente in IndexedDB, la funzione gestisce già timeout e fallback.

**Complessità di codice**: ~5 righe.

### 4. UI di progresso — MEDIA complessità

**Scope**:

- Bottone "Prepara per uso offline" nel modal Info (sezione dedicata).
- Modale di progresso con 3 barre (tile / foto / routing) + conteggio live + bottone annulla.
- Se l'utente chiude il modal durante il prefetch, il processo continua in background (promise non cancellata automaticamente) e si aggiorna solo un toast discreto.
- Stato globale del prefetch gestito in un composable `usePrefetchOffline` per poter essere osservato da più componenti.

**Complessità di codice**: ~100 righe tra composable + componente modale.

### 5. Persistenza stato — TRIVIAL

- Flag `preferenze.prefetchCompletato:<viaggioId>` in IndexedDB per sapere se un viaggio ha già fatto prefetch. Quando l'utente riapre un viaggio già prefetchato → nessun prompt automatico.
- L'utente può sempre ripetere il prefetch manualmente dal modal Info ("Ripeti prefetch").

**Complessità di codice**: ~10 righe.

---

## Policy dei provider di tile

### OpenStreetMap standard ([policy ufficiale](https://operations.osmfoundation.org/policies/tiles/))

> *"Heavy use (e.g. distributing an app that uses tiles from www.openstreetmap.org) is forbidden without prior permission."*
> *"OSMF operates these tile servers on a shoestring budget. Avoid usage patterns that impact server load unnecessarily."*

Limiti desunti dalla community:

- **≤ 2 thread contemporanei** per client
- **No bulk downloading** (pattern che aspirano grandi regioni a alta risoluzione)
- **User-Agent realistico** (non generico, deve identificare l'app)

**Il nostro caso d'uso** con zoom max 13 e ~600 tile una tantum per viaggio è sulla soglia del "accettabile" — non è bulk downloading in senso tecnico (nessun tool come JOSM), è un utente singolo che scarica una volta la propria area di viaggio. Ma è un **caso di frontiera**, da documentare esplicitamente e con throttling conservativo.

**Raccomandazione**: zoom max 12 per il prefetch automatico (Friuli → ~147 tile totali, ~4 MB), con avviso all'utente *"lo zoom 13+ verrà scaricato on-demand durante la navigazione"*. Zoom 13 solo su conferma esplicita dell'utente con un messaggio che spiega la policy.

### CartoDB ([policy](https://carto.com/attributions/))

Meno restrittiva di OSM. Nessun rate limit dichiarato per uso non-commerciale. Prefetch a zoom 13 dovrebbe essere sicuro.

### OpenTopoMap ([policy](https://opentopomap.org/credits.php))

Simile a OSM, gestita da volontari. Raccomandato uso moderato.

### Rischio complessivo

**Medio-basso**: 600 tile una tantum per utente, spalmati su 10 secondi di throttling, sono trascurabili rispetto al traffico aggregato dei tile server. L'app **non deve** eseguire prefetch periodicamente né in background: è one-shot per `viaggio.id`.

---

## Stima file toccati

| File | Tipo | Righe stimate |
|---|---|---|
| `src/utils/prefetch-offline.js` | **nuovo** | 90 (slippy coords + fetch throttled + raccolta URL foto + orchestrator) |
| `src/composables/usePrefetchOffline.js` | **nuovo** | 60 (stato reattivo condiviso + avvio/annulla) |
| `src/components/ModalInfo.vue` | modifica | 25 (sezione "Uso offline" con bottone + progresso compatto) |
| `src/App.vue` | modifica | 15 (wiring, niente di complesso) |
| `vite.config.js` | modifica | 8 (pattern runtime caching per immagini) |

**Totale**: 5 file, ~198 righe.

---

## Verdetto

| Criterio | Soglia | Stima | Esito |
|---|---|---|---|
| Righe totali | < 300 | ~198 | ✅ |
| File toccati | ≤ 4 | **5** | ⚠ oltre la soglia di 1 |
| Nuove dipendenze | 0 | 0 | ✅ |

**Risultato**: i due nuovi file (`prefetch-offline.js` + `usePrefetchOffline.js`) spingono il conteggio a 5 file. Se si accorpa il composable dentro l'utility (un singolo file `prefetch-offline.js` che esporta sia le funzioni pure sia lo stato reattivo), si torna a **4 file** rientrando esattamente nella soglia di "semplice".

### Verdetto finale: **SEMPLICE**, con la seguente condizione architetturale

La slice implementativa va strutturata così:

- **UN solo file nuovo** `src/utils/prefetch-offline.js` che espone:
  - `avviaPrefetch(viaggio, providerId)` → promise che risolve quando completato, rigettata se annullata
  - `annulla()` → interrompe il prefetch in corso
  - `statoPrefetch` → ref Vue condiviso con avanzamento (`{ tileFatti, tileTotali, fotoFatte, fotoTotali, routingFatti, routingTotali, inCorso, annullato }`)
- Modifiche minimali a `ModalInfo.vue`, `App.vue`, `vite.config.js` come previsto.

Con questa condizione: **4 file, ~198 righe, 0 nuove dipendenze → rientra nei criteri di "semplice"**.

### Prossime azioni consigliate

1. Mergiare la PR di questa analisi per fissarne il contenuto.
2. Aprire slice `ai/feat/prefetch-offline` separata, implementativa, da `develop` aggiornato. Rischio dichiarato: `risk:medium` (volume dati, UX del progresso, policy OSM da rispettare).
3. Nella implementazione, default zoom 12 + opzione zoom 13 con conferma utente, come raccomandato sopra.

---

## Appendice — Decisioni lasciate alla slice implementativa

Queste sono scelte minori che non influiscono sul verdetto di complessità:

- **Trigger del prefetch**: manuale via bottone nel modal Info (default). L'auto-prefetch al primo import è un incremento v1.x, fuori scope.
- **Modalità di esecuzione**: sequenziale per i tile (rispetto policy), parallelo limitato per le foto (3-4 thread), sequenziale per il routing (bassa priorità).
- **Feedback d'errore**: se un tile / foto fallisce, lo loggaremo ma non interromperemo — l'utente può riprovare singole aree con "Ricalcola percorso" (per routing) e navigando (per tile/foto mancanti).
- **Priorità di caricamento**: routing prima, poi tile, poi foto — il routing è il dato più critico per il caso d'uso offline.
