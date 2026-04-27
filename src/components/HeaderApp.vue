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
    <!-- Riga 1: marchio a sinistra, azioni globali a destra. (B-4 fase 2) -->
    <div class="header-riga-marchio">
      <h1 class="marchio">
        Roadbook
        <span class="versione" :title="`Build ${APP_BUILD_SHA}`">v{{ APP_VERSION }}</span>
      </h1>
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
    </div>
    <!-- Riga 2 + 3: titolo viaggio (riga 2) + sottotitolo (riga 3) a tutta larghezza.
         L'intera area apre la modal Informazioni viaggio (B-4 fase 1: niente
         bottone ⓘ inline). Senza vincolo di larghezza dell'asse flex orizzontale,
         l'ellipsis si attiva solo quando il titolo eccede davvero la larghezza
         dell'header (B-4 fase 2). -->
    <div
      v-if="viaggio"
      class="viaggio-info"
      role="button"
      tabindex="0"
      title="Informazioni viaggio"
      aria-label="Apri informazioni viaggio"
      @click="emit('apriInfo')"
      @keydown.enter.prevent="emit('apriInfo')"
      @keydown.space.prevent="emit('apriInfo')"
    >
      <p class="titolo-viaggio">{{ viaggio.titolo }}</p>
      <p v-if="viaggio.sottotitolo" class="sottotitolo">{{ viaggio.sottotitolo }}</p>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: block;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--bordo);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 50;
}
.header-riga-marchio {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 24px;
}
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin: 0.15rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--fg);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}
/* L'intera area viaggio-info è cliccabile: hover/focus segnalati senza chevron
   per restare sobri (B-4). */
.viaggio-info {
  cursor: pointer;
  border-radius: 4px;
}
.viaggio-info:hover .titolo-viaggio { color: var(--accent); }
.viaggio-info:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.sottotitolo {
  margin: 0.05rem 0 0;
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
  .azioni { display: none; }
  .app-header { position: static; border: none; padding: 0 0 0.5rem; }
  .marchio { display: none; }
  .viaggio-info { cursor: default; }
  .titolo-viaggio { font-size: 1.4rem; white-space: normal; }
  .sottotitolo { white-space: normal; }
}
</style>
