<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  aree: { type: Array, required: true },
  areaCorrenteId: [Number, null]
})
const emit = defineEmits(['seleziona'])

const container = ref(null)

watch(() => props.areaCorrenteId, async (id) => {
  await nextTick()
  const el = container.value?.querySelector(`[data-id="${id}"]`)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }
})
</script>

<template>
  <nav ref="container" class="area-tabs" aria-label="Aree del viaggio">
    <button
      v-for="a in aree"
      :key="a.id"
      :data-id="a.id"
      type="button"
      class="tab"
      :class="{ attivo: a.id === areaCorrenteId }"
      :aria-current="a.id === areaCorrenteId ? 'true' : null"
      @click="emit('seleziona', a.id)"
    >
      <span class="numero">{{ a.id }}</span>
      <span class="nome">{{ a.nome }}</span>
    </button>
  </nav>
</template>

<style scoped>
.area-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.5rem 0.5rem 0.5rem;
  border-bottom: 1px solid var(--bordo);
  background: var(--bg);
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}
.tab {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--bordo);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tab:hover { background: var(--hover); }
.tab.attivo {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.numero {
  display: inline-grid;
  place-items: center;
  min-width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.08);
  font-weight: 600;
  font-size: 0.75rem;
}
.tab.attivo .numero { background: rgba(255,255,255,0.25); }
.nome { white-space: nowrap; }

@media print {
  .area-tabs { display: none; }
}
</style>
