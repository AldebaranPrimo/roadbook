import { useRegisterSW } from 'virtual:pwa-register/vue'

// Stato condiviso del lifecycle del service worker. Usa il modulo virtuale
// esposto da vite-plugin-pwa. `needRefresh` diventa true quando Workbox ha
// scaricato una nuova versione del SW e la tiene in "waiting": solo
// l'attivazione esplicita (via skipWaiting) fa passare l'app alla nuova build.
//
// `updateServiceWorker(true)` fa proprio questo: skipWaiting + reload della
// pagina. Lo esponiamo al toast di aggiornamento per dare all'utente un
// "aggiorna ora" che forza la nuova versione invece di aspettare la
// prossima chiusura della tab.
let _stato = null

export function useAggiornamentoPwa() {
  if (_stato) return _stato

  const { needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
    immediate: true,
    onRegisterError(err) {
      // non bloccare mai l'app per un errore di registrazione SW
      // eslint-disable-next-line no-console
      console.warn('Roadbook: registrazione service worker fallita', err)
    }
  })

  _stato = {
    aggiornamentoDisponibile: needRefresh,
    appPrimaInstallazione: offlineReady,
    aggiornaOra: () => updateServiceWorker(true)
  }
  return _stato
}
