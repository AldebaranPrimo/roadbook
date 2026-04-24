<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ottieniPercorso } from '../utils/routing-osrm.js'
import { useTema } from '../composables/useTema.js'

const props = defineProps({
  viaggioId: { type: String, required: true },
  area: { type: Object, required: true },
  categorie: { type: Object, required: true },
  eVisitato: { type: Function, required: true },
  puntoEvidenziato: { type: Number, default: null }
})
const emit = defineEmits(['clickPunto', 'stato'])

const contenitore = ref(null)
let mappa = null
let strato = null
let gruppoMarker = null
let polyline = null
const origineRouting = ref(null) // 'cache' | 'osrm' | 'retta'

const { tema } = useTema()

const schemaScuro = computed(() => {
  if (tema.value === 'scuro') return true
  if (tema.value === 'chiaro') return false
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
})

function urlTile() {
  return schemaScuro.value
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
}

function creaMarker(punto) {
  const cat = props.categorie[punto.categoria] || {}
  const colore = cat.colore || '#888'
  const visitato = props.eVisitato(props.area.id, punto.n)
  const html = `
    <div class="marker-roadbook" style="background:${colore};${visitato ? 'opacity:0.55;border-style:dashed;' : ''}">
      <span>${punto.n}</span>
    </div>`
  const icona = L.divIcon({
    className: 'marker-roadbook-wrap',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
  const m = L.marker([punto.lat, punto.lon], { icon: icona, title: punto.name })
  const categoriaLabel = cat.label || punto.categoria
  const emoji = cat.icona_emoji || ''
  m.bindPopup(`
    <div class="popup-roadbook">
      <strong>${punto.n}. ${escapeHtml(punto.name)}</strong>
      <small>${emoji} ${escapeHtml(categoriaLabel)}</small>
      <p>${escapeHtml(troncaDesc(punto.desc, 180))}</p>
      <button type="button" class="btn-vai" data-n="${punto.n}">Dettagli →</button>
    </div>`, { closeButton: true, maxWidth: 260 })
  m.on('click', () => {
    emit('clickPunto', punto.n)
  })
  m.on('popupopen', (e) => {
    const btn = e.popup.getElement()?.querySelector('.btn-vai')
    if (btn) btn.addEventListener('click', () => emit('clickPunto', punto.n), { once: true })
  })
  return m
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}
function troncaDesc(s, max) {
  const t = String(s || '')
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

async function disegna() {
  if (!mappa) return

  if (gruppoMarker) { gruppoMarker.remove(); gruppoMarker = null }
  if (polyline) { polyline.remove(); polyline = null }

  const punti = props.area?.punti || []
  if (punti.length === 0) return

  gruppoMarker = L.layerGroup(punti.map(creaMarker)).addTo(mappa)

  // fit bounds sui punti
  const bounds = L.latLngBounds(punti.map(p => [p.lat, p.lon]))
  if (bounds.isValid()) {
    mappa.fitBounds(bounds, { padding: [30, 30], maxZoom: 13, animate: false })
  }

  // routing: prima cache, poi OSRM, poi retta
  const modalita = props.area.modalita === 'piedi' ? 'piedi' : 'auto'
  const esito = await ottieniPercorso({
    viaggioId: props.viaggioId,
    areaId: props.area.id,
    punti,
    modalita
  })
  origineRouting.value = esito.origine
  emit('stato', { origine: esito.origine, punti: punti.length })

  const stile = esito.origine === 'retta'
    ? { color: '#888', weight: 3, opacity: 0.65, dashArray: '6 6' }
    : { color: '#16a34a', weight: 4, opacity: 0.85 }
  polyline = L.polyline(esito.coord, stile).addTo(mappa)
}

function evidenziaMarker(n) {
  if (!gruppoMarker || n == null) return
  const target = gruppoMarker.getLayers().find(m => m.options?.title && props.area.punti.find(p => p.n === n && p.name === m.options.title))
  if (!target) return
  mappa.flyTo(target.getLatLng(), Math.max(mappa.getZoom(), 13), { duration: 0.6 })
  target.openPopup()
}

function aggiornaTile() {
  if (!mappa) return
  if (strato) strato.remove()
  strato = L.tileLayer(urlTile(), {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(mappa)
}

onMounted(() => {
  mappa = L.map(contenitore.value, {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: false
  }).setView([45.7, 12.5], 8)
  aggiornaTile()
  disegna()
})

onBeforeUnmount(() => {
  if (mappa) { mappa.remove(); mappa = null }
})

watch(() => props.area, () => disegna())
watch(schemaScuro, () => aggiornaTile())
watch(() => props.puntoEvidenziato, (n) => {
  if (n != null) evidenziaMarker(n)
})

defineExpose({ evidenziaMarker, ricalcolaRouting: async () => {
  const modalita = props.area.modalita === 'piedi' ? 'piedi' : 'auto'
  const esito = await ottieniPercorso({
    viaggioId: props.viaggioId,
    areaId: props.area.id,
    punti: props.area.punti,
    modalita,
    forzaAggiornamento: true
  })
  if (polyline) polyline.remove()
  const stile = esito.origine === 'retta'
    ? { color: '#888', weight: 3, opacity: 0.65, dashArray: '6 6' }
    : { color: '#16a34a', weight: 4, opacity: 0.85 }
  polyline = L.polyline(esito.coord, stile).addTo(mappa)
  origineRouting.value = esito.origine
  emit('stato', { origine: esito.origine, punti: props.area.punti.length })
  return esito.origine
}})
</script>

<template>
  <div class="mappa-wrapper">
    <div ref="contenitore" class="mappa" aria-label="Mappa dell'area"></div>
    <p v-if="origineRouting === 'retta'" class="banner-retta" role="status">
      Percorso non ancora calcolato: mostrata linea retta tra i punti. Riapri l'area online per calcolare il percorso reale.
    </p>
  </div>
</template>

<style>
/* Non scoped: Leaflet usa selettori globali nei popup/div icon */
.marker-roadbook-wrap { background: transparent; border: none; }
.marker-roadbook {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
}
.popup-roadbook strong { display: block; margin-bottom: 0.15rem; font-size: 0.95rem; }
.popup-roadbook small { display: block; color: #6b7280; margin-bottom: 0.35rem; font-size: 0.75rem; }
.popup-roadbook p { margin: 0 0 0.4rem; font-size: 0.85rem; line-height: 1.35; }
.popup-roadbook .btn-vai {
  padding: 0.3rem 0.6rem;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 0.3rem;
  font-size: 0.8rem;
  cursor: pointer;
}
</style>

<style scoped>
.mappa-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
}
.mappa {
  width: 100%;
  height: 100%;
  min-height: 240px;
}
.banner-retta {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  bottom: 0.5rem;
  margin: 0;
  padding: 0.4rem 0.6rem;
  background: var(--avvertenza-bg);
  color: var(--avvertenza-fg);
  border-radius: 0.35rem;
  font-size: 0.78rem;
  line-height: 1.3;
  z-index: 400;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
@media print {
  .mappa-wrapper { display: none; }
}
</style>
