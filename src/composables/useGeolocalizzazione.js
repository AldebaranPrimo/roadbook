import { ref, computed } from 'vue'
import { leggiPreferenza, salvaPreferenza } from '../utils/store-viaggi.js'

// Stato condiviso: `useGeolocalizzazione()` chiamato da componenti diversi
// vede la stessa posizione e lo stesso stato, senza duplicare il watch nativo.
const posizione = ref(null)     // { lat, lon, accuracy, timestamp } | null
const stato = ref('inattiva')   // 'inattiva' | 'richiesta' | 'attiva' | 'negata' | 'errore'
const erroreMsg = ref(null)

let watchId = null
let inizializzato = false

async function inizializza() {
  if (inizializzato) return
  inizializzato = true
  const pref = await leggiPreferenza('geolocalizzazione', null)
  // se l'utente aveva negato in una sessione precedente, niente re-prompt automatico
  if (pref === 'negata') stato.value = 'negata'
}

function supportata() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation
}

function richiedi() {
  if (!supportata()) {
    stato.value = 'errore'
    erroreMsg.value = 'Geolocalizzazione non supportata dal browser.'
    return
  }
  if (stato.value === 'attiva' || stato.value === 'richiesta') return

  stato.value = 'richiesta'
  erroreMsg.value = null
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      posizione.value = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      }
      stato.value = 'attiva'
      // l'utente ha concesso: cancella eventuale flag "negata" da sessioni passate
      salvaPreferenza('geolocalizzazione', 'concessa').catch(() => {})
    },
    (err) => {
      erroreMsg.value = err.message
      if (err.code === err.PERMISSION_DENIED) {
        stato.value = 'negata'
        salvaPreferenza('geolocalizzazione', 'negata').catch(() => {})
      } else {
        stato.value = 'errore'
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 30000
    }
  )
}

function ferma() {
  if (watchId !== null && supportata()) {
    navigator.geolocation.clearWatch(watchId)
  }
  watchId = null
  if (stato.value === 'attiva') stato.value = 'inattiva'
  posizione.value = null
}

export function useGeolocalizzazione() {
  inizializza()
  return {
    posizione: computed(() => posizione.value),
    stato: computed(() => stato.value),
    errore: computed(() => erroreMsg.value),
    richiedi,
    ferma,
    supportata
  }
}
