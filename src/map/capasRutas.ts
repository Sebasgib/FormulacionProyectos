import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  LngLatBoundsLike,
  Map as MapLibreMap,
  PointLike,
} from 'maplibre-gl'
import type { DatosRutas } from '../data/cargarDatos'
import type { Coordenada } from '../data/types'

const FUENTE_RUTAS = 'rutas'
const FUENTE_PARADEROS = 'paraderos'
const FUENTE_CAMINATA = 'caminata'
const CAPA_CAMINATA = 'caminata-linea'
const CAPA_RUTAS_BORDE = 'rutas-borde'
export const CAPA_RUTAS = 'rutas-linea'
export const CAPA_PARADEROS = 'paraderos-circulo'

/** Lo que hay bajo el dedo: una ruta y, si se tocó un paradero, cuál. */
export interface OpcionToque {
  rutaId: string
  paraderoId?: string
}

/** Margen de toque en píxeles: un dedo no es un puntero. */
const MARGEN_TOQUE = 12

export function agregarCapasRutas(map: MapLibreMap, datos: DatosRutas) {
  const rutas = datos.rutasGeojson.features.map((f) => f.properties)
  if (rutas.length === 0) return

  // Varias rutas comparten calles: cada una se desplaza unos píxeles para que
  // se vean lado a lado en vez de taparse.
  const desplazamiento: ExpressionSpecification = [
    'match',
    ['get', 'id'],
    ...rutas.flatMap((r, i) => [r.id, i - (rutas.length - 1) / 2]),
    0,
  ] as unknown as ExpressionSpecification
  const lineOffset: DataDrivenPropertyValueSpecification<number> = [
    'interpolate',
    ['linear'],
    ['zoom'],
    11,
    ['*', desplazamiento, 2],
    15,
    ['*', desplazamiento, 5],
  ]

  // Los paraderos toman el color de su ruta.
  const colorParadero: ExpressionSpecification = [
    'match',
    ['get', 'rutaId'],
    ...rutas.flatMap((r) => [r.id, r.color]),
    '#333333',
  ] as unknown as ExpressionSpecification

  map.addSource(FUENTE_RUTAS, {
    type: 'geojson',
    data: datos.rutasGeojson as GeoJSONSourceSpecification['data'],
  })
  map.addSource(FUENTE_PARADEROS, {
    type: 'geojson',
    data: datos.paraderosGeojson as GeoJSONSourceSpecification['data'],
  })

  // Encima del mapa base pero debajo de las etiquetas (primera capa de símbolos).
  const primeraEtiqueta = map.getStyle().layers.find((l) => l.type === 'symbol')?.id

  map.addLayer(
    {
      id: CAPA_RUTAS_BORDE,
      type: 'line',
      source: FUENTE_RUTAS,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-offset': lineOffset },
    },
    primeraEtiqueta,
  )
  map.addLayer(
    {
      id: CAPA_RUTAS,
      type: 'line',
      source: FUENTE_RUTAS,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-offset': lineOffset },
    },
    primeraEtiqueta,
  )
  // Tramos a pie del viaje elegido (origen → abordaje, bajada → destino).
  map.addSource(FUENTE_CAMINATA, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: CAPA_CAMINATA,
    type: 'line',
    source: FUENTE_CAMINATA,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#1f2937', 'line-width': 3.5, 'line-dasharray': [0.1, 2] },
  })

  // Los paraderos van encima de todo para que ninguna etiqueta los tape.
  map.addLayer({
    id: CAPA_PARADEROS,
    type: 'circle',
    source: FUENTE_PARADEROS,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 14, 6, 17, 8],
      'circle-color': '#ffffff',
      'circle-stroke-color': colorParadero,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 14, 3],
    },
  })
}

/**
 * Atenúa las demás rutas y sube la elegida encima. `null` = todas normales.
 * Con `soloEsa`, las demás se ocultan del todo (filtro: tampoco se pueden tocar).
 */
