<script setup>
import { computed } from 'vue'
import {
  linkGoogleMaps, linkWaze, linkAppleMaps,
  linkNavigaPredefinito, etichettaMappaPredefinita
} from '../utils/mappe-esterne.js'

const props = defineProps({
  punto: { type: Object, required: true },
  areaId: { type: Number, required: true },
  categoria: { type: Object, default: () => ({}) },
  visitato: { type: Boolean, default: false },
  nota: { type: String, default: '' },
  evidenziato: { type: Boolean, default: false }
})
const emit = defineEmits(['toggleVisitato', 'cambiaNota', 'focus'])

const etichettaMappa = etichettaMappaPredefinita()

const colore = computed(() => props.categoria.colore || '#888')
const labelCategoria = computed(() => props.categoria.label || props.punto.categoria)
const emoji = computed(() => props.categoria.icona_emoji || '')

function onInputNota(e) {
  emit('cambiaNota', e.target.value)
}
function onBlurNota(e) {
  emit('cambiaNota', e.target.value, true)
}
</script>

<template>
  <article
    :id="`punto-${areaId}-${punto.n}`"
    class="punto-card"
    :class="{ visitato, evidenziato }"
    :style="{ '--bordo-categoria': colore }"
    @click="emit('focus', punto.n)"
  >
    <header class="testata">
      <span class="pallino-numero" :style="{ background: colore }" :aria-label="`Punto ${punto.n}`">{{ punto.n }}</span>
      <div class="testata-testo">
        <h3 class="nome">{{ punto.name }}</h3>
        <p class="categoria">
          <span v-if="emoji" aria-hidden="true">{{ emoji }}</span>
          <span>{{ labelCategoria }}</span>
        </p>
      </div>
      <label class="checkbox-visitato" @click.stop>
        <input type="checkbox" :checked="visitato" @change="emit('toggleVisitato')" />
        <span>Visitato</span>
      </label>
    </header>

    <p class="desc">{{ punto.desc }}</p>

    <p v-if="punto.avvertenze" class="avvertenze">⚠ {{ punto.avvertenze }}</p>

    <dl v-if="punto.orari || punto.costo || punto.telefono || punto.sito_web || punto.note_pratiche" class="meta">
      <template v-if="punto.orari">
        <dt>Orari</dt><dd>{{ punto.orari }}</dd>
      </template>
      <template v-if="punto.costo">
        <dt>Costo</dt><dd>{{ punto.costo }}</dd>
      </template>
      <template v-if="punto.telefono">
        <dt>Telefono</dt><dd><a :href="`tel:${punto.telefono}`">{{ punto.telefono }}</a></dd>
      </template>
      <template v-if="punto.sito_web">
        <dt>Sito</dt><dd><a :href="punto.sito_web" target="_blank" rel="noopener">{{ punto.sito_web }}</a></dd>
      </template>
      <template v-if="punto.note_pratiche">
        <dt>Note pratiche</dt><dd>{{ punto.note_pratiche }}</dd>
      </template>
    </dl>

    <div v-if="punto.foto?.length" class="foto" @click.stop>
      <a v-for="(f, i) in punto.foto" :key="i" :href="f" target="_blank" rel="noopener">
        <img :src="f" :alt="`Foto ${i+1} di ${punto.name}`" loading="lazy" />
      </a>
    </div>

    <div class="azioni" @click.stop>
      <a class="btn" :href="linkNavigaPredefinito(punto.lat, punto.lon, punto.name)" target="_blank" rel="noopener">{{ etichettaMappa }}</a>
      <a class="btn" :href="linkWaze(punto.lat, punto.lon)" target="_blank" rel="noopener">Waze</a>
      <a class="btn" :href="linkGoogleMaps(punto.lat, punto.lon, punto.name)" target="_blank" rel="noopener">Google</a>
      <a class="btn" :href="linkAppleMaps(punto.lat, punto.lon, punto.name)" target="_blank" rel="noopener">Apple</a>
    </div>

    <details class="blocco-nota" @click.stop>
      <summary>
        Note personali<span v-if="nota" class="segnala-nota">•</span>
      </summary>
      <textarea
        :value="nota"
        placeholder="Appunti personali per questo punto…"
        rows="3"
        @input="onInputNota"
        @blur="onBlurNota"
      ></textarea>
    </details>
  </article>
</template>

<style scoped>
.punto-card {
  border: 1px solid var(--bordo);
  border-left: 4px solid var(--bordo-categoria);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: var(--card-bg);
  display: grid;
  gap: 0.5rem;
  cursor: pointer;
  scroll-margin-top: 4.5rem;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.punto-card.evidenziato {
  box-shadow: 0 0 0 2px var(--accent) inset;
}
.punto-card.visitato {
  opacity: 0.75;
}
.punto-card.visitato .nome {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.testata {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: start;
}
.pallino-numero {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.testata-testo { min-width: 0; }
.nome {
  margin: 0;
  font-size: 1rem;
  line-height: 1.25;
  color: var(--fg);
}
.categoria {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: var(--muted);
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
.checkbox-visitato {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}

.desc {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--fg);
}

.avvertenze {
  margin: 0;
  padding: 0.4rem 0.6rem;
  background: var(--avvertenza-bg);
  color: var(--avvertenza-fg);
  border-radius: 0.35rem;
  font-size: 0.85rem;
  line-height: 1.35;
}

.meta {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.5rem;
  row-gap: 0.15rem;
  font-size: 0.82rem;
}
.meta dt { color: var(--muted); font-weight: 600; }
.meta dd { margin: 0; color: var(--fg); word-break: break-word; }
.meta a { color: var(--accent); text-decoration: none; }
.meta a:hover { text-decoration: underline; }

.foto {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
}
.foto img {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 0.3rem;
  flex-shrink: 0;
}

.azioni {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.btn {
  display: inline-block;
  padding: 0.35rem 0.6rem;
  background: var(--btn-bg);
  color: var(--fg);
  border: 1px solid var(--bordo);
  border-radius: 0.35rem;
  font-size: 0.78rem;
  text-decoration: none;
  white-space: nowrap;
}
.btn:hover { background: var(--hover); }

.blocco-nota summary {
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
  list-style: revert;
}
.segnala-nota {
  display: inline-block;
  margin-left: 0.25rem;
  color: var(--accent);
  font-weight: 700;
}
.blocco-nota textarea {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.4rem;
  border: 1px solid var(--bordo);
  border-radius: 0.35rem;
  background: var(--card-bg);
  color: var(--fg);
  font: inherit;
  font-size: 0.85rem;
  resize: vertical;
}

@media print {
  .punto-card {
    break-inside: avoid;
    page-break-inside: avoid;
    cursor: default;
    box-shadow: none !important;
    opacity: 1 !important;
  }
  .azioni, .checkbox-visitato, .blocco-nota { display: none; }
  .foto img { max-width: 6cm; max-height: 4cm; }
}
</style>
