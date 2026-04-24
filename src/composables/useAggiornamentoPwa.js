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
//
// Controllo periodico: il browser controlla il SW aggiornamento solo a
// ogni navigation, ma le PWA installate non navigano mai (la tab resta
// aperta per giorni). Senza un check periodico, gli utenti su mobile
// restano indefinitamente sulla vecchia versione. L'intervallo di 60
// minuti è un compromesso tra freschezza e traffico di rete minimo.
const INTERVALLO_CONTROLLO_MS = 60 * 60 * 1000

let _stato = null

export function useAggiornamentoPwa() {
  if (_stato) return _stato

  const { needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      // Controllo periodico dell'aggiornamento. `registration.update()` fa
      // un HEAD request al SW remoto: se l'hash è cambiato, Workbox scarica
      // il nuovo SW e lo mette in "waiting" → needRefresh diventa true →
      // toast. Se l'hash è uguale, zero traffico aggiuntivo oltre al HEAD.
      setInterval(() => {
        registration.update().catch(() => {
          // offline o rete transitoriamente rotta: ritenteremo al prossimo tick
        })
      }, INTERVALLO_CONTROLLO_MS)
    },
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