export function resaltarRuta(map: MapLibreMap, rutaId: string | null, soloEsa = false) {
  if (!map.getLayer(CAPA_RUTAS)) return
  const esElegida: ExpressionSpecification = ['==', ['get', 'id'], rutaId ?? '']
  const esDeElegida: ExpressionSpecification = ['==', ['get', 'rutaId'], rutaId ?? '']

  const filtrar = soloEsa && rutaId !== null
  map.setFilter(CAPA_RUTAS_BORDE, filtrar ? esElegida : null)
  map.setFilter(CAPA_RUTAS, filtrar ? esElegida : null)
  map.setFilter(CAPA_PARADEROS, filtrar ? esDeElegida : null)
  const opacidadLinea: DataDrivenPropertyValueSpecification<number> = rutaId
    ? ['case', esElegida, 1, 0.25]
    : 1
  const opacidadParadero: DataDrivenPropertyValueSpecification<number> = rutaId
    ? ['case', esDeElegida, 1, 0.2]
    : 1
  const orden: DataDrivenPropertyValueSpecification<number> = ['case', esElegida, 1, 0]
  const ordenParadero: DataDrivenPropertyValueSpecification<number> = ['case', esDeElegida, 1, 0]

  for (const capa of [CAPA_RUTAS_BORDE, CAPA_RUTAS]) {
    map.setPaintProperty(capa, 'line-opacity', opacidadLinea)
    map.setLayoutProperty(capa, 'line-sort-key', orden)
  }
  map.setPaintProperty(CAPA_PARADEROS, 'circle-opacity', opacidadParadero)
  map.setPaintProperty(CAPA_PARADEROS, 'circle-stroke-opacity', opacidadParadero)
  map.setLayoutProperty(CAPA_PARADEROS, 'circle-sort-key', ordenParadero)
}

/**
 * Rutas bajo el punto tocado. Si hay paraderos, mandan ellos (son más
 * pequeños y precisos); si no, las líneas. Sin repetir rutas.
 */
export function rutasEnPunto(map: MapLibreMap, x: number, y: number): OpcionToque[] {
  const caja: [PointLike, PointLike] = [
    [x - MARGEN_TOQUE, y - MARGEN_TOQUE],
    [x + MARGEN_TOQUE, y + MARGEN_TOQUE],
  ]
  const opciones = new Map<string, OpcionToque>()

  for (const f of map.queryRenderedFeatures(caja, { layers: [CAPA_PARADEROS] })) {
    const rutaId = String(f.properties.rutaId)
    if (!opciones.has(rutaId)) opciones.set(rutaId, { rutaId, paraderoId: String(f.properties.id) })
  }
  if (opciones.size === 0) {
    for (const f of map.queryRenderedFeatures(caja, { layers: [CAPA_RUTAS] })) {
      const rutaId = String(f.properties.id)
      if (!opciones.has(rutaId)) opciones.set(rutaId, { rutaId })
    }
  }
  return [...opciones.values()]
}

/** Dibuja los tramos a pie (pares de puntos). Lista vacía = borrar. */
export function dibujarCaminata(map: MapLibreMap, tramos: [Coordenada, Coordenada][]) {
  const fuente = map.getSource<GeoJSONSource>(FUENTE_CAMINATA)
  fuente?.setData({
    type: 'FeatureCollection',
    features: tramos.map((t) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: t } })),
  })
}

export function limites(puntos: readonly Coordenada[]): LngLatBoundsLike {
  let oeste = Infinity, sur = Infinity, este = -Infinity, norte = -Infinity
  for (const [lng, lat] of puntos) {
    oeste = Math.min(oeste, lng)
    este = Math.max(este, lng)
    sur = Math.min(sur, lat)
    norte = Math.max(norte, lat)
  }
  return [
    [oeste, sur],
    [este, norte],
  ]
}
