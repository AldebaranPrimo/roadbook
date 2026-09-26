---
id: 2026-09-26-routing-per-profilo-mezzo
stato: aperta
data-apertura: 2026-09-26
schema-version: 1
tag: [routing, camper, bici, studio]
---

## Richiesta

Idea proposta dall'autore in chat il 2026-09-26, esplicitamente **da discutere e non da eseguire**: capire se è applicabile a Roadbook o, eventualmente, a un altro progetto simile. Trascrizione della dettatura, tolti solo gli intercalari:

> Il problema è come viene fatto il routing di questi percorsi. Al momento il programma non fa nessun tipo di routing se non tracciare delle linee dirette tra i vari punti. Probabilmente esiste già tra i vari to do l'idea di agganciare un sistema di routing per cui, dati i punti e i punti chiave definiti nello schema dall'AI, dopo si va a procedere con un routing un po' più accurato. Il problema del routing è che dipende dal mezzo e il problema è che il mezzo potrebbe anche cambiare. Però, lasciando stare il mezzo che cambia, che potremmo comunque gestire con mappe diverse, dobbiamo comunque gestire le tipologie di routing. Quella per le automobili è piuttosto semplice. Quella per le biciclette da strada è altrettanto semplice. Però ci sono due routing che probabilmente impongono delle accortezze in più: quello per il camper, che deve tenere presente soprattutto delle altezze, cioè della possibilità che vi siano ponti o altri ostacoli troppo bassi. La larghezza difficilmente è un problema, perché se ci passa un SUV, per capirci, con un po' di pazienza ci passa anche un camper; il problema invece è l'altezza, che essendo un camper 3 metri spesso e volentieri si trovano limiti a 2 metri, 2 metri e mezzo. L'altro problema è quello della bicicletta con il carrellino, porta bambini o porta cani che sia, non importa, che impone due generi di necessità. La sicurezza, e quindi viaggiare il più possibile su delle piste ciclabili quando l'alternativa è la statale, ed è ovvio che se l'alternativa è una strada secondaria è sempre preferibile; e anche la larghezza. Quindi un routing di questo tipo fatto bene cosa dovrebbe fare: verificare innanzitutto se esistono già delle segnalazioni dei percorsi ciclabili più utilizzati, perché secondo me quello è molto valido, perché dà l'idea di un percorso che non solo sulla carta è adatto alla bicicletta ma è adatto anche all'uso pratico, perché la testimonianza di molti passaggi di biciclette, tipo l'heatmap di Strava e altre cose, già ci danno una traccia importante. Poi per quanto riguarda il carrellino, questo però impone dei problemi di larghezza: non tutte le piste ciclabili, non tutti i sentieri possono essere percorribili con un carrello, perché spesso si trovano dei pali di blocco che sono troppo stretti per il carrello. Ma comunque anche più generalmente il routing per la bicicletta dovrebbe dire, nel caso, che so, di una statale anche con la pista ciclabile, bisognerebbe poter vedere se magari, anche a costo di fare qualche chilometro in più, esiste una stradina interna più piacevole e più tranquilla che può essere l'alternativa, ripeto, anche alla ciclabile. Non per forza le ciclabili devono essere scelte come prima possibilità: ripeto, nel caso di una ciclabile che corre lungo una statale, come sono spesso e volentieri le ciclabili italiane, preferisco di gran lunga fare una strada interna alternativa anche più lunga. Queste sono tutte idee buttate là, vanno conglomerate in un documento che poi faccia da base per uno studio effettivo.

Esito atteso: questo documento come base per uno studio di applicabilità. Nessuna decisione di implementazione.

## Interlocuzione

### 2026-09-26 — Raccolta delle idee (chat)

#### Stato attuale del routing in Roadbook

Precisazione rispetto alla premessa della richiesta: Roadbook un routing lo calcola già, ma solo su rete stradale e senza distinzione di mezzo.

