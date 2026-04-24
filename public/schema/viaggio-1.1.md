# Schema JSON viaggio Roadbook — versione 1.1

> **Fonte di verità vivente** dello schema JSON accettato dall'app Roadbook.
> Questo file è servito staticamente dalla PWA all'URL: `https://AldebaranPrimo.github.io/roadbook/schema/viaggio-1.1.md`
>
> **Puoi passarlo integralmente a un LLM** (ChatGPT, Claude, Gemini, altri) chiedendo di produrre un itinerario nel formato Roadbook, e l'LLM ha tutto quello che gli serve sapere.

---

## A cosa serve

Roadbook è una PWA che visualizza itinerari di viaggio organizzati in **aree geografiche**, ciascuna con una **mappa interattiva** (marker numerati, percorso tra i punti via OSRM) e una **lista descrittiva** dei punti. Il file JSON è la fonte unica di verità del viaggio: cambia il file, cambia il viaggio visualizzato.

Sito live: https://AldebaranPrimo.github.io/roadbook/

---

## Struttura root del JSON

```json
{
  "$schema_version": "1.1",
  "viaggio": { … },
  "categorie": { … },
  "aree": [ … ],
  "annotazioni": { … }
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `$schema_version` | string | **sì** | `"1.1"` per sfruttare le annotazioni utente; `"1.0"` resta accettato per viaggi senza annotazioni |
| `viaggio` | object | **sì** | Metadati del viaggio (vedi sotto) |
| `categorie` | object | **sì** | Mappa di categorie usate per colorare marker e raggruppare punti |
| `aree` | array | **sì** | Almeno 1. Ogni area è un blocco geografico del viaggio |
| `annotazioni` | object | no (v1.1+) | Note utente e punti visitati, portabili col JSON |

**Forward-compatibility**: l'app ignora silenziosamente campi sconosciuti, quindi è sicuro includere campi futuri come `giorni`, `gpx_url`, `bookings`, `meteo_link` — verranno semplicemente non renderizzati finché non supportati.

---

## Oggetto `viaggio`

```json
"viaggio": {
  "id": "friuli-slovenia-2026-aprile",
  "titolo": "Friuli + Slovenia in camper",
  "sottotitolo": "Ponte 25-26 aprile 2026 · Camper + cane",
  "descrizione_estesa": "Testo lungo mostrato nel modal informazioni…",
  "data_inizio": "2026-04-24",
  "data_fine": "2026-04-26",
  "partenza": {
    "nome": "San Zenone degli Ezzelini (TV)",
    "lat": 45.7787342,
    "lon": 11.8404559,
    "quando": "venerdì sera 24/04/2026"
  },
  "rientro": {
    "nome": "San Zenone degli Ezzelini (TV)",
    "lat": 45.7787342,
    "lon": 11.8404559,
    "descrizione": "Da Gorizia a San Zenone ~180 km / 2h15 via A34→A4→A28→A27→SS248."
  },
  "documenti_richiesti": "CI, libretto sanitario del cane…",
  "tags": ["camper", "cane", "primavera"],
  "lingua": "it"
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `id` | string | **sì** | Slug ASCII univoco (no spazi, no maiuscole). Usato come chiave storage. Esempi: `"sardegna-2026-estate"`, `"isole-greche"` |
| `titolo` | string | **sì** | Titolo mostrato nell'header |
| `sottotitolo` | string | no | Mostrato sotto il titolo, tipicamente data e contesto |
| `descrizione_estesa` | string | no | Testo lungo visibile nel modal info |
| `data_inizio` / `data_fine` | string ISO `YYYY-MM-DD` | no | |
| `partenza` / `rientro` | object | no | Oggetti con `nome`, `lat`, `lon`, `quando?`, `descrizione?` |
| `documenti_richiesti` | string | no | Note libere (vignette, assicurazioni, documenti cane…) |
| `tags` | array string | no | Tag liberi a livello viaggio |
| `lingua` | string | no | ISO 639-1 (default `"it"`) |

---

## Oggetto `categorie`

Mappa chiave → definizione di categoria. Le chiavi sono libere e verranno referenziate dal campo `categoria` di ciascun punto.

```json
"categorie": {
  "natura":    { "colore": "#16a34a", "label": "Natura / fiumi / animali", "icona_emoji": "🌳" },
  "castello":  { "colore": "#9333ea", "label": "Castello",                "icona_emoji": "🏰" },
  "citta":     { "colore": "#2563eb", "label": "Borgo / città",           "icona_emoji": "🏛️" },
  "camper":    { "colore": "#475569", "label": "Area sosta camper",       "icona_emoji": "🅿️" }
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `colore` | string hex `#rrggbb` | **sì** | Colore del marker sulla mappa e del pallino numerato |
| `label` | string | **sì** | Etichetta umana in legenda e popup |
| `icona_emoji` | string | no | Emoji opzionale per UI compatte |

Suggerimento: usa al massimo 6-8 categorie distinte per leggibilità. Categorie tipiche: `natura`, `citta`, `castello`, `chiesa`, `camper`, `casa` (partenza/rientro), `wwi` (grande guerra), `vertigini` (avvertenza).

---

## Array `aree`

Ogni area è un blocco geografico/tematico del viaggio. Un viaggio tipico ha 3-10 aree.

```json
"aree": [
  {
    "id": 1,
    "nome": "Spilimbergo e Tagliamento",
    "intro": "Borgo dei mosaicisti, gole del Tagliamento, grifoni della Riserva di Cornino…",
    "modalita": "auto",
    "tags": ["pianura", "fiume"],
    "punti": [ … ]
  }
]
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `id` | int | **sì** | Numero intero univoco tra le aree del viaggio |
| `nome` | string | **sì** | Nome dell'area, mostrato come tab |
| `intro` | string | no | Descrizione introduttiva mostrata sopra la lista punti |
| `modalita` | `"auto"` \| `"piedi"` | no | Default `"auto"`. Determina il profilo OSRM e lo stile della polyline |
| `tags` | array string | no | Tag liberi a livello area |
| `punti` | array | **sì** | Almeno 1 punto (vedi sotto) |

---

## Array `punti` (dentro ogni area)

Cuore del JSON. Ogni punto rappresenta un luogo visualizzato come marker sulla mappa + scheda nella lista.

```json
{
  "n": 1,
  "name": "Spilimbergo - Centro storico",
  "lat": 46.111223,
  "lon": 12.901674,
  "categoria": "citta",
  "desc": "Duomo gotico-romanico XIII-XIV sec con affreschi giotteschi. Castello col Palazzo Dipinto…",
  "avvertenze": "Attenzione, segnalati furti su auto in sosta.",
  "orari": "Sabato e domenica 14:30-18:30",
  "costo": "5 €/24h",
  "sito_web": "https://www.esempio.it",
  "telefono": "+390123456789",
  "note_pratiche": "Parcheggio gratuito a 200 m dal centro.",
  "foto": ["https://example.com/foto1.jpg"],
  "tags": ["centro-storico", "unesco-affreschi"]
}
```

| Campo | Tipo | Obbligatorio | Descrizione |
|---|---|---|---|
| `n` | int | **sì** | Numero progressivo **univoco nell'area** (1, 2, 3…). Visualizzato dentro il marker |
| `name` | string | **sì** | Nome del luogo |
| `lat` | float | **sì** | Latitudine WGS84 (-90..+90) |
| `lon` | float | **sì** | Longitudine WGS84 (-180..+180) |
| `categoria` | string | **sì** | Chiave esistente in `categorie` |
| `desc` | string | **sì** | Descrizione principale, 1-3 paragrafi |
| `avvertenze` | string | no | Avvisi importanti (vertigini, furti, restrizioni). Mostrato evidenziato |
| `orari` | string | no | Testo libero |
| `costo` | string | no | Testo libero (per gestire formati tipo `"5€/24h"`, `"8€ adulti, 5€ bambini"`) |
| `sito_web` | string URL | no | |
| `telefono` | string | no | |
| `note_pratiche` | string | no | Info utili: dove ritirare chiavi, dove parcheggiare |
| `foto` | array string URL | no | Immagini del luogo |
| `tags` | array string | no | Tag liberi del punto, usabili per futuri filtri |

---

## Oggetto `annotazioni` (v1.1, opzionale)

Incapsula le annotazioni personali dell'utente (punti visitati + note) dentro il JSON, così un viaggio esportato è "portabile completo" da un dispositivo a un altro o condivisibile con amici.

```json
"annotazioni": {
  "visitati": ["1-2", "3-4"],
  "note": {
    "1-5": "Fantastica la Scuola Mosaicisti, visitare guidata sabato mattina",
    "2-1": "Cane ammesso al guinzaglio, parcheggio pieno dopo le 10"
  }
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `visitati` | array di string | Elenco di punti marcati "visitato". Formato chiave: `"<areaId>-<n>"` |
| `note` | object | Mappa `"<areaId>-<n>" → testo nota` |

Entrambi sono opzionali: si può avere solo `visitati`, solo `note`, entrambi, o l'intero `annotazioni` assente. All'import, l'app chiede conferma con 3 opzioni: **Importa tutto**, **Solo il viaggio**, **Annulla**.

Se includi `annotazioni`, usa `$schema_version: "1.1"`. Viaggi senza annotazioni possono restare a `"1.0"`.

---

## Esempio minimale completo

Il JSON più piccolo accettato dal validatore (1 area, 2 punti, nessuna annotazione):

```json
{
  "$schema_version": "1.1",
  "viaggio": {
    "id": "esempio-minimo",
    "titolo": "Viaggio di esempio"
  },
  "categorie": {
    "generico": { "colore": "#2563eb", "label": "Luogo" }
  },
  "aree": [
    {
      "id": 1,
      "nome": "Area unica",
      "punti": [
        {
          "n": 1,
          "name": "Primo punto",
          "lat": 45.0,
          "lon": 12.0,
          "categoria": "generico",
          "desc": "Descrizione del primo punto."
        },
        {
          "n": 2,
          "name": "Secondo punto",
          "lat": 45.1,
          "lon": 12.1,
          "categoria": "generico",
          "desc": "Descrizione del secondo punto."
        }
      ]
    }
  ]
}
```

---

## Come far produrre un viaggio a un LLM

Copia il contenuto di questo file in una conversazione con ChatGPT / Claude / Gemini, poi chiedi qualcosa tipo:

> *"Questo è lo schema dell'app Roadbook. Produci un itinerario in questo formato JSON per [destinazione + periodo + vincoli, es. 'il Salento in 4 giorni con camper, partenza Milano']. Rispetta tutti i campi obbligatori, usa coordinate lat/lon reali e verosimili, crea 3-5 aree geografiche coerenti, 4-6 punti per area. Usa emoji sensate nelle categorie."*

L'LLM avrà tutto il contesto necessario per produrre un JSON valido e ricco. Importalo poi dalla modal **"Carica viaggio"** dell'app (bottone `+` in alto).

---

## Esempio reale completo

Un JSON reale con 7 aree e 30 punti è disponibile all'URL:
https://AldebaranPrimo.github.io/roadbook/viaggi/viaggio-friuli-2026.json

Utile sia come riferimento di stile descrittivo, sia come base da modificare.
