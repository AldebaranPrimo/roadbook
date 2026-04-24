// Scoperta automatica dei JSON di esempio: legge il manifest generato
// a build-time (vedi plugin in vite.config.js) e ritorna il primo file disponibile.

const BASE = import.meta.env.BASE_URL

export async function elencoEsempi() {
  try {
    const res = await fetch(`${BASE}viaggi/manifest.json`, { cache: 'no-cache' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.files) ? data.files : []
  } catch {
    return []
  }
}

export async function caricaEsempio(nomeFile) {
  const res = await fetch(`${BASE}viaggi/${encodeURIComponent(nomeFile)}`)
  if (!res.ok) throw new Error(`Impossibile caricare "${nomeFile}" (HTTP ${res.status}).`)
  return res.json()
}

export async function primoEsempio() {
  const files = await elencoEsempi()
  if (files.length === 0) return null
  const primo = files[0]
  const json = await caricaEsempio(primo)
  return { file: primo, json }
}
