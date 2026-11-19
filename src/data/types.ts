/** [longitud, latitud] en WGS84, igual que GeoJSON. */
export type Coordenada = [lng: number, lat: number]

export interface LineString {
  type: 'LineString'
  coordinates: Coordenada[]
}

export interface Ruta {
  id: string
  /** Como la conoce la gente, ej. "Ruta 7 Centro". */
  nombrePopular: string
  empresa: string
  /** Pasaje aproximado en pesos colombianos (COP). */
  tarifaAprox: number
  barrios: string[]
  /** Color de la línea en el mapa, hex "#RRGGBB". */
  color: string
  /** Última verificación en campo, "YYYY-MM-DD". */
  fechaVerificacion: string
  /** true mientras el recorrido sea inventado (no grabado con GPS). */
  esDemo: boolean
  /** Recorrido en un solo sentido. */
  geometria: LineString
}

export interface Paradero {
  id: string
  rutaId: string
  /** Referencia popular, ej. "Frente a la Universidad Simón Bolívar". */
  nombre: string
  coordenadas: Coordenada
  /** Posición en el recorrido, empezando en 1. */
  orden: number
}

export type TipoLugar = 'universidad' | 'centro_comercial' | 'barrio' | 'hospital' | 'otro'

export interface Lugar {
  id: string
  nombre: string
  /** Formas populares de llamarlo, ej. ["Ventura", "CC Ventura Plaza"]. */
  alias: string[]
  coordenadas: Coordenada
  tipo: TipoLugar
}

/** Origen o destino de un viaje. Si viene del GPS, solo vive en memoria. */
export interface PuntoViaje {
  coord: Coordenada
  nombre: string
  fuente: 'gps' | 'lugar' | 'mapa' | 'simulado'
}

// ---- Forma de los archivos en public/data/ ----

export type PropiedadesRuta = Omit<Ruta, 'geometria'>
export type PropiedadesParadero = Omit<Paradero, 'coordenadas'>

export interface FeatureRuta {
  type: 'Feature'
  properties: PropiedadesRuta
  geometry: LineString
}

export interface FeatureParadero {
  type: 'Feature'
  properties: PropiedadesParadero
  geometry: { type: 'Point'; coordinates: Coordenada }
}

export interface ColeccionRutas {
  type: 'FeatureCollection'
  features: FeatureRuta[]
}

export interface ColeccionParaderos {
  type: 'FeatureCollection'
  features: FeatureParadero[]
}

export interface ArchivoLugares {
  lugares: Lugar[]
}
