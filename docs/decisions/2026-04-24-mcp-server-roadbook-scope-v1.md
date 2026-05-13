# Decisione — Scope v1 del MCP server `roadbook-mcp`

> **Data**: 2026-04-24
> **Stato**: aperta — riconfermato come "opzione A" dall'analisi di fattibilità del [2026-04-28](2026-04-28-mcp-apps-fattibilita-scope.md), in attesa di scelta finale tra A / B / C.
> **Slice referente**: voce TODO #3 "MCP server Roadbook per integrazione con Claude (nuovo repo `roadbook-mcp`)".

---

## Stato

**aperta**. Il documento descrive lo scope iniziale di `roadbook-mcp` v1.0 basato sul pattern URL-payload + apertura tab esterna. L'analisi di fattibilità del 28 aprile ([`2026-04-28-mcp-apps-fattibilita-scope.md`](2026-04-28-mcp-apps-fattibilita-scope.md)) ha introdotto due opzioni alternative (B = MCP App con UI bundled inline, C = ibrida A+B); ad oggi nessuna decisione finale è stata presa.

L'opzione A descritta qui resta la **raccomandazione corrente** per la v1.0 nella fattibilità del 28 aprile. Se la scelta finale sarà l'opzione B, questo documento diventerà *superata-da: [2026-04-28-mcp-apps-fattibilita-scope.md](2026-04-28-mcp-apps-fattibilita-scope.md)* in modo esplicito.

## Situazione

Si vuole permettere a un utente che lavora a un itinerario in conversazione con Claude (Desktop o Web) di **vedere in anteprima** il viaggio sulla PWA Roadbook, senza intermediari ad alto costo (no backend, no storage, no hosting custom). Il viaggio JSON è già la fonte unica di verità di Roadbook.

Vincoli:

- **No nuove dipendenze hosting**: nessun server custom da mantenere, nessun database.
- **Compatibilità Claude Desktop** come bersaglio v1.0; Claude Web rinviato a v1.1.
- **Coerenza stack** con Roadbook: Node 22+, JavaScript puro (no TS), italiano per commenti / log / errori, slice-driven scale `solo` + `mvp`.
- **Soglie tecniche browser** sulle dimensioni URL: la PWA viene aperta via link, quindi il payload viaggia interamente nell'URL. Soglia conservativa indicativa 30 KB.

Alternative considerate:

- **A — URL-payload + tab esterna** (questa decisione): server MCP stdio, tool `visualizza_itinerario` che ritorna URL `?viaggio_data=<base64url>` cliccabile. La PWA aperta in nuova tab decodifica e importa.
- **B — MCP App con UI bundled inline**: ufficializzata dall'analisi del 28 aprile, non disponibile al momento di questa decisione.
- **C — Ibrida A+B**: A + B come due tool dello stesso server MCP.

## Scelta

**Opzione A**: server MCP `roadbook-mcp` come repo nuovo, con un'unica tool `visualizza_itinerario` che codifica il JSON in base64url e restituisce un link cliccabile alla PWA Roadbook pubblica con parametro `?viaggio_data=`. La PWA viene estesa con una slice additiva minima per riconoscere il nuovo parametro URL.

Articolazione:

1. **Server MCP stdio** in `roadbook-mcp` (nuovo repo) con un'unica tool e validazione lightweight.
2. **Codifica base64url** del JSON compatto, costruzione URL come `${BASE_URL}?viaggio_data=<encoded>`.
3. **Soglie URL**: < 16 KB ok silente; 16-30 KB ok con menzione dimensione; 30-60 KB warning esplicito; > 60 KB rifiutare con suggerimento di split.
4. **Modifica additiva alla PWA Roadbook**: gestione del parametro `?viaggio_data` in `App.vue` (decodifica → validatore esistente → import in IndexedDB → `history.replaceState` per pulizia URL). Slice separata, `risk:medium`.
5. **Trasporto stdio solo** in v1.0, Claude Web rinviato a v1.1 con secondo entry point HTTP/SSE.

## Conseguenze

**Positive**:

- Costo zero: nessun hosting, nessun database, niente da mantenere oltre al repo MCP locale.
- Tempo di realizzazione ~1 settimana.
- Niente sync bidirezionale: il payload viaggia end-to-end nell'URL, no stato server-side.
- L'utente conserva il pattern atteso di import (file/URL/drag&drop), il nuovo parametro è un'aggiunta non disruttiva.
- Architettura predisposta per evoluzione: v1.1 aggiunge solo trasporto HTTP/SSE sopra lo stesso core; v1.2 aggiunge compressione.

