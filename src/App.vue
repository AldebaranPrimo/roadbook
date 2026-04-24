<script setup>
import { ref, onMounted } from 'vue'

const viaggio = ref(null)
const errore = ref(null)
const caricamento = ref(true)

// per GitHub Pages il base path è /roadbook/, import.meta.env.BASE_URL lo risolve
const BASE = import.meta.env.BASE_URL

onMounted(async () => {
  try {
    const res = await fetch(`${BASE}viaggi/viaggio-friuli-2026.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    viaggio.value = await res.json()
  } catch (e) {
    errore.value = e.message
  } finally {
    caricamento.value = false
  }
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Roadbook</h1>
      <p v-if="viaggio" class="sottotitolo">{{ viaggio.viaggio?.titolo }}</p>
    </header>

    <main class="app-main">
      <p v-if="caricamento">Caricamento viaggio…</p>
      <p v-else-if="errore" class="errore">Errore: {{ errore }}</p>
      <section v-else-if="viaggio">
        <p v-if="viaggio.viaggio?.sottotitolo">{{ viaggio.viaggio.sottotitolo }}</p>
        <p>Aree: {{ viaggio.aree?.length ?? 0 }} — punti totali: {{ viaggio.aree?.reduce((s, a) => s + (a.punti?.length ?? 0), 0) ?? 0 }}</p>
        <p class="nota-dev">Scheletro pronto. Lo sviluppo dei componenti (mappa, tab, lista, popup, note personali) continua in VS Code.</p>
      </section>
    </main>
  </div>
</template>
