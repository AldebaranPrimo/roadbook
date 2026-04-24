import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// base deve corrispondere al path di GitHub Pages (https://AldebaranPrimo.github.io/roadbook/)
export default defineConfig({
  base: '/roadbook/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'viaggi/*.json'],
      manifest: {
        name: 'Roadbook',
        short_name: 'Roadbook',
        description: 'Itinerari di viaggio, online e offline.',
        lang: 'it',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        runtimeCaching: [
          {
            // tile CartoDB (provider raccomandato dalle specifiche §7.1)
            urlPattern: ({ url }) => url.hostname.endsWith('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // OSRM pubblico: dati freschi se online, cache se offline
            urlPattern: ({ url }) => url.hostname === 'router.project-osrm.org',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'osrm-routes',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    open: true
  }
})
