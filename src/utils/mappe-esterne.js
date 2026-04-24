// Deep link a navigatori esterni con rilevamento OS lato client.

function rilevaPiattaforma() {
  if (typeof navigator === 'undefined') return 'altro'
  const ua = (navigator.userAgent || '').toLowerCase()
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/.test(ua)) return 'android'
  if (/mac/.test(ua)) return 'mac'
  return 'altro'
}

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

// Link primario "apri in mappe" sensato in base all'OS.
export function linkNavigaPredefinito(lat, lon, nome = '') {
  const p = rilevaPiattaforma()
  if (p === 'ios' || p === 'mac') return linkAppleMaps(lat, lon, nome)
  return linkGoogleMaps(lat, lon, nome)
}

export function etichettaMappaPredefinita() {
  const p = rilevaPiattaforma()
  if (p === 'ios' || p === 'mac') return 'Mappe'
  return 'Google Maps'
}
