import { ref, watch } from 'vue'
import { tutteNoteDi, salvaNota, chiavePunto } from '../utils/store-viaggi.js'

const note = ref({}) // { chiave: testo }
const viaggioIdCaricato = ref(null)

async function caricaPer(viaggioId) {
  if (viaggioIdCaricato.value === viaggioId) return
  note.value = await tutteNoteDi(viaggioId)
  viaggioIdCaricato.value = viaggioId
}

export function useNote(viaggioIdRef) {
  watch(
    () => viaggioIdRef?.value,
    (id) => { if (id) caricaPer(id) },
    { immediate: true }
  )

  function leggi(areaId, n) {
    const id = viaggioIdRef?.value
    if (!id) return ''
    return note.value[chiavePunto(id, areaId, n)] || ''
  }

  async function scrivi(areaId, n, testo) {
    const id = viaggioIdRef?.value
    if (!id) return
    const chiave = chiavePunto(id, areaId, n)
    const pulito = (testo ?? '').trim()
    if (!pulito) {
      const copia = { ...note.value }
      delete copia[chiave]
      note.value = copia
    } else {
      note.value = { ...note.value, [chiave]: pulito }
    }
    try {
      await salvaNota(id, areaId, n, pulito)
    } catch { /* errore di scrittura non critico */ }
  }

  return { note, leggi, scrivi }
}
