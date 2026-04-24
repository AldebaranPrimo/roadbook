<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import HeaderApp from './components/HeaderApp.vue'
import AreaTabs from './components/AreaTabs.vue'
import AreaPanel from './components/AreaPanel.vue'
import MappaLeaflet from './components/MappaLeaflet.vue'
import ModalInfo from './components/ModalInfo.vue'
import ModalCaricaViaggio from './components/ModalCaricaViaggio.vue'
import OnboardingVuoto from './components/OnboardingVuoto.vue'
import SelettoreViaggio from './components/SelettoreViaggio.vue'

import { useViaggio } from './composables/useViaggio.js'
import { useViaggiLista } from './composables/useViaggiLista.js'
import { useVisitati } from './composables/useVisitati.js'
import { useNote } from './composables/useNote.js'
import { primoEsempio } from './utils/esempi.js'
import { validaViaggio } from './utils/valida-schema.js'
import {
  esportaBackup as dumpBackup,
  importaBackup as loadBackup,
  leggiViaggio,
  esportaViaggioSingolo,
  ripristinaAnnotazioni
} from './utils/store-viaggi.js'

const {
  viaggio, aree, categorie, areaCorrente, areaCorrenteId,
  carica: caricaViaggio, scarica, selezionaArea
} = useViaggio()

const { viaggi, caricato: listaCaricata, importa, rimuovi, esiste } = useViaggiLista()

const viaggioIdCorrente = computed(() => viaggio.value?.viaggio?.id || null)
const { eVisitato, toggle: toggleVisitato, conteggio } = useVisitati(viaggioIdCorrente)
const { leggi: leggiNota, scrivi: scriviNota } = useNote(viaggioIdCorrente)

const puntoEvidenziato = ref(null)
const mappaRef = ref(null)
const pannelloRef = ref(null)

const mostraSelettore = ref(false)
const mostraOnboarding = ref(false)
const mostraCarica = ref(false)
const mostraInfo = ref(false)
const erroreOnboarding = ref('')
const nessunEsempio = ref(false)
const messaggio = ref('')

const totalePunti = computed(() => aree.value.reduce((s, a) => s + (a.punti?.length || 0), 0))