- `src/utils/routing-osrm.js` → `ottieniPercorso()` chiama il server pubblico OSRM, con il profilo ricavato da `area.modalita` (`auto` → `driving`, `piedi` → `foot`, `bici` → `cycling`).
- Il server pubblico risponde allo stesso modo per i tre profili (test empirico di maggio 2026, README §*Limitazioni note*): in pratica ogni area viene instradata come se si viaggiasse in auto.
- La linea retta compare solo in due casi: come ripiego, quando OSRM non risponde entro 5 secondi o si è senza rete; e per scelta, per `treno`/`autobus`/`traghetto`, segnalata da un banner.
- Il percorso calcolato resta in cache IndexedDB per area, senza scadenza, e quindi è disponibile anche offline.
- Linee rette su aree `auto`/`bici`/`piedi` con la rete disponibile non sono il comportamento previsto: sarebbero un sintomo da riprodurre a parte.

#### Profili di routing emersi

1. **Auto** — nessuna esigenza particolare: basta il routing stradale standard.
2. **Bici da strada** — profilo bici standard.
3. **Camper**
   - Vincolo principale: **altezza**. Mezzo di riferimento alto circa 3 m, con limiti frequenti a 2 m e a 2,5 m (ponti, sottopassi, portali).
   - Larghezza: raramente un problema. Dove passa un SUV, con un po' di pazienza passa anche un camper.
4. **Bici con carrello** (porta bambini o porta cani)
   - **Sicurezza**: evitare le strade statali e trafficate (vedi il criterio di preferenza qui sotto).
   - **Larghezza**: il carrello non passa ovunque. I dissuasori (paletti di blocco) all'ingresso di ciclabili e sentieri sono spesso troppo stretti, e non tutte le ciclabili e non tutti i sentieri sono percorribili.

#### Criterio di preferenza per la bici (con o senza carrello)

- Ordine di preferenza: **strada interna tranquilla**, anche se più lunga → **pista ciclabile** → **statale**.
- La ciclabile non è la prima scelta per definizione. Una ciclabile che corre lungo una statale, caso frequente in Italia, vale meno di una strada interna alternativa. Conta la tranquillità del percorso, non l'etichetta «ciclabile».
- **Evidenze d'uso reale**: i percorsi più frequentati dai ciclisti (heatmap di Strava o simili) provano che un tracciato è adatto nella pratica, non solo sulla carta. Sono il primo segnale da cercare.

#### Fuori perimetro

