// Costanti iniettate a build-time da vite.config.js tramite l'opzione `define`.
// Questo file serve solo al TS/JS language server dell'editor per riconoscerle;
// il progetto è JS puro, Vite sostituisce letteralmente i token nel bundle.

declare const __APP_VERSION__: string
declare const __APP_BUILD_SHA__: string
declare const __APP_BUILD_DATE__: string
