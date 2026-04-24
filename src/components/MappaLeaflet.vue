<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ottieniPercorso } from '../utils/routing-osrm.js'
import { useTema } from '../composables/useTema.js'
import { leggiPreferenza, salvaPreferenza } from '../utils/store-viaggi.js'

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
let controlLayers = null
let layerPerId = {} // id → tileLayer Leaflet
let layerAttivoId = 'osm'
let gruppoMarker = null
let polyline = null
const origineRouting = ref(null) // 'cache' | 'osrm' | 'retta'

const { tema } = useTema()

// Fornitori tile disponibili. L'id è la chiave salvata in preferenze.
// filtraScuro: se true, in tema scuro applica un filtro CSS per invertire la
// luminosità mantenendo gli hue (trucco classico per mappe chiare → versione
// scura leggibile).
const PROVIDERS = {
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc'
    },
    filtraScuro: true
  },
  voyager: {
    label: 'CartoDB Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }
  },
  positron: {
    label: 'CartoDB Positron',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }
  },
  topo: {
    label: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      attribution: 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, SRTM · Style © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
      maxZoom: 17,
      subdomains: 'abc'
    }
  },
  dark: {
    label: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }
  }
}

const schemaScuro = computed(() => {
  if (tema.value === 'scuro') return true
  if (tema.value === 'chiaro') return false
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches
})

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

  const bounds = L.latLngBounds(punti.map(p => [p.lat, p.lon]))
  if (bounds.isValid()) {
    mappa.fitBounds(bounds, { padding: [30, 30], maxZoom: 13, animate: false })
  }

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

function aggiornaFiltroScuro() {
  if (!mappa) return
  const provider = PROVIDERS[layerAttivoId]
  const attivo = !!(provider?.filtraScuro && schemaScuro.value)
  mappa.getPane('tilePane')?.classList.toggle('tile-scuro-invertito', attivo)
}

function applicaLayer(id) {
  if (!mappa) return
  const idFinale = PROVIDERS[id] ? id : 'osm'
  for (const [k, layer] of Object.entries(layerPerId)) {
    if (k === idFinale) {
      if (!mappa.hasLayer(layer)) layer.addTo(mappa)
    } else {
      if (mappa.hasLayer(layer)) mappa.removeLayer(layer)
    }
  }
  layerAttivoId = idFinale
  aggiornaFiltroScuro()
}

onMounted(async () => {
  mappa = L.map(contenitore.value, {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: false
  }).setView([45.7, 12.5], 8)

  // pre-creo tutti i tile layer (così il control.layers ha tutti gli ingressi)
  const mapping = {}
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const layer = L.tileLayer(p.url, p.options)
    layerPerId[id] = layer
    mapping[p.label] = layer
  }

  // decido il layer di default: preferenza salvata, altrimenti OSM
  const salvato = await leggiPreferenza('stileMappa', 'osm')
  const idIniziale = PROVIDERS[salvato] ? salvato : 'osm'
  applicaLayer(idIniziale)

  controlLayers = L.control.layers(mapping, null, { collapsed: true, position: 'topright' }).addTo(mappa)

  mappa.on('baselayerchange', (e) => {
    const id = Object.keys(PROVIDERS).find(k => PROVIDERS[k].label === e.name)
    if (id) {
      layerAttivoId = id
      salvaPreferenza('stileMappa', id).catch(() => {})
      aggiornaFiltroScuro()
    }
  })

  disegna()
})

onBeforeUnmount(() => {
  if (mappa) { mappa.remove(); mappa = null }
})

watch(() => props.area, () => disegna())
watch(schemaScuro, () => aggiornaFiltroScuro())
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
/* Non scoped: Leaflet usa selettori globali nei popup / divicon / pane */
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

/* Filtro CSS invertito per rendere leggibile uno stile chiaro (OSM) in tema scuro.
   Applicato solo al tilePane: marker, polyline e controlli restano come sono.
   invert(1) + hue-rotate(180deg) preserva gli hue dominanti (blu dei fiumi,
   verde del verde) invertendo la luminosità. brightness e contrast rifiniscono
   la resa. */
.leaflet-tile-pane.tile-scuro-invertito {
  filter: invert(1) hue-rotate(180deg) brightness(1.05) contrast(0.92) saturate(0.95);
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
