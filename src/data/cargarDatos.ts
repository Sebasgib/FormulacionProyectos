import type { ArchivoLugares, ColeccionParaderos, ColeccionRutas, Lugar, Paradero, Ruta } from './types'

export interface DatosRutas {
  /** GeoJSON tal cual, para las fuentes del mapa. */
  rutasGeojson: ColeccionRutas
  paraderosGeojson: ColeccionParaderos
  rutas: Map<string, Ruta>
  /** Paraderos de cada ruta, ya ordenados por `orden`. */
  paraderosPorRuta: Map<string, Paradero[]>
  lugares: Lugar[]
}

const base = import.meta.env.BASE_URL

async function leerJson<T>(ruta: string): Promise<T> {
  // El service worker responde desde la precarga, también sin conexión.
  const res = await fetch(`${base}${ruta}`)
  if (!res.ok) throw new Error(`No se pudo leer ${ruta} (${res.status})`)
  return (await res.json()) as T
}

export async function cargarDatosRutas(): Promise<DatosRutas> {
  const [rutasGeojson, paraderosGeojson, archivoLugares] = await Promise.all([
    leerJson<ColeccionRutas>('data/rutas.geojson'),
    leerJson<ColeccionParaderos>('data/paraderos.geojson'),
    leerJson<ArchivoLugares>('data/lugares.json'),
  ])

  const rutas = new Map<string, Ruta>()
  for (const f of rutasGeojson.features) {
    rutas.set(f.properties.id, { ...f.properties, geometria: f.geometry })
  }

  const paraderosPorRuta = new Map<string, Paradero[]>()
  for (const f of paraderosGeojson.features) {
    const p: Paradero = { ...f.properties, coordenadas: f.geometry.coordinates }
    const lista = paraderosPorRuta.get(p.rutaId) ?? []
    lista.push(p)
    paraderosPorRuta.set(p.rutaId, lista)
  }
  for (const lista of paraderosPorRuta.values()) lista.sort((a, b) => a.orden - b.orden)

  return { rutasGeojson, paraderosGeojson, rutas, paraderosPorRuta, lugares: archivoLugares.lugares }
}