**Negative / vincoli introdotti**:

- **Cambio di contesto utente**: la verifica visiva avviene in tab browser separata, non inline nella chat. Friction su flussi iterativi rapidi ("modifica, vedi, modifica, vedi").
- **Soglia URL ~30 KB**: itinerari grandi (centinaia di punti, descrizioni lunghe, foto inline) potrebbero superare le soglie pratiche dei browser. Mitigation: warning espliciti + soglia hard a 60 KB.
- **Re-import manuale**: il viaggio modificato in chat va re-importato a mano nella PWA del device dell'utente per l'uso sul campo (camper, offline). Con la voce TODO #2 "Login social" si avrà sync automatico, qui no.
- **Disallineamento validatori**: la validazione minima del MCP duplica logica della PWA. v2 prevede estrazione del validatore come pacchetto NPM condiviso.

**Decisioni rinviate / domande aperte**:

1. Nome ufficiale del parametro: `viaggio_data` (proposto) vs `viaggio_b64` / `payload`.
2. Ciclo di vita del viaggio importato via `viaggio_data`: import regolare persistente (proposto) o anteprima temporanea?
3. `viaggio.id` già presente nel device: prompt overwrite (proposto, riusa flusso esistente) o auto-overwrite?
4. Validazione empirica delle soglie 16/30/60 KB sui browser target reali.

---

## Documento esteso

> Quanto segue è il contenuto integrale del progetto v1.0 redatto il 2026-04-24 come handover a Claude Code per lo sviluppo del nuovo repo `roadbook-mcp`. La sezione canonica sopra è la **versione vincolante** per future slice; questa appendice è la spec tecnica completa.

### Sintesi (originale)

Costruire un MCP server che fa una cosa sola: ricevere un itinerario JSON conforme allo schema Roadbook v1.0 e restituire un URL cliccabile che apre il visualizer Roadbook nel browser, con l'itinerario precaricato.

**Flusso utente target**:

1. L'utente esporta un viaggio dall'app Roadbook (file JSON).
2. Lo carica nella conversazione Claude.
3. Chiede modifiche al modello (aggiungi sosta, sposta tappa, ecc.).
4. Claude rigenera il JSON aggiornato.
5. Claude chiama la tool MCP `visualizza_itinerario` con il nuovo JSON.
6. La tool risponde con un link cliccabile.
7. Un click apre una tab sul visualizer Roadbook con l'itinerario modificato.
8. L'utente verifica visivamente, itera se serve, e a fine sessione reimporta il JSON definitivo nella sua installazione di Roadbook per l'uso sul campo (camper, offline).

Niente sync bidirezionale, niente push, niente storage server-side. Il payload viaggia end-to-end nell'URL del browser.

### Scope v1, cosa è dentro

- Una sola tool MCP: `visualizza_itinerario`.
- Validazione minima del JSON lato MCP (campi top-level obbligatori, schema_version corretto).
- Codifica del JSON in base64url, costruzione di un URL della PWA con parametro `?viaggio_data=<base64url>`.
- Trasporto stdio. Installabile in Claude Desktop.
- Una piccola modifica additiva alla PWA per riconoscere il nuovo parametro URL.

### Scope v1, cosa è fuori (rinviato)

- Trasporto HTTP/SSE per Claude Web. Verrà aggiunto in v1.1 come secondo entry point sopra lo stesso core, senza ridisegnare.
- Validazione approfondita lato MCP. La PWA ha già `src/utils/valida-schema.js`, deleghiamo a lei la validazione completa.
- Compressione del payload (lz-string, gzip+base64) per itinerari oltre i ~30 KB. In v1 emettiamo warning sopra una soglia.
- Tool aggiuntivi (`valida_itinerario`, `ottieni_schema`).
- Anteprima inline dentro Claude Desktop. Non c'è oggi un meccanismo affidabile cross-versione, accettiamo l'apertura tab esterna.
- Telemetria, error tracking.

### Architettura

