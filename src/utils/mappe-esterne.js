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
