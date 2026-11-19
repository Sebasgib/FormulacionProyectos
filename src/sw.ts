/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  addPlugins,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// PMTiles lee cucuta.pmtiles con cabeceras "Range". La precarga guarda el
// archivo completo; este plugin recorta la respuesta en caché y devuelve un
// 206 con el rango pedido, así el mapa funciona sin conexión.
addPlugins([new RangeRequestsPlugin()])

precacheAndRoute(self.__WB_MANIFEST)

// Navegación (SPA): siempre servir index.html desde la caché.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Rangos de glifos que no se precargan (caracteres poco comunes): se guardan
// la primera vez que se piden.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/fonts/'),
  new CacheFirst({
    cacheName: 'glifos-extra',
    plugins: [new ExpirationPlugin({ maxEntries: 60 })],
  }),
)
