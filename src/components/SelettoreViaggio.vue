<script setup>
import { computed } from 'vue'

const props = defineProps({
  viaggi: { type: Array, required: true }
})
const emit = defineEmits(['seleziona', 'elimina', 'apriCarica'])

function etichettaData(ms) {
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

function etichettaDim(byte) {
  if (!byte) return ''
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}

const ordinati = computed(() => [...props.viaggi])
</script>

<template>
  <div class="selettore">
    <div class="card">
      <h2>Quale viaggio vuoi aprire?</h2>
      <ul class="lista">
        <li v-for="v in ordinati" :key="v.id">
          <button type="button" class="riga" @click="emit('seleziona', v.id)">
            <div class="riga-principale">
              <strong>{{ v.json?.viaggio?.titolo || v.id }}</strong>
              <span v-if="v.json?.viaggio?.sottotitolo" class="riga-sub">{{ v.json.viaggio.sottotitolo }}</span>
            </div>
            <div class="riga-meta">
              <span>Importato il {{ etichettaData(v.importatoIl) }}</span>
              <span v-if="v.origine" class="origine">· {{ v.origine }}</span>
              <span>· {{ etichettaDim(v.dimensioneByte) }}</span>
            </div>
          </button>
          <button type="button" class="btn-elimina" :title="`Elimina &quot;${v.id}&quot;`" @click="emit('elimina', v.id)">✕</button>
        </li>
      </ul>
      <div class="azioni">
        <button type="button" class="btn primario" @click="emit('apriCarica')">+ Carica un altro viaggio</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selettore {
  display: grid;
  place-items: start center;
  padding: 1rem;
}
.card {
  width: 100%;
  max-width: 40rem;
  padding: 1.25rem;
  border: 1px solid var(--bordo);
  border-radius: 0.75rem;
  background: var(--card-bg);
}
.card h2 {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}
.lista {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lista li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem;
  align-items: stretch;
}
.riga {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--bordo);
  border-radius: 0.4rem;
  background: transparent;
  color: var(--fg);
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.riga:hover { background: var(--hover); }
.riga-principale { display: flex; flex-direction: column; gap: 0.1rem; }
.riga-sub { color: var(--muted); font-size: 0.85rem; }
.riga-meta { font-size: 0.75rem; color: var(--muted); }
.origine { text-transform: capitalize; }

.btn-elimina {
  border: 1px solid var(--bordo);
  background: transparent;
  color: var(--muted);
  border-radius: 0.4rem;
  width: 2.25rem;
  cursor: pointer;
  font-size: 1rem;
}
.btn-elimina:hover { background: var(--avvertenza-bg); color: var(--avvertenza-fg); }

.azioni { display: flex; justify-content: flex-start; }
.btn.primario {
  padding: 0.5rem 0.9rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 0.4rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
