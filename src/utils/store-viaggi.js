import { openDB } from 'idb'

const DB_NAME = 'roadbook'
const DB_VERSION = 1

const STORE_VIAGGI = 'viaggi'
const STORE_VISITATI = 'visitati'
const STORE_NOTE = 'note'
const STORE_ROUTING = 'routing'
const STORE_PREF = 'preferenze'

let _dbPromise = null

function getDb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_VIAGGI)) {
          db.createObjectStore(STORE_VIAGGI, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_VISITATI)) {
          db.createObjectStore(STORE_VISITATI, { keyPath: 'chiave' })
        }
        if (!db.objectStoreNames.contains(STORE_NOTE)) {
          db.createObjectStore(STORE_NOTE, { keyPath: 'chiave' })
        }
        if (!db.objectStoreNames.contains(STORE_ROUTING)) {
          db.createObjectStore(STORE_ROUTING, { keyPath: 'chiave' })
        }
        if (!db.objectStoreNames.contains(STORE_PREF)) {
          db.createObjectStore(STORE_PREF, { keyPath: 'chiave' })
        }
      }
    })
  }
  return _dbPromise
}

// chiave composta per punti (visitati, note) e aree (routing)
export function chiavePunto(viaggioId, areaId, n) {
  return `${viaggioId}:${areaId}-${n}`
}
export function chiaveArea(viaggioId, areaId) {
  return `${viaggioId}:${areaId}`
}

// Viaggi -------------------------------------------------

export async function listaViaggi() {
  const db = await getDb()
  const tutti = await db.getAll(STORE_VIAGGI)
  return tutti.sort((a, b) => (b.importatoIl || 0) - (a.importatoIl || 0))
}

export async function leggiViaggio(id) {
  const db = await getDb()
  return db.get(STORE_VIAGGI, id)
}

export async function salvaViaggio({ id, json, origine = 'file' }) {
  const db = await getDb()
  const record = {
    id,
    json,
    origine,
    importatoIl: Date.now(),
    dimensioneByte: new Blob([JSON.stringify(json)]).size
  }
  await db.put(STORE_VIAGGI, record)
  return record
}

export async function eliminaViaggio(id) {
  const db = await getDb()
  const tx = db.transaction(
    [STORE_VIAGGI, STORE_VISITATI, STORE_NOTE, STORE_ROUTING],
    'readwrite'
  )
  await tx.objectStore(STORE_VIAGGI).delete(id)

  const prefisso = `${id}:`
  for (const nomeStore of [STORE_VISITATI, STORE_NOTE, STORE_ROUTING]) {
    const store = tx.objectStore(nomeStore)
    let cursor = await store.openCursor()
    while (cursor) {
      if (String(cursor.key).startsWith(prefisso)) {
        await cursor.delete()
      }
      cursor = await cursor.continue()
    }
  }
  await tx.done
}

// Visitati -----------------------------------------------

export async function tuttiVisitatiDi(viaggioId) {
  const db = await getDb()
  const tutti = await db.getAll(STORE_VISITATI)
  const prefisso = `${viaggioId}:`
  const out = {}
  for (const r of tutti) {
    if (r.chiave.startsWith(prefisso) && r.visitato) {
      out[r.chiave] = true
    }
  }
  return out
}

export async function impostaVisitato(viaggioId, areaId, n, visitato) {
  const db = await getDb()
  const chiave = chiavePunto(viaggioId, areaId, n)
  if (visitato) {
    await db.put(STORE_VISITATI, { chiave, visitato: true, aggiornatoIl: Date.now() })
  } else {
    await db.delete(STORE_VISITATI, chiave)
  }
}

// Note ---------------------------------------------------

export async function tutteNoteDi(viaggioId) {
  const db = await getDb()
  const tutti = await db.getAll(STORE_NOTE)
  const prefisso = `${viaggioId}:`
  const out = {}
  for (const r of tutti) {
    if (r.chiave.startsWith(prefisso) && r.testo) out[r.chiave] = r.testo
  }
  return out
}

export async function salvaNota(viaggioId, areaId, n, testo) {
  const db = await getDb()
  const chiave = chiavePunto(viaggioId, areaId, n)
  const pulito = (testo ?? '').trim()
  if (!pulito) {
    await db.delete(STORE_NOTE, chiave)
  } else {
    await db.put(STORE_NOTE, { chiave, testo: pulito, aggiornatoIl: Date.now() })
  }
}

// Routing cache ------------------------------------------

export async function leggiRouting(viaggioId, areaId) {
  const db = await getDb()
  return db.get(STORE_ROUTING, chiaveArea(viaggioId, areaId))
}

export async function salvaRouting(viaggioId, areaId, { geometria, modalita }) {
  const db = await getDb()
  await db.put(STORE_ROUTING, {
    chiave: chiaveArea(viaggioId, areaId),
    geometria,
    modalita,
    calcolatoIl: Date.now()
  })
}

export async function eliminaRouting(viaggioId, areaId) {
  const db = await getDb()
  await db.delete(STORE_ROUTING, chiaveArea(viaggioId, areaId))
}

