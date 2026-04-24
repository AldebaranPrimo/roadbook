<script setup>
import { ref, computed } from 'vue'
import { validaViaggio, haAnnotazioniNonVuote } from '../utils/valida-schema.js'

const props = defineProps({
  aperto: { type: Boolean, default: false }
})
const emit = defineEmits(['chiudi', 'importa'])

const urlInput = ref('')
const dragAttivo = ref(false)
const caricamento = ref(false)
const errore = ref('')
const file = ref(null)

// Link alle risorse aiuto, costruiti sul base path corrente (funzionano sia in dev
// al path /roadbook/ sia nel deploy Pages, sia con qualsiasi futuro sottopath).
const urlSchema = `${import.meta.env.BASE_URL}schema/viaggio-1.1.md`
const urlFriuli = `${import.meta.env.BASE_URL}viaggi/viaggio-friuli-2026.json`

// Quando il JSON validato ha annotazioni non vuote, la UI si mette in attesa di
// una scelta esplicita a 3 opzioni (importa tutto / solo viaggio / annulla).
const attesaConferma = ref(null) // { json, origine, avvisi }

const conteggioAnnotazioni = computed(() => {
  const ann = attesaConferma.value?.json?.annotazioni
  if (!ann) return { visitati: 0, note: 0 }
  return {
    visitati: Array.isArray(ann.visitati) ? ann.visitati.length : 0,
    note: ann.note && typeof ann.note === 'object' ? Object.keys(ann.note).length : 0
  }
})

function reset() {
  urlInput.value = ''
  errore.value = ''
  caricamento.value = false
  dragAttivo.value = false
  attesaConferma.value = null
}

function chiudi() {
  reset()
  emit('chiudi')
}

async function processaJson(jsonRaw, origine) {
  errore.value = ''
  attesaConferma.value = null
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
  if (haAnnotazioniNonVuote(dato)) {
    // non emette subito, aspetta la scelta dell'utente
    attesaConferma.value = { json: dato, origine, avvisi: v.avvisi }
    return
  }
  emit('importa', { json: dato, origine, avvisi: v.avvisi, includiAnnotazioni: false })
}

function confermaImporta(includiAnnotazioni) {
  if (!attesaConferma.value) return
  const { json, origine, avvisi } = attesaConferma.value
  emit('importa', { json, origine, avvisi, includiAnnotazioni })
  attesaConferma.value = null
}

function annullaImporta() {
  attesaConferma.value = null
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

      <template v-if="attesaConferma">
        <section class="conferma-annotazioni">
          <h3>Annotazioni trovate nel JSON</h3>
          <p>Il file include annotazioni personali di chi l'ha esportato:</p>
          <ul>
            <li v-if="conteggioAnnotazioni.visitati > 0"><strong>{{ conteggioAnnotazioni.visitati }}</strong> punti marcati come visitati</li>
            <li v-if="conteggioAnnotazioni.note > 0"><strong>{{ conteggioAnnotazioni.note }}</strong> note personali</li>
          </ul>
          <p class="avviso">Se importi tutto, qualsiasi annotazione esistente su questo viaggio in locale verrà <strong>sostituita</strong> da quelle del file.</p>
          <div class="azioni-conferma">
            <button type="button" class="btn primario" @click="confermaImporta(true)">Importa tutto</button>
            <button type="button" class="btn" @click="confermaImporta(false)">Solo il viaggio</button>
            <button type="button" class="btn" @click="annullaImporta">Annulla</button>
          </div>
        </section>
      </template>

      <template v-else>
        <details class="help-import">
          <summary>Cos'è un file viaggio e come ottenerlo?</summary>
          <div class="help-contenuto">
            <p>
              Roadbook legge viaggi da <strong>file JSON</strong> con una struttura dichiarata.
              Ogni file descrive un viaggio intero: aree geografiche, punti di interesse, coordinate, foto,
              categorie, orari, note.
            </p>
            <p>
              Puoi produrre un tuo viaggio in due modi:
            </p>
            <ol>
              <li>
                <strong>Partendo da un esempio</strong>: scarica il viaggio <a :href="urlFriuli" target="_blank" rel="noopener">Friuli 2026</a>
                (30 punti in 7 aree) e modificalo a mano.
              </li>
              <li>
                <strong>Con un LLM</strong> (ChatGPT, Claude, Gemini…): copia e passagli questo
                <a :href="urlSchema" target="_blank" rel="noopener">schema della struttura JSON</a>
                e chiedigli <em>"produci un itinerario Roadbook per X"</em>. Otterrai un file pronto da trascinare qui.
              </li>
            </ol>
            <p class="hint">
              Il formato è retrocompatibile: i campi sconosciuti vengono ignorati, così puoi sperimentare estensioni.
            </p>
          </div>
        </details>

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
      </template>
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

.help-import {
  border: 1px solid var(--bordo);
  border-radius: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: var(--hover);
}
.help-import summary {
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--accent);
  font-weight: 600;
  padding: 0.1rem 0;
}
.help-import[open] summary { margin-bottom: 0.5rem; }
.help-contenuto p, .help-contenuto ol, .help-contenuto li {
  font-size: 0.85rem;
  line-height: 1.45;
}
.help-contenuto p { margin: 0 0 0.5rem; }
.help-contenuto ol { margin: 0 0 0.5rem 1.2rem; padding: 0; }
.help-contenuto li { margin-bottom: 0.35rem; }
.help-contenuto a { color: var(--accent); text-decoration: underline; }
.help-contenuto .hint { color: var(--muted); font-size: 0.8rem; margin: 0; }

.conferma-annotazioni h3 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--accent); }
.conferma-annotazioni p { margin: 0 0 0.5rem; line-height: 1.45; }
.conferma-annotazioni ul { margin: 0 0 0.5rem; padding-left: 1.2rem; }
.conferma-annotazioni li { margin-bottom: 0.2rem; }
.conferma-annotazioni .avviso { font-size: 0.85rem; color: var(--muted); }
.azioni-conferma { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.5rem; }
.btn.primario { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
.btn.primario:hover { filter: brightness(1.05); }
</style>