- Il cambio di mezzo dentro la stessa area è già tracciato in [issue #31](https://github.com/AldebaranPrimo/roadbook/issues/31) (multimodalità). L'autore suggerisce che si possa gestire con mappe distinte.

#### Domanda di fondo: Roadbook o un altro progetto?

Considerazioni da pesare nello studio:

- **Identità del prodotto.** Il README (sezione «In due righe») definisce Roadbook un visualizzatore che non pianifica e non genera contenuti. Un routing per profilo di mezzo è, di fatto, pianificazione.
- **Architettura.** Roadbook è statico, senza backend, e usa solo servizi pubblici gratuiti. Un routing con profili personalizzati richiede con ogni probabilità un motore configurabile, installato in proprio o raggiungibile via API con chiave. In entrambi i casi l'architettura cambia (un backend, oppure una chiave esposta nel client). Da verificare.
- **Via intermedia già prevista.** L'estensione dello schema `gpx_url` (`docs/TODO.md`, voce #12) permetterebbe di pianificare il percorso con uno strumento specializzato e di mostrarlo in Roadbook come traccia GPX. Il routing per profilo vivrebbe altrove.
- **Punti intermedi generati dall'AI.** L'AI che genera il viaggio potrebbe aggiungere punti di passaggio per forzare le strade preferite. Limite: l'AI non conosce altezze e larghezze reali, quindi l'idea non risolve i vincoli di camper e carrello.

#### Piste di indagine per lo studio (NON verificate)

Elenco costruito su conoscenze generali, **da verificare sulla documentazione ufficiale** prima di qualsiasi scelta:

- **Motori di routing open source con profili configurabili**: GraphHopper, Valhalla, BRouter, openrouteservice, OSRM installato in proprio (profili personalizzabili). Da verificare, per ciascuno: se gestisce altezza e larghezza del mezzo, se sa preferire le strade tranquille, i costi, l'hosting e i limiti d'uso delle istanze pubbliche.
- **Dati OpenStreetMap**: tag come `maxheight`, `maxwidth`, `barrier=bollard` e `barrier=cycle_barrier` con la loro larghezza, `highway=cycleway`, `bicycle=designated`, la classificazione della strada. Da verificare: quanto sono coperti in Italia. Un routing basato su altezze e larghezze vale quanto la completezza di questi dati.
- **Heatmap d'uso** (Strava Global Heatmap e simili): da verificare termini d'uso e disponibilità di API. È possibile che si possano usare solo come strato visivo sulla mappa, non come dato per il calcolo.

#### Domande aperte per l'autore

1. Dove deve stare il calcolo: in Roadbook, in un servizio separato, o in uno strumento esterno di pianificazione che consegna un GPX?
2. Camper: l'altezza è un valore fisso (circa 3 m) o un parametro del viaggio e del mezzo? Contano anche peso e lunghezza?
3. Bici con carrello: qual è la larghezza del carrello, cioè la luce minima di passaggio?
4. Costi: solo servizi gratuiti o installati in proprio, oppure è accettabile un servizio con chiave?
5. Offline: va bene il modello attuale (calcolo online una volta, poi cache senza scadenza)?

### 2026-09-26 — Precisazioni dell'autore (chat, seconda parte)

- **Il routing attuale non basta.** Il routing OSRM di oggi è basico e non serve alle esigenze descritte sopra.
- **Il routing spetta a Roadbook** (risposta alla domanda 1). Il file di viaggio indica i punti cruciali, cioè le cose da vedere lungo il percorso, ma non dice come muoversi dall'uno all'altro né per dove passare. Il calcolo del percorso resta compito dell'applicazione, con un routing molto più specializzato di quello attuale: è lì che si applicano i criteri di questa richiesta. La strada «strumento esterno di pianificazione + traccia GPX» non è la direzione scelta.
- **Estensione prevista dello schema**:
  - il **mezzo** con cui si percorre il tratto intermedio (bici, piedi, camper, auto e così via);
  - non il tracciato. Se serve orientare il percorso, lo si fa con **punti di passaggio**: una versione ridotta del punto, con la sola posizione, senza descrizione e senza gli altri campi di un punto di interesse.
- **Evoluzione possibile**: Roadbook potrebbe diventare un'applicazione vera e propria, mantenendo anche la versione web.
- **Multimodalità** ([issue #31](https://github.com/AldebaranPrimo/roadbook/issues/31)): confermata come idea collegata. Caso tipico: un percorso lungo, su più giorni, fatto in parte in camper, in parte a piedi, in parte in bicicletta.

Conseguenze da considerare nello studio:

- Se la funzionalità procede, andrà rivista la definizione del README (sezione «In due righe»), secondo cui Roadbook «non pianifica».
- Resta il nodo dell'architettura: Roadbook oggi non ha backend e usa solo servizi pubblici gratuiti. Il routing specializzato va collocato da qualche parte: un motore installato in proprio, un servizio con chiave, oppure, nell'eventuale applicazione nativa, un calcolo sul dispositivo. Quest'ultima via sarebbe interessante per l'uso offline, caso d'uso primario del progetto. Da verificare.
- I punti di passaggio orientano il percorso ma non conoscono altezze e larghezze: i vincoli di camper e carrello restano a carico del motore di routing.

Domande aperte che restano: dalla 2 alla 5 della lista precedente, più una nuova:

6. Il mezzo si indica per ogni tratto fra due punti, o resta per area come oggi (`area.modalita`)? La risposta si lega alla issue #31.

## Decisione

**Non ancora presa** sull'implementazione. Stato: `aperta`.

Orientamento dell'autore (2026-09-26): il routing specializzato per mezzo spetta a Roadbook. Lo schema indicherà il mezzo dei tratti e, se serve, punti di passaggio ridotti, ma non il tracciato. Prossimo passo: lo studio sulle piste di indagine; la scelta del motore e dell'architettura andrà poi in un ADR in `docs/decisions/`.

## Implementazione

Nessuna implementazione in corso.

Tracking esterno: [issue #36 su GitHub](https://github.com/AldebaranPrimo/roadbook/issues/36) (label `enhancement`, `question`, `risk:high`). Il rischio è valutato in prospettiva: la richiesta tocca il cuore del routing e potrebbe cambiare l'architettura (backend o servizio con chiave).
