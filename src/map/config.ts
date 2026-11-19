import type { LngLatBoundsLike, LngLatLike } from 'maplibre-gl'

/** Centro de Cúcuta (lng, lat). */
export const CUCUTA_CENTER: LngLatLike = [-72.5078, 7.8939]
export const INITIAL_ZOOM = 13

/** Área metropolitana cubierta por public/tiles/cucuta.pmtiles. */
export const TILES_BBOX: [number, number, number, number] = [-72.56, 7.8, -72.42, 7.98]

/** Límite de navegación: el bbox con un pequeño margen. */
const PAD = 0.03
export const MAX_BOUNDS: LngLatBoundsLike = [
  [TILES_BBOX[0] - PAD, TILES_BBOX[1] - PAD],
  [TILES_BBOX[2] + PAD, TILES_BBOX[3] + PAD],
]

export const MIN_ZOOM = 11
/** Las teselas llegan a z15; MapLibre sobreescala los vectores por encima. */
export const MAX_ZOOM = 18

export const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© colaboradores de OpenStreetMap</a> · ' +
  '<a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>'
