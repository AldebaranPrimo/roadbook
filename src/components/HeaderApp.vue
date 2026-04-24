<script setup>
import { computed } from 'vue'
import { useTema } from '../composables/useTema.js'

const props = defineProps({
  viaggio: Object,
  mostraAzioni: { type: Boolean, default: true }
})
const emit = defineEmits(['apriInfo', 'apriCarica', 'cambiaViaggio'])

const { tema, prossimo } = useTema()

// Iniettati a build-time da vite.config.js
const APP_VERSION = __APP_VERSION__
const APP_BUILD_SHA = __APP_BUILD_SHA__

const etichettaTema = computed(() => {
  if (tema.value === 'chiaro') return '☀︎ Chiaro'
  if (tema.value === 'scuro') return '☾ Scuro'
  return '◐ Auto'
})
</script>

<template>
  <header class="app-header">
    <div class="titoli">
      <h1 class="marchio">
        Roadbook
        <span class="versione" :title="`Build ${APP_BUILD_SHA}`">v{{ APP_VERSION }}</span>
      </h1>
      <div v-if="viaggio" class="viaggio-info">
        <p class="titolo-viaggio">
          {{ viaggio.titolo }}
          <!-- Info è contestuale al viaggio corrente: vive vicino al titolo, non tra le azioni globali. -->
          <button
            type="button"
            class="btn-info-viaggio"
            title="Informazioni viaggio"
            aria-label="Apri informazioni viaggio"
            @click="emit('apriInfo')"
          >ⓘ</button>
        </p>
        <p v-if="viaggio.sottotitolo" class="sottotitolo">{{ viaggio.sottotitolo }}</p>
      </div>
    </div>
    <div v-if="mostraAzioni" class="azioni">
      <button v-if="viaggio" class="btn-ghost" type="button" title="Cambia viaggio" @click="emit('cambiaViaggio')">⇄</button>
      <button class="btn-ghost" type="button" :title="`Tema: ${etichettaTema}`" @click="prossimo">{{ etichettaTema }}</button>
      <button class="btn-ghost" type="button" title="Carica viaggio" @click="emit('apriCarica')">+</button>
      <a
        class="btn-ghost"
        href="https://github.com/AldebaranPrimo/roadbook"
        target="_blank"
        rel="noopener"
        title="Progetto su GitHub"
        aria-label="Apri il repository GitHub in una nuova scheda"
      >
        <!-- GitHub mark — SVG inline, 16×16, colore eredita currentColor -->
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
            0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53
            .63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
            0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
            .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15
            0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38
            A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
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
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}
.versione {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--muted);
  opacity: 0.75;
  cursor: help;
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
/* Bottone info viaggio inline col titolo: piccolo, senza bordo, in tono muted.
   Distinto dai btn-ghost globali perché contestuale al viaggio corrente. */
.btn-info-viaggio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.3rem;
  padding: 0 0.1rem;
  background: transparent;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  vertical-align: middle;
  opacity: 0.8;
}
.btn-info-viaggio:hover { opacity: 1; color: var(--accent); }
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
  align-items: center;
}
@media print {
  .azioni, .btn-info-viaggio { display: none; }
  .app-header { position: static; border: none; padding: 0 0 0.5rem; }
  .marchio { display: none; }
  .titolo-viaggio { font-size: 1.4rem; white-space: normal; }
  .sottotitolo { white-space: normal; }
}
</style>
