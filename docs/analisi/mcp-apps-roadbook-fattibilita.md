# MCP Apps — Analisi di fattibilità per Roadbook

**Data**: 2026-04-28
**Stato**: bozza, in attesa di decisione di scope per la voce TODO #3 (MCP server `roadbook-mcp`).
**Autore**: analisi tecnica preparatoria, non un piano implementativo definitivo.
**Riferimenti**:
- [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md) — analisi precedente del task #3 (MCP stdio + URL-payload).
- Microsoft Tech Community, *Build and Host MCP Apps on Azure App Service*, 8 aprile 2026 ([URL](https://techcommunity.microsoft.com/blog/appsonazureblog/build-and-host-mcp-apps-on-azure-app-service/4509705)).
- [Specifica MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) (estensione di Model Context Protocol).
- [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps) — SDK lato frontend.
- Esempio di riferimento: [`seligj95/app-service-mcp-app-sample`](https://github.com/seligj95/app-service-mcp-app-sample).

---

## Sommario

L'estensione **MCP Apps** consente a un server MCP di esporre, oltre ai tool, **risorse UI** (HTML/JS/CSS) che il client chat (VS Code Copilot, Claude, ChatGPT) renderizza in iframe sandbox direttamente nella conversazione. Per il task #3 (`roadbook-mcp`) questo apre una via alternativa al disegno v1 esistente, basato su URL-payload e apertura di una nuova tab del browser sulla PWA Roadbook.

L'analisi confronta tre opzioni di design — URL-payload (v1 esistente), MCP App con UI bundled inline, ibrida — sui parametri di costo implementativo, dipendenze infrastrutturali, esperienza utente, e maturità del supporto host. Il documento si conclude con una raccomandazione e una lista di decisioni necessarie prima di procedere.

L'analisi non sostituisce la decisione di scope, la prepara: serve all'utente per scegliere se mantenere l'opzione A, sostituirla con B, o evolvere verso C.

---

## Contesto

### Cosa è MCP Apps in pratica

L'estensione introduce due meccanismi sopra il protocollo MCP base:

1. **Risorse UI registrate dal server**, identificate da URI tipo `ui://<nome>/index.html` e servite con MIME `text/html;profile=mcp-app`. Sono pacchetti HTML autoconsistenti (HTML+CSS+JS in un singolo file).
2. **Metadati `_meta.ui.resourceUri` sui tool**, che indirizzano l'host a renderizzare la risorsa associata in iframe sandbox quando il tool viene invocato. Il risultato del tool viene passato all'iframe via `postMessage`, gestito dall'SDK `@modelcontextprotocol/ext-apps` lato frontend.

L'host mostra l'iframe inline nella conversazione, l'utente non lascia mai la chat. L'iframe gestisce eventi standard come cambio tema (`onhostcontextchanged`).

### Cosa cambia rispetto al disegno v1

L'analisi v1 (vedere [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md)) prevede:

- Server MCP via trasporto stdio.
- Tool `visualizza_itinerario` che valida il JSON e ritorna un URL `https://AldebaranPrimo.github.io/roadbook/?viaggio_data=<base64url>` cliccabile.
- L'utente clicca il link, il browser apre una nuova tab sulla PWA pubblica, la PWA decodifica il payload e mostra il viaggio.
- Nessun hosting server-side, niente storage stateful.

MCP Apps offre un'alternativa qualitativamente diversa:

- Anteprima del viaggio **inline nella chat**, non in una tab esterna.
- Richiede che il server MCP sia **raggiungibile via HTTP** dal client chat (per servire la risorsa UI). Stdio puro non basta più.
- Richiede di costruire un **bundle UI dedicato** all'iframe (è ragionevole farlo a partire dalla codebase Roadbook esistente, ma con vincoli specifici).

---

## Le tre opzioni di design

### Opzione A — URL-payload + tab esterna (v1 esistente)

Il disegno descritto in [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md). Server MCP stdio, tool che genera URL, browser che apre tab sulla PWA pubblica.

**Punti di forza**:
- Nessun hosting richiesto, nessun costo ricorrente.
- Riusa la PWA Roadbook esistente in toto, senza duplicazione.
- Indipendente dal supporto host MCP Apps: funziona su qualunque client MCP capace di rendere link cliccabili (oggi tutti i principali: Claude Desktop, VS Code Copilot, Cline, ecc.).
- Implementazione contenuta (~1 settimana stimata).

**Punti deboli**:
- L'utente lascia la chat per andare nel browser. Cambio di contesto.
- Limite di lunghezza URL (pratico ~30 KB, oltre suggerimento split). Itinerari grossi richiedono compressione (rinviata a v1.2).
- Nessun feedback visivo del viaggio nella chat: l'utente clicca un link e si apre una tab, ma in chat resta solo il link e un mini-riepilogo testuale.

### Opzione B — MCP App con UI bundled inline

Il server MCP espone una risorsa UI bundled (singolo file HTML con tutto il rendering Roadbook inline) e un tool `anteprima_itinerario` con `_meta.ui.resourceUri` che attiva il render in iframe.

Il flusso: l'utente passa il JSON in chat, Claude chiama il tool, l'host renderizza l'iframe inline, dentro l'iframe gira un'app Vue/Leaflet semplificata che mostra il viaggio. Tutto dentro la conversazione.

**Punti di forza**:
- Anteprima inline, niente cambio di contesto.
- Nessun limite di payload URL: il JSON viaggia nel risultato del tool, l'iframe lo riceve via postMessage. Itinerari di qualunque dimensione.
- L'host fornisce hint di tema (light/dark), l'iframe può adattarsi automaticamente.
- Il rendering è sempre allineato con la versione del server MCP, senza dipendere dalla cache PWA dell'utente.

**Punti deboli**:
- Richiede **hosting server-side** sempre raggiungibile (Azure App Service, Azure Functions, Cloudflare Workers, Vercel, fly.io, container su VPS, ecc.). Costo ricorrente o quota free con limiti.
- Richiede un **bundle UI separato dalla PWA**, ottimizzato per iframe (no service worker, no IndexedDB persistente, no link a navigatori esterni del device se l'iframe non li supporta, layout adattato a viewport tipici di chat).
- Dipende dal **supporto MCP Apps lato host**. L'estensione è recente (specifica pubblicata pochi mesi fa, articolo Microsoft di aprile 2026): il supporto è in evoluzione e potrebbe variare per versione di Claude Desktop / VS Code / ChatGPT.
- Vincoli iframe sandbox: alcune feature potrebbero essere bloccate da CSP dell'host (fetch verso CDN tile, IndexedDB persistente, geolocalizzazione utente). Vanno testate caso per caso.
- Il viaggio "anteprima inline" non è persistente: chiusa la chat scompare. Il salvataggio definitivo nella PWA Roadbook utente richiede comunque un canale separato (cfr. opzione C).

### Opzione C — Ibrida (A + B coesistenti)

Due tool nello stesso server MCP:

- `anteprima_itinerario` (MCP App): mostra il viaggio inline nella chat per consultazione e iterazione veloce.
- `apri_in_roadbook` (URL-payload): genera un link cliccabile per importare il viaggio nella PWA Roadbook installata sul device dell'utente, per uso sul campo (camper, offline, ecc.).

I due tool coprono due esigenze distinte:
- L'anteprima inline serve durante la conversazione di pianificazione, per vedere come viene il viaggio mentre lo si modifica.
- Il link URL-payload serve a fine sessione, quando il viaggio è pronto e va spostato sul device per l'uso reale.

**Punti di forza**:
- Massima copertura UX.
- Degradazione graceful: se l'host chat non supporta MCP Apps, `anteprima_itinerario` fallisce ma `apri_in_roadbook` resta utilizzabile.

**Punti deboli**:
- Doppio costo implementativo (sostanzialmente A + B).
- Richiede comunque hosting per la parte MCP App.
- Logica di scelta tra i due tool delegata al modello: il prompt di descrizione tool va curato perché il modello capisca quando usare l'uno o l'altro.

---

## Vincoli tecnici di MCP Apps applicati a Roadbook

### Bundling dell'UI

L'esempio Microsoft usa `vite-plugin-singlefile` per produrre un singolo HTML autoconsistente. Stato attuale di Roadbook (v1.1.6, 2026-04-27):

- Bundle JS: 273 KB / 90 KB gzip.
- Bundle CSS: 35 KB / 11 KB gzip.
- HTML: 0.6 KB.
- Asset esterni: tile mappa (CartoDB, OpenStreetMap, OpenTopoMap), routing OSRM, icone PWA. Non bundled.

Un bundle singleFile per MCP App produrrebbe approssimativamente **un HTML da 310-330 KB** (testo+JS+CSS senza gzip dato che inline). È una dimensione gestibile — l'esempio Microsoft è di ordine simile per il weather widget.

### Funzionalità da rimuovere o adattare nel bundle MCP App

| Feature PWA | Comportamento in MCP App |
|---|---|
| Service worker / offline | **Da rimuovere**. L'iframe sandbox in genere non registra SW. Il viaggio è anteprima inline, non c'è caso d'uso offline. |
| IndexedDB persistente | **Da rimuovere**. Il viaggio arriva via postMessage dall'host, non si persiste tra sessioni. |
| Toast aggiornamento PWA | **Da rimuovere**. Non rilevante. |
| Modal "Carica viaggio" (file picker / drag&drop / URL) | **Da rimuovere**. L'unico ingresso è il payload via postMessage. |
| Selettore stile mappa con 5 provider | **Da semplificare** a un singolo provider (probabilmente OSM standard) per ridurre il bundle e semplificare cache. |
| Bottoni "Cambia viaggio" / "Carica viaggio" / GitHub | **Da rimuovere**. Il contesto chat non li giustifica. |
| Tema chiaro/scuro persistito | **Da legare a `onhostcontextchanged`** dell'SDK `ext-apps` invece che a una preferenza utente locale. L'host dice quale tema, l'iframe si adatta. |
| Stampa | **Non rilevante** in iframe chat. |
| Note personali e stato visitato | **Da decidere**: ha senso permettere all'utente di prendere appunti su un'anteprima effimera? Forse no in v1. |
| Deep link a navigatori esterni | **Da decidere**: l'iframe può aprire link `geo:` / `maps://`? In genere sì se la sandbox lo consente, ma da verificare. |

Quel che resta è il core del visualizzatore: tab aree, mappa Leaflet con marker, lista descrittiva dei punti, sync bidirezionale lista ↔ mappa, percorso reale OSRM con cache **in-memory** anziché IndexedDB. Probabilmente il bundle MCP App pesa di meno della PWA piena (meno ~20-30 KB).

### Tile mappa e fetch esterni

Roadbook fetch tile da `tile.openstreetmap.org`, `basemaps.cartocdn.com`, `tile.opentopomap.org`. Per MCP App l'iframe sandbox eredita il CSP dell'host chat. Verifiche da fare in laboratorio:

- Claude Desktop / VS Code Copilot: quali origin sono permessi per `connect-src` nell'iframe sandbox?
- Se i CDN tile non sono whitelistati, l'iframe non può scaricare le mappe e il visualizzatore è inutile.
- Mitigazione possibile: il server MCP fa da proxy ai tile (li passa attraverso il proprio dominio, già whitelistato perché la risorsa UI viene da lì). Costo: traffico in più sul server, latenza, cache da gestire.

Questo punto è il **rischio tecnico principale** dell'opzione B. Vale la pena testarlo presto in un proof-of-concept minimale.

### Hosting

L'opzione B richiede che il server MCP sia HTTP-raggiungibile dal client chat. Lo stdio non basta. Opzioni di hosting:

| Opzione | Costo | Pro | Contro |
|---|---|---|---|
| **Azure App Service** | piano B1 ~13 €/mese, free F1 limitato | Easy Auth Entra, Always On, slot, integrato col tutorial Microsoft | Costo ricorrente, complessità Azure |
| **Azure Functions consumption** | gratis fino a 1M esecuzioni/mese | Scale to zero, pay-per-use | Cold start; meno adatto a hosting di asset statici |
| **Cloudflare Workers** | gratis 100k req/giorno | Scale to zero, zero cold start, latenza globale | Limiti CPU/memoria, asset statici via Workers Static Assets |
| **Vercel / Netlify** | gratis tier | Zero config, integrazione Git nativa | Limiti tier free, cold start su Vercel free |
| **fly.io / Railway** | piano free limitato | Container Docker | Configurazione richiesta |
| **VPS personale** (es. esistente) | costo già sostenuto | Controllo totale | Manutenzione, sicurezza, TLS |

Per Roadbook, dato che il caso d'uso è personale e il volume di traffico atteso è bassissimo (singolo utente, pochi prompt al giorno), **Cloudflare Workers** sembra il candidato naturale: free tier ampio, zero cold start, latenza buona. L'articolo Microsoft propone Azure ma è un suggerimento commerciale, non l'unica via.

### Supporto host chat

Stato del supporto MCP Apps al 2026-04-28 (da verificare prima di implementare):

- **Claude Desktop**: supporto annunciato, da verificare la versione minima richiesta.
- **VS Code GitHub Copilot Chat**: supporto annunciato, vincolato alla versione dell'estensione.
- **ChatGPT (web)**: supporto annunciato, dipende dal piano.
- **Cline / Continue / altri client MCP open source**: supporto variabile, in genere in ritardo.

L'utente target di Roadbook usa Claude (esplicito nel CLAUDE.md di repo). Il supporto in Claude Desktop è il prerequisito principale. Va verificato sperimentalmente prima di partire con l'opzione B.

### Privacy e dati nel payload

Nell'opzione A il JSON viaggio viaggia nell'URL del browser dell'utente, mai sul server MCP. Nell'opzione B il JSON arriva sul server MCP via postMessage o tool input, e poi viene rilanciato all'iframe. Il server vede il payload.

Per Roadbook, dove il viaggio è pubblico-comunque (mete turistiche, niente dati personali dell'utente), la differenza non è grave. Resta da considerare se si vogliono evitare log non necessari del payload sul server: in tal caso, configurare logging minimo e niente persistenza.

---

## Stima implementativa

### Costo opzione A

Già stimato in [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md): ~1 settimana (scaffold + tool + validatore minimo + codifica URL + test E2E + slice additiva PWA per gestione `?viaggio_data`).

### Costo opzione B

| Fase | Stima |
|---|---|
| Scelta hosting + provisioning iniziale | 0.5 giorni |
| POC minimale "MCP App che mostra hello world in iframe Claude Desktop" per verificare supporto host e CSP | 0.5-1 giorno |
| Design del bundle UI ridotto: rimozione SW, IndexedDB persistente, modal carica, selettore mappe; integrazione SDK `ext-apps` | 2-3 giorni |
| Setup `vite-plugin-singlefile` o equivalente per produrre HTML autoconsistente, con asset Leaflet e stili inline | 1 giorno |
| Verifica di accessibilità tile mappa dall'iframe (potenziale fix proxy tile) | 0.5-1 giorno (potenzialmente di più se serve proxy) |
| Implementazione tool `anteprima_itinerario` con metadati `_meta.ui` e wiring postMessage | 1 giorno |
| Test E2E in Claude Desktop (e ideale in VS Code Copilot) | 0.5-1 giorno |
| **Totale** | **6-9 giorni di lavoro** (1.5-2 settimane reali) |

Il rischio tecnico è concentrato nel POC iniziale e nella verifica CSP dei tile. Se il POC fallisce per CSP, il costo cresce per implementare un proxy tile, oppure l'opzione B diventa non praticabile.

### Costo opzione C

A + B = circa 3 settimane di lavoro. Un po' meno se le componenti condivise (validatore, codifica payload) sono fattorizzate.

---

## Confronto sintetico

| Criterio | A (URL-payload) | B (MCP App inline) | C (ibrida) |
|---|---|---|---|
| Costo implementativo | basso (1 settimana) | medio-alto (1.5-2 settimane) | alto (3 settimane) |
| Richiede hosting | no | sì | sì |
| Costo ricorrente | zero | da zero (Cloudflare free tier) a ~13€/mese (Azure B1) | come B |
| UX in chat | link cliccabile + tab esterna | anteprima inline | inline + opzione export |
| Limite payload | ~30 KB JSON utili (poi compressione) | nessuno | come B per inline, come A per export |
| Dipendenza supporto host MCP Apps | nessuna | alta | parziale (degrada graceful) |
| Persistenza viaggio sul device | sì (importa nella PWA via URL) | no (effimero) | sì via tool export |
| Riusa PWA esistente | totalmente | bundle dedicato, parziale | bundle dedicato + URL alla PWA |
| Maturità tecnica | alta (URL + base64url) | media (estensione MCP recente) | media |

---

## Raccomandazione

**Implementare l'opzione A come v1.0 di `roadbook-mcp`**, e mantenere l'opzione B in backlog per una v1.1 o v2 dedicata, da affrontare quando:

1. Il supporto MCP Apps in Claude Desktop sarà confermato stabile e accessibile (verificabile con un POC minimale di 0.5 giorni).
2. Sarà fatto un POC della raggiungibilità tile mappa dall'iframe sandbox (rischio tecnico principale).
3. Ci sarà tempo concreto per affrontare hosting + bundle UI dedicato (1.5-2 settimane di slice).

**Motivazioni**:

- **Tempo al primo valore**: l'opzione A è realizzabile in pochi giorni, opzionalmente anche in parallelo con l'uso quotidiano di Roadbook PWA. L'opzione B richiede 2 settimane più infrastruttura, più rischio di fallimento per CSP.
- **Rischio tecnico**: l'opzione B introduce dipendenze (hosting, supporto host, CSP tile) che oggi non esistono e che possono bloccare. L'opzione A non introduce dipendenze nuove.
- **Costo zero**: l'opzione A non richiede hosting; un servizio personale che resta gratis è preferibile a un servizio personale con costo ricorrente quando l'alternativa funziona già.
- **Path evolutivo aperto**: implementare A non preclude B. Il server MCP di A può evolvere a server HTTP che espone anche risorse UI in v1.1, riusando il validatore e la codifica payload. La transizione è additiva.
- **Esperienza utente accettabile**: il "click sul link → tab esterna" non è ideale ma è familiare e degrada bene anche su client MCP che non supportano feature avanzate.

**Quando reconsiderare**:
- Se Claude Desktop pubblica un esempio ufficiale di MCP App che mostra mappe Leaflet senza problemi di CSP, valutare di passare direttamente a B saltando A.
- Se l'utente trova fastidioso il cambio tab e usa il flusso più di una volta a settimana, l'investimento per B diventa giustificato.

---

## Decisioni aperte da chiudere prima di procedere

Indipendentemente dall'opzione scelta:

1. **Repo `roadbook-mcp` già creato?** Verificare su GitHub. Se no, è il primo passo.
2. **Lingua del codice MCP**: l'analisi v1 propone JavaScript puro (Node 22+). Confermare. Ho assunto coerenza con Roadbook.
3. **Trasporto MCP**: stdio per opzione A (analisi v1 esistente). Per opzione B serve HTTP/SSE. Scegliere.
4. **Hosting opzione B (se scelta)**: Cloudflare Workers free tier è la mia raccomandazione tecnica. Confermare o scegliere altrimenti.

Specifico per opzione A:
5. Decisioni già aperte in [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md) §"Domande aperte". Ricondurre lì.

Specifico per opzione B:
6. **Persistenza dello stato dell'iframe**: il viaggio mostrato nell'anteprima è sempre quello dell'ultimo tool result, oppure si tiene in stato dell'iframe? Implica decidere se l'iframe ha proprio storage (es. in memoria, oppure window.localStorage relativo al server MCP).
7. **Persistenza viaggio nella PWA dell'utente**: l'opzione B da sola non lo gestisce. Si torna ad opzione C, oppure l'utente esporta il viaggio dalla chat manualmente (copia-incolla del JSON in una cell di codice).

---

## Roadmap proposta

### Roadmap conservativa (raccomandata)

1. **Slice di scaffold `roadbook-mcp` v1.0** secondo [`mcp-roadbook-v1.md`](mcp-roadbook-v1.md). Esecuzione come da quel documento, ordine di slice 1-10 elencato lì.
2. **Slice additiva `roadbook` PWA** per gestione `?viaggio_data` (già nel piano v1).
3. **Uso reale di v1.0 per qualche settimana**, raccolta di osservazioni d'uso (frequenza, fastidio del cambio tab, dimensione tipica dei payload).
4. **POC opzionale di MCP App in Claude Desktop**: 0.5 giorni per verificare supporto host e CSP tile. Se positivo, alimenta una decisione di scope per v1.1.
5. **v1.1 con opzione C (ibrida)** se la verifica POC è positiva e l'uso reale di v1.0 ne giustifica l'investimento.

### Roadmap aggressiva (se l'utente preferisce)

1. **POC opzione B in 0.5-1 giorno** per de-rischiare CSP e supporto host.
2. Se POC positivo: **opzione B come v1.0** direttamente, saltando A. Costo 1.5-2 settimane.
3. Se POC negativo: cadere su roadmap conservativa.

La differenza tra le due roadmap si gioca su quanto è alta la probabilità che il POC opzione B passi al primo colpo. Senza dati, la mia stima è 50-50: l'estensione MCP Apps è recente, il supporto è in evoluzione, e il caso d'uso "iframe che renderizza Leaflet con tile da CDN esterno" non è il più semplice.

---

## Note sul documento

Questo documento è una **bozza** preparatoria al kickoff del task TODO #3. Non sostituisce la decisione di scope dell'utente. La decisione attesa è:

- **Sì opzione A come da `mcp-roadbook-v1.md`** (status quo).
- **Sì opzione A ora, B aggiunto come v1.1 dopo POC** (roadmap conservativa).
- **Sì opzione B direttamente, salto A** (roadmap aggressiva).
- **Sì opzione C ibrida** (massimo investimento).
- **Rinvio del task** finché non emergono evidenze d'uso più chiare.

Una volta decisa l'opzione, aggiornare la voce TODO #3 con il riferimento all'opzione scelta e procedere con la slice di kickoff.
