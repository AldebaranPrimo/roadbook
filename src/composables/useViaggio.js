import { ref, computed } from 'vue'
import { leggiViaggio } from '../utils/store-viaggi.js'

// Viaggio corrente caricato (singolo, condiviso in tutta l'app).
const viaggioRecord = ref(null)
const areaCorrenteId = ref(null)
const caricamento = ref(false)
const errore = ref(null)

export function useViaggio() {
  const viaggio = computed(() => viaggioRecord.value?.json || null)
  const aree = computed(() => viaggio.value?.aree || [])
  const categorie = computed(() => viaggio.value?.categorie || {})
  const areaCorrente = computed(() => aree.value.find(a => a.id === areaCorrenteId.value) || aree.value[0] || null)

  async function carica(id) {
    caricamento.value = true
    errore.value = null
    try {
      const record = await leggiViaggio(id)
      if (!record) throw new Error(`Viaggio "${id}" non trovato nello storage.`)
      viaggioRecord.value = record
      areaCorrenteId.value = record.json.aree?.[0]?.id ?? null
    } catch (e) {
      errore.value = e.message
    } finally {
      caricamento.value = false
    }
  }

  function scarica() {
    viaggioRecord.value = null
    areaCorrenteId.value = null
  }

  function selezionaArea(id) {
    if (aree.value.some(a => a.id === id)) {
      areaCorrenteId.value = id
    }
  }

  return {
    viaggio, aree, categorie, areaCorrente, areaCorrenteId,
    caricamento, errore,
    carica, scarica, selezionaArea
  }
}
