<script setup>
import { ref } from 'vue'
import { validaViaggio } from '../utils/valida-schema.js'

const props = defineProps({
  aperto: { type: Boolean, default: false }
})
const emit = defineEmits(['chiudi', 'importa'])

const urlInput = ref('')
const dragAttivo = ref(false)
const caricamento = ref(false)
const errore = ref('')
const esito = ref(null)
const file = ref(null)

function reset() {
  urlInput.value = ''
  errore.value = ''
  esito.value = null
  caricamento.value = false
  dragAttivo.value = false
}

function chiudi() {
  reset()
  emit('chiudi')
}

async function processaJson(jsonRaw, origine) {
  errore.value = ''
  esito.value = null
  let dato
  try {
    dato = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw
  } catch (e) {
    errore.value = 'Il file non è un JSON valido: ' + e.message
    return
  }
  const v = validaViaggio(dato)
  if (!v.valido) {
    errore.value = 'JSON non valido:\n• ' + v.errori.join('\n• ')
    if (v.avvisi.length) errore.value += '\n\nAvvisi:\n• ' + v.avvisi.join('\n• ')
    return
  }
  emit('importa', { json: dato, origine, avvisi: v.avvisi })
}

async function suFile(f) {
  if (!f) return
  caricamento.value = true
  try {
    const testo = await f.text()
    await processaJson(testo, 'file')
  } catch (e) {
    errore.value = 'Errore lettura file: ' + e.message
  } finally {
    caricamento.value = false
  }
}

function onInputFile(ev) {
  const f = ev.target.files?.[0]
  suFile(f)
}

function onDrop(ev) {
  ev.preventDefault()
  dragAttivo.value = false
  const f = ev.dataTransfer?.files?.[0]
  suFile(f)
}
function onDragOver(ev) { ev.preventDefault(); dragAttivo.value = true }
function onDragLeave() { dragAttivo.value = false }

async function scaricaUrl() {
  const u = urlInput.value.trim()
  if (!u) return
  caricamento.value = true
  errore.value = ''
  try {
    const res = await fetch(u, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    await processaJson(json, 'url')
  } catch (e) {
    errore.value = `Impossibile scaricare da "${u}":\n${e.message}\n\nSe il server non espone gli header CORS, scarica il file e trascinalo qui.`
  } finally {
    caricamento.value = false
  }
}
</script>

<template>
  <dialog v-if="aperto" open class="modal" aria-labelledby="titolo-carica">
    <div class="contenuto">
      <header>
        <h2 id="titolo-carica">Carica un viaggio</h2>
        <button type="button" class="chiudi" aria-label="Chiudi" @click="chiudi">✕</button>
      </header>

      <section
        class="dropzone"
        :class="{ attiva: dragAttivo }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <p>Trascina qui un file JSON</p>
        <p class="oppure">oppure</p>
        <label class="btn">
          <input ref="file" type="file" accept="application/json,.json" @change="onInputFile" hidden />
          Scegli un file…
        </label>
      </section>

      <section class="url">
        <label for="carica-url">URL pubblico di un JSON viaggio</label>
        <div class="riga-url">
          <input id="carica-url" v-model="urlInput" type="url" placeholder="https://…/viaggio.json" />
          <button type="button" class="btn" :disabled="caricamento || !urlInput.trim()" @click="scaricaUrl">Scarica</button>
        </div>
      </section>

      <p v-if="caricamento" class="stato">Elaborazione in corso…</p>
      <p v-if="errore" class="errore">{{ errore }}</p>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: grid;
  place-items: center;
}
.contenuto {
  width: min(92vw, 34rem);
  max-height: 90vh;
  overflow: auto;
  background: var(--card-bg);
  color: var(--fg);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
.contenuto header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.contenuto h2 { margin: 0; font-size: 1.1rem; }
.chiudi {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1.1rem;
}
.dropzone {
  border: 2px dashed var(--bordo);
  border-radius: 0.5rem;
  padding: 1.5rem 0.75rem;
  text-align: center;
  transition: background 0.12s, border-color 0.12s;
}
.dropzone.attiva {
  background: var(--hover);
  border-color: var(--accent);
}
.dropzone p { margin: 0; }
.dropzone .oppure { color: var(--muted); margin: 0.5rem 0; }
.btn {
  display: inline-block;
  padding: 0.45rem 0.8rem;
  background: var(--btn-bg);
  color: var(--fg);
  border: 1px solid var(--bordo);
  border-radius: 0.35rem;
  font: inherit;
  cursor: pointer;
}
.btn:hover { background: var(--hover); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.url label {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.35rem;
}
.riga-url {
  display: flex;
  gap: 0.35rem;
}
.riga-url input {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--bordo);
  border-radius: 0.35rem;
  background: var(--card-bg);
  color: var(--fg);
  font: inherit;
}

.stato { color: var(--muted); margin: 0; }
.errore { color: var(--errore); white-space: pre-line; margin: 0; font-size: 0.88rem; }
</style>
