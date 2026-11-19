import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const THEME_COLOR = '#0F7B5F'

// Ruta donde se publica la app. En local es "/"; en GitHub Pages el workflow
// pasa BASE_PATH=/<nombre-del-repo>/ (la app vive en usuario.github.io/<repo>/).
const BASE = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // Service worker propio (src/sw.ts) para poder añadir RangeRequestsPlugin
      // a la precarga: PMTiles pide el archivo por rangos de bytes.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // se registra en src/main.tsx
      manifest: {
        name: 'Stationnow',
        short_name: 'Stationnow',
        description: 'Rutas de buseta en Cúcuta, también sin conexión.',
        lang: 'es-CO',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // App + mapa completo (teselas, fuentes y sprites) quedan en caché
        // desde la primera visita.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webmanifest,pbf,json,geojson,pmtiles}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
})
