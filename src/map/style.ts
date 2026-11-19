import { layers, namedFlavor } from '@protomaps/basemaps'
import type { StyleSpecification } from 'maplibre-gl'
import { ATTRIBUTION } from './config'

/**
 * Estilo claro de Protomaps con etiquetas en español.
 * Teselas, fuentes y sprites se sirven desde la propia app (public/), nunca
 * desde servidores externos, para que todo quede en la caché sin conexión.
 */
export function buildStyle(): StyleSpecification {
  // MapLibre necesita URLs absolutas para glifos y sprites.
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).href

  return {
    version: 8,
    glyphs: `${base}fonts/{fontstack}/{range}.pbf`,
    sprite: `${base}sprites/light`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${base}tiles/cucuta.pmtiles`,
        attribution: ATTRIBUTION,
      },
    },
    layers: layers('protomaps', namedFlavor('light'), { lang: 'es' }),
  }
}