// Preferenze ---------------------------------------------

export async function leggiPreferenza(chiave, defaultValue = null) {
  const db = await getDb()
  const r = await db.get(STORE_PREF, chiave)
  return r ? r.valore : defaultValue
}

export async function salvaPreferenza(chiave, valore) {
  const db = await getDb()
  await db.put(STORE_PREF, { chiave, valore })
}

// Export/import singolo viaggio --------------------------

/**
 * Produce il JSON di un singolo viaggio, opzionalmente arricchito con le
 * annotazioni personali dell'utente (punti visitati + note). Il JSON è
 * autonomamente valido secondo lo schema v1.1 e importabile da un altro
 * dispositivo o utente.
 */
export async function esportaViaggioSingolo(viaggioId, { includiAnnotazioni = true } = {}) {
  const record = await leggiViaggio(viaggioId)
  if (!record) throw new Error(`Viaggio "${viaggioId}" non trovato in storage.`)
  const clone = JSON.parse(JSON.stringify(record.json))

  if (includiAnnotazioni) {
    const [visitatiRaw, noteRaw] = await Promise.all([
      tuttiVisitatiDi(viaggioId),
      tutteNoteDi(viaggioId)
    ])
    const prefisso = `${viaggioId}:`
    const visitati = Object.keys(visitatiRaw)
      .filter(k => k.startsWith(prefisso))
      .map(k => k.slice(prefisso.length))
    const note = {}
    for (const [k, v] of Object.entries(noteRaw)) {
      if (k.startsWith(prefisso)) {
        note[k.slice(prefisso.length)] = v
      }
    }
    if (visitati.length > 0 || Object.keys(note).length > 0) {
      clone.annotazioni = { visitati, note }
    }
    // bump schema version solo se l'originale era 1.0: sopra quella versione
    // lasciamo invariato per non mentire al lettore del file
    if (clone.$schema_version === '1.0') {
      clone.$schema_version = '1.1'
    }
  }

  return clone
}

/**
 * Sostituisce completamente visitati e note esistenti per `viaggioId` con
 * quelli contenuti in `annotazioni`. Usato quando l'utente sceglie "Importa
 * tutto" dopo un caricamento JSON con annotazioni.
 * Sostituzione totale: la fonte di verità per quel momento è il JSON importato.
 */
export async function ripristinaAnnotazioni(viaggioId, annotazioni) {
  if (!annotazioni || typeof annotazioni !== 'object') return
  const db = await getDb()
  const tx = db.transaction([STORE_VISITATI, STORE_NOTE], 'readwrite')
  const prefisso = `${viaggioId}:`

  for (const nomeStore of [STORE_VISITATI, STORE_NOTE]) {
    const store = tx.objectStore(nomeStore)
    let cursor = await store.openCursor()
    while (cursor) {
      if (String(cursor.key).startsWith(prefisso)) await cursor.delete()
      cursor = await cursor.continue()
    }
  }

  const now = Date.now()
  for (const chiaveParziale of (annotazioni.visitati || [])) {
    if (typeof chiaveParziale !== 'string') continue
    await tx.objectStore(STORE_VISITATI).put({
      chiave: `${viaggioId}:${chiaveParziale}`,
      visitato: true,
      aggiornatoIl: now
    })
  }
  for (const [k, testo] of Object.entries(annotazioni.note || {})) {
    const pulito = (typeof testo === 'string' ? testo : '').trim()
    if (!pulito) continue
    await tx.objectStore(STORE_NOTE).put({
      chiave: `${viaggioId}:${k}`,
      testo: pulito,
      aggiornatoIl: now
    })
  }
  await tx.done
}

// Backup / restore ---------------------------------------

export async function esportaBackup() {
  const db = await getDb()
  const [viaggi, visitati, note, routing, preferenze] = await Promise.all([
    db.getAll(STORE_VIAGGI),
    db.getAll(STORE_VISITATI),
    db.getAll(STORE_NOTE),
    db.getAll(STORE_ROUTING),
    db.getAll(STORE_PREF)
  ])
  return {
    app: 'roadbook',
    versione: 1,
    esportatoIl: new Date().toISOString(),
    viaggi, visitati, note, routing, preferenze
  }
}

export async function importaBackup(backup) {
  if (!backup || backup.app !== 'roadbook') {
    throw new Error('Backup non valido: manca marcatore applicazione.')
  }
  const db = await getDb()
  const tx = db.transaction(
    [STORE_VIAGGI, STORE_VISITATI, STORE_NOTE, STORE_ROUTING, STORE_PREF],
    'readwrite'
  )
  for (const r of backup.viaggi || []) await tx.objectStore(STORE_VIAGGI).put(r)
  for (const r of backup.visitati || []) await tx.objectStore(STORE_VISITATI).put(r)
  for (const r of backup.note || []) await tx.objectStore(STORE_NOTE).put(r)
  for (const r of backup.routing || []) await tx.objectStore(STORE_ROUTING).put(r)
  for (const r of backup.preferenze || []) await tx.objectStore(STORE_PREF).put(r)
  await tx.done
}
