import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Plugin locale: genera public/viaggi/manifest.json con l'elenco dei JSON
// presenti nella cartella, sia in dev (via middleware) sia in build (via
// writeBundle). Lo scopo è permettere all'app di scoprire automaticamente
// il primo viaggio di esempio disponibile senza hardcode nel codice.
function manifestViaggiEsempio() {
  const dirPublic = path.resolve('public/viaggi')

  function elenca() {
    try {
      return fs
        .readdirSync(dirPublic)
        .filter(f => f.endsWith('.json') && f !== 'manifest.json')
        .sort()
    } catch {
      return []
    }
  }

  function payload() {
    return JSON.stringify({ files: elenca() }, null, 2)
  }

  return {
    name: 'roadbook-manifest-viaggi',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.split('?')[0].endsWith('/viaggi/manifest.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(payload())
          return
        }
        next()
      })
    },
    configurePreviewServer(server) {
      // In preview il file statico generato in dist/ viene servito direttamente.
      // Nulla da fare qui.
    },
    writeBundle(options) {
      const outDir = options.dir || 'dist'
      const destDir = path.resolve(outDir, 'viaggi')
      fs.mkdirSync(destDir, { recursive: true })
      fs.writeFileSync(path.join(destDir, 'manifest.json'), payload())
    }
  }
}

export default defineConfig({
  base: '/roadbook/',
  plugins: [
    vue(),
    manifestViaggiEsempio(),
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
            // tile CartoDB (Voyager, Positron, Dark Matter)
            urlPattern: ({ url }) => url.hostname.endsWith('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-carto',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // tile OpenStreetMap standard
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-osm',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // tile OpenTopoMap (topografica, utile in montagna)
            urlPattern: ({ url }) => url.hostname.endsWith('tile.opentopomap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-topo',
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
    open: false
  },
  preview: {
    port: 4173,
    open: false
  }
})
