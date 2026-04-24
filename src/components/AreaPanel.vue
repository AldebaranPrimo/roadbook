<script setup>
import PuntoCard from './PuntoCard.vue'

const props = defineProps({
  area: { type: Object, required: true },
  categorie: { type: Object, required: true },
  eVisitato: { type: Function, required: true },
  leggiNota: { type: Function, required: true },
  puntoEvidenziato: { type: Number, default: null }
})
const emit = defineEmits(['toggleVisitato', 'cambiaNota', 'focusPunto'])

function categoriaDi(punto) {
  return props.categorie[punto.categoria] || {}
}
</script>

<template>
  <section class="area-panel">
    <header class="intestazione">
      <h2>{{ area.nome }}</h2>
      <p v-if="area.intro" class="intro">{{ area.intro }}</p>
      <p class="meta-area">
        <span>{{ area.punti.length }} punti</span>
        <span v-if="area.modalita">· {{ area.modalita === 'piedi' ? 'a piedi' : 'in auto' }}</span>
        <span v-for="t in area.tags" :key="t" class="tag">#{{ t }}</span>
      </p>
    </header>

    <div class="lista-punti">
      <PuntoCard
        v-for="p in area.punti"
        :key="p.n"
        :punto="p"
        :area-id="area.id"
        :categoria="categoriaDi(p)"
        :visitato="eVisitato(area.id, p.n)"
        :nota="leggiNota(area.id, p.n)"
        :evidenziato="puntoEvidenziato === p.n"
        @toggle-visitato="emit('toggleVisitato', area.id, p.n)"
        @cambia-nota="(t) => emit('cambiaNota', area.id, p.n, t)"
        @focus="(n) => emit('focusPunto', area.id, n)"
      />
    </div>
  </section>
</template>

<style scoped>
.area-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}
.intestazione h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--fg);
}
.intro {
  margin: 0.35rem 0 0;
  color: var(--fg);
  font-size: 0.9rem;
  line-height: 1.45;
}
.meta-area {
  margin: 0.35rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tag {
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--bordo);
  border-radius: 999px;
}

.lista-punti {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media print {
  .area-panel { padding: 0; }
  .lista-punti { gap: 0.75rem; }
  .intestazione h2 { font-size: 1.25rem; }
}
</style>
