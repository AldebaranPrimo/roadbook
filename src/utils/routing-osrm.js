// Chiamata OSRM + cache IndexedDB + fallback polyline retta.
// OSRM pubblico: https://router.project-osrm.org/route/v1/{profilo}/{coord};...?overview=full&geometries=polyline

import { leggiRouting, salvaRouting } from './store-viaggi.js'

const BASE_OSRM = 'https://router.project-osrm.org/route/v1'
const TIMEOUT_MS = 5000

function profiloPer(modalita) {
  return modalita === 'piedi' ? 'foot' : 'driving'
}

function coordinateStringa(punti) {
  return punti.map(p => `${p.lon},${p.lat}`).join(';')
}

// Decoder polyline5 (algoritmo Google, precisione 1e-5), usato da OSRM di default.
export function decodePolyline(stringa) {
  const coord = []
  let indice = 0
  let lat = 0
  let lon = 0
  while (indice < stringa.length) {
    let risultato = 0, shift = 0, byte
    do {
      byte = stringa.charCodeAt(indice++) - 63
      risultato |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const dLat = (risultato & 1) ? ~(risultato >> 1) : (risultato >> 1)
    lat += dLat

    risultato = 0; shift = 0
    do {
      byte = stringa.charCodeAt(indice++) - 63
      risultato |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const dLon = (risultato & 1) ? ~(risultato >> 1) : (risultato >> 1)
    lon += dLon

    coord.push([lat * 1e-5, lon * 1e-5])
  }
  return coord
}

async function chiamaOsrm(punti, modalita) {
  const url = `${BASE_OSRM}/${profiloPer(modalita)}/${coordinateStringa(punti)}?overview=full&geometries=polyline`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) {
      throw new Error(`OSRM risposta non ok: ${data.code || 'sconosciuto'}`)
    }
    return data.routes[0].geometry
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ritorna un oggetto { coord: [[lat, lon], ...], origine: 'cache' | 'osrm' | 'retta' }.
 * - Se c'è routing in cache IndexedDB per (viaggioId, areaId) → lo usa (anche offline).
 * - Altrimenti chiama OSRM, salva in cache, ritorna.
 * - Se OSRM fallisce (timeout, offline, errore) → polyline retta tra i punti.
 */
export async function ottieniPercorso({ viaggioId, areaId, punti, modalita = 'auto', forzaAggiornamento = false }) {
  if (!punti || punti.length < 2) {
    return { coord: (punti || []).map(p => [p.lat, p.lon]), origine: 'retta' }
  }

  if (!forzaAggiornamento) {
    try {
      const cache = await leggiRouting(viaggioId, areaId)
      if (cache && cache.geometria && cache.modalita === modalita) {
        return { coord: decodePolyline(cache.geometria), origine: 'cache' }
      }
    } catch { /* cache lettura fallita: procedo con OSRM */ }
  }

  try {
    const geometria = await chiamaOsrm(punti, modalita)
    try {
      await salvaRouting(viaggioId, areaId, { geometria, modalita })
    } catch { /* cache scrittura non critica */ }
    return { coord: decodePolyline(geometria), origine: 'osrm' }
  } catch {
    return { coord: punti.map(p => [p.lat, p.lon]), origine: 'retta' }
  }
}