```
[Claude Desktop]
      |
      | stdio (MCP protocol)
      v
[roadbook-mcp server]
      |
      | output: URL cliccabile
      v
[Browser dell'utente]
      |
      | apre nuova tab
      v
[Roadbook PWA pubblica]
  https://aldebaranprimo.github.io/roadbook/?viaggio_data=<base64url>
      |
      | decodifica base64url -> JSON
      | valida con valida-schema.js
      | importa in IndexedDB
      v
[Visualizer renderizza l'itinerario]
```

L'MCP non comunica con la PWA. Non c'è un server di hosting intermedio. Niente database, niente storage stateful.

### Stack

- **Node.js 22+** (allineato al runtime di Roadbook).
- **JavaScript puro** (no TypeScript), per coerenza con Roadbook.
- **@modelcontextprotocol/sdk** per il server MCP. Riferimento: `https://github.com/modelcontextprotocol/typescript-sdk` (esiste anche una variante JS, controllare la versione corrente al momento dell'implementazione).
- Lingua di commenti, log, messaggi di errore restituiti all'utente: **italiano**.
- Nessun'altra dipendenza runtime in v1.

### Struttura del repo `roadbook-mcp`

```
roadbook-mcp/
├── package.json
├── README.md             istruzioni installazione + config Claude Desktop
├── CLAUDE.md             contratto repo (vedi sezione dedicata sotto)
├── src/
│   ├── server.js         entry stdio, registra la tool
│   ├── tool/
│   │   └── visualizza-itinerario.js    handler della tool
│   ├── valida/
│   │   └── valida-minimo.js            validazione lightweight
│   └── url/
│       └── codifica.js                 base64url + costruzione URL
└── test/
    └── manuale.md        checklist smoke test
```

### La tool MCP

**Nome**: `visualizza_itinerario`

**Descrizione (per il modello, in inglese perché è quella che il LLM legge per decidere quando chiamarla)**:

> "Takes a Roadbook v1.0 itinerary JSON and returns a clickable URL that opens the Roadbook visualizer in the user's browser, pre-loaded with the itinerary. Use this when the user wants to view, preview, or visualize a travel itinerary on a map. The itinerary must conform to the Roadbook JSON schema v1.0 (with $schema_version, viaggio, categorie, aree fields)."

**Input schema**:

```json
{
  "type": "object",
  "properties": {
    "itinerario": {
      "type": "object",
      "description": "Oggetto JSON dell'itinerario, conforme allo schema Roadbook v1.0. Deve contenere almeno $schema_version, viaggio.id, viaggio.titolo, e un array aree non vuoto."
    }
  },
  "required": ["itinerario"]
}
```

**Output**: testo Markdown con il link cliccabile e un mini-riepilogo. Esempio caso happy:

```
✅ Itinerario "Friuli e Slovenia 2026" validato.
   3 aree, 12 punti, schema v1.0.

🗺️ [Apri in Roadbook](https://aldebaranprimo.github.io/roadbook/?viaggio_data=...)

(Dimensione URL: 8.4 KB)
```

Esempio caso errore di validazione:

```
❌ Itinerario non valido:
- Manca campo obbligatorio: viaggio.id
- aree[1].punti[3] non ha lat

Correggere il JSON e riprovare.
```

Esempio caso URL troppo grande:

```
⚠️ Itinerario molto grande (URL risultante: 47 KB).
Alcuni browser potrebbero rifiutare URL così lunghi.
Consiglio: splittare in più viaggi o rimuovere campi descrittivi pesanti (foto inline, descrizioni lunghe).

🗺️ [Apri comunque](https://aldebaranprimo.github.io/roadbook/?viaggio_data=...)
```

### Validazione lato MCP

Lightweight, solo fail-fast. La PWA fa la validazione completa al caricamento.

Controlli obbligatori in `valida-minimo.js`:

- Input è un object non null.
- `$schema_version === "1.0"`.
- `viaggio` esiste, `viaggio.id` stringa non vuota, `viaggio.titolo` stringa non vuota.
- `aree` è un array non vuoto.
- Per ogni area: `id` presente, `nome` stringa non vuota, `punti` array (può essere vuoto).
- Per ogni punto: `n` presente, `name` stringa, `lat` e `lon` numerici e nei range geografici validi (`-90 ≤ lat ≤ 90`, `-180 ≤ lon ≤ 180`).

Tutto il resto (categorie, formati specifici, campi opzionali, deep linking) viene gestito dalla PWA. Se il JSON passa la validazione minima ma poi la PWA lo rifiuta, l'utente vedrà l'errore nella PWA stessa.

Restituire una struttura del tipo:

```js
{
  valido: boolean,
  errori: string[],     // messaggi in italiano, lista vuota se valido
  riepilogo: {          // solo se valido
    titolo: string,
    numeroAree: number,
    numeroPunti: number,
    schemaVersion: string
  }
}
```

### Codifica URL

Tre passi in `codifica.js`:

1. `JSON.stringify(itinerario)` compatto (no whitespace, niente argomenti `space`).
2. Base64url-encode della stringa UTF-8: stesso alfabeto base64 ma `+` → `-`, `/` → `_`, niente padding `=`.
3. Costruzione URL: `${BASE_URL}?viaggio_data=${encoded}`.

`BASE_URL`:

- Default: `https://aldebaranprimo.github.io/roadbook/`.
- Configurabile via env var `ROADBOOK_BASE_URL` per test locale, es. `http://localhost:4173/roadbook/`.

**Soglie di dimensione URL** (lunghezza totale, non solo del parametro):

- `< 16 KB`: ok, nessun avviso.
- `16-30 KB`: ok ma menzionare la dimensione nell'output.
- `30-60 KB`: warning esplicito, link comunque generato.
- `> 60 KB`: rifiutare, suggerire split o rimozione campi pesanti.

Nessuna compressione in v1.

### Modifiche alla PWA Roadbook

Slice separata sul repo `roadbook`, da committare come slice indipendente. Tipo: `feature`, su `App.vue` (l'entry che gestisce il routing iniziale) e `ModalCaricaViaggio.vue` se serve. Risk: medium (input nuovo dall'esterno, ma additivo).

Comportamento desiderato all'avvio dell'app:

- Se `?viaggio` (URL fetch) presente: comportamento esistente, invariato.
- Se `?viaggio_data` (base64url inline) presente:
  1. Decodifica base64url → stringa JSON → `JSON.parse`. Se decodifica fallisce, mostrare errore via `ModalCaricaViaggio` con messaggio "Payload URL non decodificabile".
  2. Passa al validatore esistente (`src/utils/valida-schema.js`) come qualsiasi altro JSON.
  3. Se valido, importare in IndexedDB tramite `store-viaggi.js`. Riusare il flusso di import esistente, inclusa la gestione overwrite per `viaggio.id` già presente.
  4. Se invalido, aprire `ModalCaricaViaggio` con gli errori del validatore.
  5. **Pulire il parametro dalla URL** con `history.replaceState(null, '', window.location.pathname)`. Evita reimport accidentali al refresh della pagina.
- Se entrambi `?viaggio` e `?viaggio_data` presenti: `?viaggio` ha precedenza, `?viaggio_data` ignorato con un `console.warn`.

Questa modifica è additiva, non rompe nulla, non richiede migrazioni di storage. Aggiornare `STATO-PROGETTO.md` (o `docs/STATO-PROGETTO.md`) e il `CHANGELOG.md` di Roadbook con una voce sotto v1.x.

### Configurazione Claude Desktop

Da documentare nel `README.md` del repo `roadbook-mcp`.

Su Windows, l'utente aggiunge a `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "roadbook": {
      "command": "node",
      "args": ["C:\\path\\to\\roadbook-mcp\\src\\server.js"]
    }
  }
}
```

Restart Claude Desktop. La tool diventa disponibile.

### Test plan v1

Manuale, allineato alla scale `solo`. Documentare in `test/manuale.md`.

1. **Smoke test del server isolato**:
   - `node src/server.js` parte senza errori.
   - Inviare manualmente un `initialize` MCP via stdin, verificare risposta.
   - Inviare `tools/list`, verificare che ritorni `visualizza_itinerario`.

2. **Test della tool con JSON valido**:
   - Usare l'itinerario di esempio Friuli 2026 di Roadbook (`public/viaggi/viaggio-friuli-2026.json`).
   - Verificare: URL prodotto, dimensione, decodificabilità del base64url.

3. **Test della tool con JSON invalido**:
   - Casi: `$schema_version` mancante, `aree` non-array, punto senza `lat`, `lon` fuori range, intero JSON malformato.
   - Verificare messaggi di errore in italiano e formato output coerente.

4. **Test E2E con PWA in locale**:
   - Roadbook in `npm run preview` su `http://localhost:4173/roadbook/`.
   - `ROADBOOK_BASE_URL=http://localhost:4173/roadbook/ node src/server.js`.
   - Generare URL, aprirlo nel browser, verificare import e visualizzazione.

