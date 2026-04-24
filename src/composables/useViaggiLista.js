import { ref, computed } from 'vue'
import {
  listaViaggi, salvaViaggio, eliminaViaggio, leggiViaggio
} from '../utils/store-viaggi.js'
import { validaViaggio } from '../utils/valida-schema.js'

const viaggi = ref([])
const caricato = ref(false)
const errore = ref(null)

async function ricarica() {
  try {
    viaggi.value = await listaViaggi()
    caricato.value = true
  } catch (e) {
    errore.value = e.message
  }
}

export function useViaggiLista() {
  if (!caricato.value) ricarica()

  const elenco = computed(() => viaggi.value)

  async function importa(json, origine = 'file') {
    const esito = validaViaggio(json)
    if (!esito.valido) {
      const e = new Error('JSON non valido:\n' + esito.errori.join('\n'))
      e.esitoValidazione = esito
      throw e
    }
    const id = json.viaggio.id
    const esistente = await leggiViaggio(id)
    const record = await salvaViaggio({ id, json, origine })
    await ricarica()
    return { record, sovrascritto: !!esistente, avvisi: esito.avvisi }
  }

  async function rimuovi(id) {
    await eliminaViaggio(id)
    await ricarica()
  }

  async function esiste(id) {
    return !!(await leggiViaggio(id))
  }

  return { viaggi: elenco, caricato, errore, importa, rimuovi, esiste, ricarica }
}
