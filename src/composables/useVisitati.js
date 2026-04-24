import { ref, computed, watch } from 'vue'
import { tuttiVisitatiDi, impostaVisitato, chiavePunto } from '../utils/store-viaggi.js'

const visitati = ref({}) // { chiave: true }
const viaggioIdCaricato = ref(null)

async function caricaPer(viaggioId) {
  if (viaggioIdCaricato.value === viaggioId) return
  visitati.value = await tuttiVisitatiDi(viaggioId)
  viaggioIdCaricato.value = viaggioId
}

export function useVisitati(viaggioIdRef) {
  watch(
    () => viaggioIdRef?.value,
    (id) => { if (id) caricaPer(id) },
    { immediate: true }
  )

  function eVisitato(areaId, n) {
    const id = viaggioIdRef?.value
    if (!id) return false
    return !!visitati.value[chiavePunto(id, areaId, n)]
  }

  async function toggle(areaId, n) {
    const id = viaggioIdRef?.value
    if (!id) return
    const chiave = chiavePunto(id, areaId, n)
    const nuovo = !visitati.value[chiave]
    if (nuovo) {
      visitati.value = { ...visitati.value, [chiave]: true }
    } else {
      const copia = { ...visitati.value }
      delete copia[chiave]
      visitati.value = copia
    }
    try {
      await impostaVisitato(id, areaId, n, nuovo)
    } catch { /* rollback silenzioso non critico */ }
  }

  const conteggio = computed(() => Object.keys(visitati.value).length)

  return { visitati, eVisitato, toggle, conteggio }
}