5. **Test integrazione Claude Desktop**:
   - Configurazione MCP, restart Claude Desktop.
   - Conversazione: "ecco un itinerario, mostramelo" + paste del JSON.
   - Verificare che Claude chiami la tool, riceva l'URL, lo presenti come link cliccabile.
   - Click sul link, verificare apertura tab e visualizzazione.

### Contratto repo (`CLAUDE.md` da scrivere come prima slice)

Anche se il MCP è un repo nuovo e non rientra nella famiglia "Vue 3 standalone" coperta da `CLAUDE-vue-app.md`, segue principi analoghi:

- **Scale**: `solo` + `mvp`.
- **No test automatici** in v1, smoke test manuale documentato.
- **Slice-driven**: ogni modifica è una slice atomica.
- **No nuove dipendenze runtime** oltre a `@modelcontextprotocol/sdk` senza task dedicato.
- **Nessun secret committato**, nessuna chiave API.
- **Lingua di codice, commenti, errori, log: italiano** (eccetto descrizioni tool destinate al modello, che restano in inglese per massimizzare la qualità dell'inferenza).
- **No bypass di hook** con `--no-verify`.
- **Branching**: `main` come unico branch in v1 (scale `solo` + nessun deploy automatico). Promuovere a `develop` + `main` se/quando il repo passerà a `piccolo-team`.

Quando il repo crescerà, valutare se derivare un nuovo contratto di famiglia `CLAUDE-mcp-server.md` analogo a quello Vue.

### Domande aperte da risolvere prima di iniziare o durante v1

1. **Nome ufficiale del nuovo parametro URL della PWA**: `viaggio_data` (proposto, coerente con `viaggio` esistente) o alternative tipo `viaggio_b64`, `payload`. Decidere prima di toccare la PWA.

2. **Ciclo di vita del viaggio importato via `viaggio_data`**: importato come viaggio regolare e persistente (visibile in lista, sopravvive alla chiusura) oppure marcato come "anteprima" temporanea da confermare? Per v1 propongo import normale, semplifica e rispecchia il comportamento di `?viaggio`.

3. **`viaggio.id` già presente nel device**: prompt overwrite (comportamento esistente per altri import) o auto-overwrite con warning? Propongo lasciare il prompt esistente, è il comportamento atteso dell'utente.

4. **Test manuale di soglie URL**: validare empiricamente i limiti reali su Chrome / Edge / Safari per Windows e Android prima di fissare le soglie 16/30/60 KB. I numeri proposti sono conservativi.

### Roadmap suggerita post-v1

- **v1.1**: aggiunta del trasporto HTTP/SSE per Claude Web. Stesso core, secondo entry point sopra lo stesso handler della tool. Richiede hosting (Cloudflare Worker o simile).
- **v1.2**: compressione del payload (lz-string) per itinerari grossi. Estende le soglie utili a 100+ KB di JSON sorgente.
- **v1.3**: tool `valida_itinerario` standalone, senza generare URL. Utile per cicli di "Claude scrive il JSON e vuole sapere se passa la validazione" senza ancora aprire il browser.
- **v2**: estrazione del validatore della PWA in pacchetto NPM condiviso, importato sia da Roadbook sia da `roadbook-mcp`. Elimina la duplicazione e rende la validazione del MCP completa quanto quella della PWA.

### Ordine di esecuzione consigliato

Per Claude Code, slice nell'ordine:

1. Scaffold del repo `roadbook-mcp` con `package.json`, `README.md` (placeholder), `CLAUDE.md`.
2. `valida-minimo.js` con i controlli minimi e suite di esempi inline.
3. `codifica.js` con base64url e costruzione URL.
4. `tool/visualizza-itinerario.js` che orchestra valida + codifica + format dell'output.
5. `server.js` stdio, registrazione tool.
6. Smoke test manuale del server in isolamento.
7. Slice sulla PWA Roadbook: aggiunta gestione `?viaggio_data` in `App.vue`.
8. Test E2E in locale.
9. `README.md` finale con istruzioni installazione + configurazione Claude Desktop.
10. Test integrazione Claude Desktop.

Ogni slice committata separatamente.
