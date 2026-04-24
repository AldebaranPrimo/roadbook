<script setup>
import { computed } from 'vue'
import { useTema } from '../composables/useTema.js'

const props = defineProps({
  viaggio: Object,
  mostraAzioni: { type: Boolean, default: true }
})
const emit = defineEmits(['apriInfo', 'apriCarica', 'cambiaViaggio'])

const { tema, prossimo } = useTema()

const etichettaTema = computed(() => {
  if (tema.value === 'chiaro') return '☀︎ Chiaro'
  if (tema.value === 'scuro') return '☾ Scuro'
  return '◐ Auto'
})
</script>

<template>
  <header class="app-header">
    <div class="titoli">
      <h1 class="marchio">Roadbook</h1>
      <div v-if="viaggio" class="viaggio-info">
        <p class="titolo-viaggio">{{ viaggio.titolo }}</p>
        <p v-if="viaggio.sottotitolo" class="sottotitolo">{{ viaggio.sottotitolo }}</p>
      </div>
    </div>
    <div v-if="mostraAzioni" class="azioni">
      <button v-if="viaggio" class="btn-ghost" type="button" title="Cambia viaggio" @click="emit('cambiaViaggio')">⇄</button>
      <button class="btn-ghost" type="button" :title="`Tema: ${etichettaTema}`" @click="prossimo">{{ etichettaTema }}</button>
      <button class="btn-ghost" type="button" title="Carica viaggio" @click="emit('apriCarica')">+</button>
      <button v-if="viaggio" class="btn-ghost" type="button" title="Informazioni viaggio" @click="emit('apriInfo')">ⓘ</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--bordo);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 50;
}
.titoli { flex: 1; min-width: 0; }
.marchio {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
}
.titolo-viaggio {
  margin: 0.1rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--fg);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sottotitolo {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.azioni {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
@media print {
  .azioni { display: none; }
  .app-header { position: static; border: none; padding: 0 0 0.5rem; }
  .marchio { display: none; }
  .titolo-viaggio { font-size: 1.4rem; white-space: normal; }
  .sottotitolo { white-space: normal; }
}
</style>
