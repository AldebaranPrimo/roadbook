<script setup>
const props = defineProps({
  nessunEsempio: { type: Boolean, default: false },
  errore: { type: String, default: '' }
})
const emit = defineEmits(['apriCarica'])
</script>

<template>
  <div class="onboarding">
    <div class="card">
      <h2>Benvenuto in Roadbook</h2>
      <p>
        Roadbook mostra itinerari di viaggio organizzati per aree, con descrizioni,
        mappa e percorsi, e funziona anche offline dopo il primo caricamento.
      </p>
      <p v-if="nessunEsempio" class="avviso">
        Non è stato trovato nessun viaggio di esempio. Carica il tuo file JSON per iniziare.
      </p>
      <p v-else>
        Stiamo caricando il viaggio di esempio…
      </p>
      <p v-if="errore" class="errore">{{ errore }}</p>
      <div class="azioni">
        <button type="button" class="btn primario" @click="emit('apriCarica')">Carica un viaggio</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
}
.card {
  max-width: 32rem;
  padding: 1.5rem;
  border: 1px solid var(--bordo);
  border-radius: 0.75rem;
  background: var(--card-bg);
  text-align: center;
}
.card h2 {
  margin: 0 0 0.5rem;
  color: var(--accent);
}
.card p {
  margin: 0 0 0.75rem;
  line-height: 1.5;
  color: var(--fg);
}
.avviso { color: var(--muted); }
.errore { color: var(--errore); white-space: pre-line; }
.azioni { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
.btn.primario {
  padding: 0.55rem 1rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 0.4rem;
  font-weight: 600;
  cursor: pointer;
}
.btn.primario:hover { filter: brightness(1.05); }
</style>
