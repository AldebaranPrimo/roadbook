import { ref, watchEffect } from 'vue'
import { leggiPreferenza, salvaPreferenza } from '../utils/store-viaggi.js'

// tema: 'chiaro' | 'scuro' | 'auto'
const tema = ref('auto')
let inizializzato = false

async function inizializza() {
  if (inizializzato) return
  inizializzato = true
  const salvato = await leggiPreferenza('tema', 'auto')
  tema.value = salvato

  watchEffect(() => {
    const root = document.documentElement
    if (tema.value === 'auto') {
      root.removeAttribute('data-tema')
    } else {
      root.setAttribute('data-tema', tema.value)
    }
  })
}

export function useTema() {
  inizializza()

  function imposta(nuovo) {
    if (!['chiaro', 'scuro', 'auto'].includes(nuovo)) return
    tema.value = nuovo
    salvaPreferenza('tema', nuovo).catch(() => {})
  }

  function prossimo() {
    const ordine = ['chiaro', 'scuro', 'auto']
    const idx = ordine.indexOf(tema.value)
    imposta(ordine[(idx + 1) % ordine.length])
  }

  return { tema, imposta, prossimo }
}
