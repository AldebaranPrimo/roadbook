<script setup>
import { computed } from 'vue'
import { useGeolocalizzazione } from '../composables/useGeolocalizzazione.js'

const props = defineProps({
  aperto: { type: Boolean, default: false },
  viaggio: Object,
  conteggioVisitati: { type: Number, default: 0 },
  totalePunti: { type: Number, default: 0 }
})
const emit = defineEmits(['chiudi', 'stampa', 'elimina', 'esportaBackup', 'importaBackup', 'ricalcolaRouting'])

const v = computed(() => props.viaggio?.viaggio || null)
const categorie = computed(() => Object.entries(props.viaggio?.categorie || {}))

const { stato: statoGeo, errore: erroreGeo, posizione: posizioneUtente, richiedi: richiediGeo } = useGeolocalizzazione()

function percentuale() {
  if (!props.totalePunti) return 0
  return Math.round((props.conteggioVisitati / props.totalePunti) * 100)
}

function etichettaStatoGeo() {
  switch (statoGeo.value) {
    case 'attiva': return 'Posizione rilevata in tempo reale.'
    case 'richiesta': return 'Rilevamento in corso…'
    case 'negata': return 'Accesso alla posizione negato. Per abilitarlo, concedi il permesso dal browser e riprova.'
    case 'errore': return `Errore: ${erroreGeo.value || 'sconosciuto'}`
    default: return 'Geolocalizzazione non attiva.'
  }
}
</script>

<template>
  <dialog v-if="aperto" open class="modal" aria-labelledby="titolo-info">
    <div class="contenuto">
      <header>
        <h2 id="titolo-info">{{ v?.titolo || 'Informazioni' }}</h2>
        <button type="button" class="chiudi" aria-label="Chiudi" @click="emit('chiudi')">✕</button>
      </header>

      <p v-if="v?.sottotitolo" class="sottotitolo">{{ v.sottotitolo }}</p>

      <section v-if="v?.descrizione_estesa">
        <h3>Descrizione</h3>
        <p>{{ v.descrizione_estesa }}</p>
      </section>

      <section v-if="v?.partenza || v?.rientro">
        <h3>Partenza e rientro</h3>
        <p v-if="v?.partenza">
          <strong>Partenza:</strong> {{ v.partenza.nome }}
          <span v-if="v.partenza.quando"> — {{ v.partenza.quando }}</span>
        </p>
        <p v-if="v?.rientro">
          <strong>Rientro:</strong> {{ v.rientro.nome }}
          <span v-if="v.rientro.descrizione"> — {{ v.rientro.descrizione }}</span>
        </p>
      </section>

      <section v-if="v?.documenti_richiesti">
        <h3>Documenti</h3>
        <p>{{ v.documenti_richiesti }}</p>
      </section>

      <section>
        <h3>Avanzamento</h3>
        <p>Visitati {{ conteggioVisitati }} / {{ totalePunti }} punti ({{ percentuale() }}%)</p>
        <div class="barra">
          <div class="riempimento" :style="{ width: percentuale() + '%' }"></div>
        </div>
      </section>

      <section>
        <h3>Posizione corrente</h3>
        <p>{{ etichettaStatoGeo() }}</p>
        <p v-if="posizioneUtente" class="coord">
          {{ posizioneUtente.lat.toFixed(5) }}, {{ posizioneUtente.lon.toFixed(5) }}
          <span class="muted">(precisione ±{{ Math.round(posizioneUtente.accuracy) }} m)</span>
        </p>
        <button
          v-if="statoGeo !== 'attiva' && statoGeo !== 'richiesta'"
          type="button"
          class="btn"
          @click="richiediGeo"
        >Attiva posizione corrente</button>
      </section>

      <section v-if="categorie.length">
        <h3>Legenda categorie</h3>
        <ul class="legenda">
          <li v-for="[k, def] in categorie" :key="k">
            <span class="pallino" :style="{ background: def.colore }"></span>
            <span v-if="def.icona_emoji" class="emoji">{{ def.icona_emoji }}</span>
            <span>{{ def.label }}</span>
          </li>
        </ul>
      </section>

      <section>
        <h3>Azioni</h3>
        <div class="azioni">
          <button type="button" class="btn" @click="emit('stampa')">Stampa viaggio</button>
          <button type="button" class="btn" @click="emit('ricalcolaRouting')">Ricalcola percorso area</button>
          <button type="button" class="btn" @click="emit('esportaBackup')">Esporta backup</button>
          <label class="btn">
            Importa backup
            <input type="file" accept="application/json,.json" hidden @change="emit('importaBackup', $event)" />
          </label>
          <button type="button" class="btn pericolo" @click="emit('elimina')">Elimina questo viaggio</button>
        </div>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: grid;
  place-items: center;
}
.contenuto {
  width: min(92vw, 36rem);
  max-height: 90vh;
  overflow: auto;
  background: var(--card-bg);
  color: var(--fg);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
.contenuto header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}
.contenuto h2 { margin: 0; font-size: 1.15rem; }
.contenuto h3 { margin: 0 0 0.35rem; font-size: 0.95rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.contenuto section p { margin: 0 0 0.35rem; line-height: 1.5; }
.sottotitolo { color: var(--muted); margin: -0.5rem 0 0; }
.chiudi { background: transparent; border: none; color: var(--muted); cursor: pointer; font-size: 1.1rem; }

.barra {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--bordo);
  overflow: hidden;
  margin-top: 0.35rem;
}
.riempimento {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

.coord { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
.coord .muted { color: var(--muted); font-weight: normal; }

.legenda { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.35rem; }
.legenda li { display: flex; gap: 0.35rem; align-items: center; font-size: 0.9rem; }
.pallino { width: 0.85rem; height: 0.85rem; border-radius: 50%; flex-shrink: 0; }
.emoji { font-size: 1rem; }

.azioni { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.btn {
  padding: 0.4rem 0.75rem;
  background: var(--btn-bg);
  color: var(--fg);
  border: 1px solid var(--bordo);
  border-radius: 0.35rem;
  font: inherit;
  cursor: pointer;
}
.btn:hover { background: var(--hover); }
.btn.pericolo { color: var(--errore); border-color: var(--errore); }
.btn.pericolo:hover { background: var(--avvertenza-bg); }
</style>