async function avvio() {
  // supporta deep link ?viaggio=<url>
  const params = new URLSearchParams(window.location.search)
  const urlViaggio = params.get('viaggio')
  if (urlViaggio) {
    try {
      const res = await fetch(urlViaggio, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const v = validaViaggio(json)
      if (!v.valido) throw new Error('JSON non valido:\n• ' + v.errori.join('\n• '))
      const { record } = await importa(json, 'url')
      await caricaViaggio(record.id)
      return
    } catch (e) {
      erroreOnboarding.value = `Impossibile caricare da URL: ${e.message}`
    }
  }

  // aspetta caricamento lista
  if (!listaCaricata.value) {
    await new Promise(resolve => {
      const stop = watch(listaCaricata, (v) => {
        if (v) { stop(); resolve() }
      })
    })
  }

  if (viaggi.value.length === 0) {
    mostraOnboarding.value = true
    try {
      const es = await primoEsempio()
      if (!es) {
        nessunEsempio.value = true
        return
      }
      const v = validaViaggio(es.json)
      if (!v.valido) {
        erroreOnboarding.value = 'Il viaggio di esempio non è valido: ' + v.errori.join('; ')
        nessunEsempio.value = true
        return
      }
      const { record } = await importa(es.json, 'esempio')
      mostraOnboarding.value = false
      await caricaViaggio(record.id)
    } catch (e) {
      erroreOnboarding.value = e.message
      nessunEsempio.value = true
    }
    return
  }

  if (viaggi.value.length === 1) {
    await caricaViaggio(viaggi.value[0].id)
    return
  }

  mostraSelettore.value = true
}

onMounted(avvio)

async function onImportaDaModal({ json, origine, avvisi, includiAnnotazioni }) {
  try {
    const id = json.viaggio.id
    const giaPresente = await esiste(id)
    if (giaPresente) {
      const ok = window.confirm(`Il viaggio "${id}" esiste già. Vuoi sovrascriverlo?`)
      if (!ok) return
    }
    const { record } = await importa(json, origine)
    if (includiAnnotazioni && json.annotazioni) {
      await ripristinaAnnotazioni(record.id, json.annotazioni)
    }
    mostraCarica.value = false
    await caricaViaggio(record.id)
    mostraSelettore.value = false
    if (includiAnnotazioni && json.annotazioni) {
      const nV = (json.annotazioni.visitati?.length ?? 0)
      const nN = Object.keys(json.annotazioni.note || {}).length
      messaggio.value = `Ripristinate ${nV} visite e ${nN} note dal JSON.`
    } else if (avvisi?.length) {
      messaggio.value = 'Avvisi di validazione:\n• ' + avvisi.join('\n• ')
    }
  } catch (e) {
    alert(`Errore durante l'importazione:\n${e.message}`)
  }
}

async function onSelezionaDaLista(id) {
  mostraSelettore.value = false
  await caricaViaggio(id)
}

async function onEliminaDaLista(id) {
  const ok = window.confirm(`Vuoi eliminare il viaggio "${id}" e tutti i suoi dati (visitati, note, routing)?`)
  if (!ok) return
  await rimuovi(id)
  if (viaggi.value.length === 0) {
    mostraSelettore.value = false
    mostraOnboarding.value = true
  } else if (viaggi.value.length === 1) {
    await caricaViaggio(viaggi.value[0].id)
    mostraSelettore.value = false
  }
}

async function onEliminaCorrente() {
  if (!viaggio.value) return
  const id = viaggio.value.viaggio.id
  const ok = window.confirm(`Vuoi eliminare il viaggio "${id}" e tutti i suoi dati?`)
  if (!ok) return
  await rimuovi(id)
  scarica()
  mostraInfo.value = false
  if (viaggi.value.length === 0) {
    mostraOnboarding.value = true
  } else if (viaggi.value.length === 1) {
    await caricaViaggio(viaggi.value[0].id)
  } else {
    mostraSelettore.value = true
  }
}

function onCambiaViaggio() {
  scarica()
  mostraSelettore.value = true
}

function onTogglePunto(areaId, n) {
  toggleVisitato(areaId, n)
}
function onCambiaNota(areaId, n, testo) {
  scriviNota(areaId, n, testo)
}
function onClickPuntoDaLista(areaId, n) {
  selezionaArea(areaId)
  puntoEvidenziato.value = n
  // delega alla mappa di farne fly-to
}
function onClickPuntoDaMappa(n) {
  puntoEvidenziato.value = n
  // scroll nella lista
  setTimeout(() => {
    const el = document.getElementById(`punto-${areaCorrenteId.value}-${n}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}

async function onEsportaBackup() {
  const dump = await dumpBackup()
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `roadbook-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

async function onEsportaViaggio({ includiAnnotazioni }) {
  if (!viaggio.value) return
  try {
    const id = viaggio.value.viaggio.id
    const json = await esportaViaggioSingolo(id, { includiAnnotazioni })
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = includiAnnotazioni ? `${id}.json` : `${id}-base.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    messaggio.value = includiAnnotazioni
      ? 'Viaggio esportato con note e visitati.'
      : 'Viaggio esportato (senza annotazioni personali).'
  } catch (e) {
    alert(`Errore durante l'esportazione:\n${e.message}`)
  }
}

async function onImportaBackup(ev) {
  const f = ev.target.files?.[0]
  if (!f) return
  try {
    const testo = await f.text()
    const dato = JSON.parse(testo)
    await loadBackup(dato)
    alert('Backup importato con successo. L\'app si ricarica.')
    window.location.reload()
  } catch (e) {
    alert('Errore import backup: ' + e.message)
  }
}

async function onRicalcolaRouting() {
  if (!mappaRef.value?.ricalcolaRouting) return
  const origine = await mappaRef.value.ricalcolaRouting()
  if (origine === 'retta') {
    alert('Impossibile contattare OSRM (offline o errore). Il percorso è ancora una retta.')
  } else {
    messaggio.value = 'Percorso ricalcolato.'
  }
}

function stampa() {
  window.print()
}

function chiudiMessaggio() { messaggio.value = '' }
</script>

<template>
  <div class="app-shell" :class="{ 'ha-viaggio': !!viaggio }">
    <HeaderApp
      :viaggio="viaggio?.viaggio || null"
      @apri-info="mostraInfo = true"
      @apri-carica="mostraCarica = true"
      @cambia-viaggio="onCambiaViaggio"
    />

    <div v-if="messaggio" class="toast" role="status" @click="chiudiMessaggio">{{ messaggio }} <small>(clicca per chiudere)</small></div>

    <template v-if="viaggio">
      <AreaTabs
        :aree="aree"
        :area-corrente-id="areaCorrenteId"
        @seleziona="(id) => { selezionaArea(id); puntoEvidenziato = null }"
      />

      <main class="app-main">
        <div class="pannello-mappa">
          <MappaLeaflet
            v-if="areaCorrente"
            ref="mappaRef"
            :viaggio-id="viaggio.viaggio.id"
            :area="areaCorrente"
            :categorie="categorie"
            :e-visitato="eVisitato"
            :punto-evidenziato="puntoEvidenziato"
            @click-punto="onClickPuntoDaMappa"
          />
        </div>
        <div class="pannello-lista">
          <AreaPanel
            v-if="areaCorrente"
            ref="pannelloRef"
            :area="areaCorrente"
            :categorie="categorie"
            :e-visitato="eVisitato"
            :leggi-nota="leggiNota"
            :punto-evidenziato="puntoEvidenziato"
            @toggle-visitato="onTogglePunto"
            @cambia-nota="onCambiaNota"
            @focus-punto="onClickPuntoDaLista"
          />
        </div>
      </main>
    </template>

    <SelettoreViaggio
      v-else-if="mostraSelettore"
      :viaggi="viaggi"
      @seleziona="onSelezionaDaLista"
      @elimina="onEliminaDaLista"
      @apri-carica="mostraCarica = true"
    />

    <OnboardingVuoto
      v-else-if="mostraOnboarding"
      :nessun-esempio="nessunEsempio"
      :errore="erroreOnboarding"
      @apri-carica="mostraCarica = true"
    />

    <ModalCaricaViaggio
      :aperto="mostraCarica"
      @chiudi="mostraCarica = false"
      @importa="onImportaDaModal"
    />

    <ModalInfo
      :aperto="mostraInfo && !!viaggio"
      :viaggio="viaggio"
      :conteggio-visitati="conteggio"
      :totale-punti="totalePunti"
      @chiudi="mostraInfo = false"
      @stampa="() => { mostraInfo = false; setTimeout(stampa, 200) }"
      @elimina="onEliminaCorrente"
      @esporta-backup="onEsportaBackup"
      @esporta-viaggio="onEsportaViaggio"
      @importa-backup="onImportaBackup"
      @ricalcola-routing="() => { mostraInfo = false; setTimeout(onRicalcolaRouting, 200) }"
    />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
}

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(240px, 40vh) 1fr;
  min-height: 0;
}
.pannello-mappa {
  position: relative;
  min-height: 240px;
  border-bottom: 1px solid var(--bordo);
}
.pannello-lista {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 900px) {
  .app-main {
    grid-template-columns: minmax(380px, 40%) 1fr;
    grid-template-rows: 1fr;
  }
  .pannello-mappa {
    order: 2;
    border-bottom: none;
    border-left: 1px solid var(--bordo);
  }
  .pannello-lista {
    order: 1;
  }
}

.toast {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 0.35rem;
  font-size: 0.85rem;
  white-space: pre-line;
  max-width: 90vw;
  cursor: pointer;
  z-index: 900;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

@media print {
  .app-shell { min-height: 0; }
  .app-main {
    display: block;
    grid-template: none !important;
  }
  .pannello-mappa { display: none; }
  .pannello-lista { overflow: visible; }
  .toast { display: none; }
}
</style>
