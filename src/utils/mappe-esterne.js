// Deep link a navigatori esterni.
// Ogni helper ritorna un URL esplicito per un provider specifico; il chiamante
// sceglie quali bottoni mostrare. Niente auto-detect: su Android i bottoni
// "Apple" e "Google" producono URL distinte — è il sistema operativo o
// l'utente a decidere con quale app aprire il deep link.

export function linkGoogleMaps(lat, lon, nome = '') {
  const q = nome ? `${lat},${lon}(${encodeURIComponent(nome)})` : `${lat},${lon}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function linkWaze(lat, lon) {
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
}

export function linkAppleMaps(lat, lon, nome = '') {
  const base = `http://maps.apple.com/?ll=${lat},${lon}`
  return nome ? `${base}&q=${encodeURIComponent(nome)}` : base
}

// OSMAnd: deep link ufficiale. Apre l'app se installata (Android/iOS),
// altrimenti mostra la pagina web con il punto evidenziato.
// Riferimento: https://osmand.net/docs/technical/deep-linking/
export function linkOsmand(lat, lon, nome = '') {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    z: '17'
  })
  if (nome) params.set('title', nome)
  return `https://osmand.net/go?${params.toString()}`
}

// Bottone unificato per mobile: lascia al sistema operativo la scelta dell'app.
//
// Android: schema URI `geo:` standard (RFC 5870 + estensione Google).
//   `geo:lat,lon?q=lat,lon(nome)` apre il dialog "Apri con" tra le app di
//   mappe installate (Google Maps, Waze, OsmAnd, Maps.me, ecc.). L'utente
//   sceglie una volta o per sempre.
//   Riferimento: https://developer.android.com/guide/components/intents-common#Maps
//
// iOS: lo schema `geo:` non è supportato dal sistema. La forma documentata
//   è `maps://?daddr=lat,lon`, che apre Apple Maps direttamente in modalità
//   direzioni con destinazione preimpostata. iOS non offre un selettore
//   globale di app di mappe — l'utente che ne preferisce un'altra deve
//   aprirla manualmente.
//   Riferimento: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
//
// Desktop e altri ambienti: fallback sull'URL web di Google Maps, che è
//   universale e non richiede alcuna app.
export function linkMappeMobile(lat, lon, nome = '', ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  if (/android/i.test(ua)) {
    const q = nome ? `${lat},${lon}(${encodeURIComponent(nome)})` : `${lat},${lon}`
    return `geo:${lat},${lon}?q=${q}`
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return `maps://?daddr=${lat},${lon}`
  }
  return linkGoogleMaps(lat, lon, nome)
}
