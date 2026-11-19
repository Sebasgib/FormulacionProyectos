import distance from '@turf/distance'
import type { Coordenada, Paradero, Ruta } from './types'

export interface OpcionesBusqueda {
  /** Máximo a pie (m, línea recta) hasta el paradero de abordaje y desde el de bajada. */
  radioMaximo?: number
  maxResultados?: number
}

export interface ResultadoRuta {
  ruta: Ruta
  abordaje: Paradero
  bajada: Paradero
  /** Metros en línea recta: origen → paradero de abordaje. */
  caminaHastaAbordaje: number
  /** Metros en línea recta: paradero de bajada → destino. */
  caminaDesdeBajada: number
  caminaTotal: number
}

export interface Busqueda {
  /** Ordenados por caminata total, de menor a mayor. */
  resultados: ResultadoRuta[]
  /** false si ninguna ruta sirve y `resultados` trae solo la más cercana. */
  directa: boolean
  aviso?: string
}

const RADIO_POR_DEFECTO = 400
const MAX_RESULTADOS = 3

const metros = (a: Coordenada, b: Coordenada) => distance(a, b, { units: 'meters' })

/** Redondea a decenas de metros para mostrar ("te deja a 530 m"). */
export const redondearMetros = (m: number) => Math.max(10, Math.round(m / 10) * 10)

/**
 * Mejor forma de usar una ruta para ir de `origen` a `destino`: el par
 * (abordaje, bajada) con abordaje ANTES que bajada en el recorrido (un solo
 * sentido) que menos obliga a caminar. Sin límite de radio; eso se filtra afuera.
 */
function mejorViaje(
  ruta: Ruta,
  paraderos: Paradero[],
  origen: Coordenada,
  destino: Coordenada,
  radioMaximo: number,
): { dentro?: ResultadoRuta; cualquiera?: ResultadoRuta } {
  const enOrden = [...paraderos].sort((a, b) => a.orden - b.orden)
  const aOrigen = enOrden.map((p) => metros(origen, p.coordenadas))
  const aDestino = enOrden.map((p) => metros(p.coordenadas, destino))

  let dentro: ResultadoRuta | undefined
  let cualquiera: ResultadoRuta | undefined
  for (let i = 0; i < enOrden.length; i++) {
    for (let j = i + 1; j < enOrden.length; j++) {
      const r: ResultadoRuta = {
        ruta,
        abordaje: enOrden[i],
        bajada: enOrden[j],
        caminaHastaAbordaje: aOrigen[i],
        caminaDesdeBajada: aDestino[j],
        caminaTotal: aOrigen[i] + aDestino[j],
      }
      if (!cualquiera || r.caminaTotal < cualquiera.caminaTotal) cualquiera = r
      const sirve = aOrigen[i] <= radioMaximo && aDestino[j] <= radioMaximo
      if (sirve && (!dentro || r.caminaTotal < dentro.caminaTotal)) dentro = r
    }
  }
  return { dentro, cualquiera }
}

/**
 * Rutas directas (sin trasbordo) de `origen` a `destino`. Función pura: todo se
 * calcula en el dispositivo con los datos ya cargados; la ubicación no sale de aquí.
 */
export function buscarRutas(
  origen: Coordenada,
  destino: Coordenada,
  rutas: Iterable<Ruta>,
  paraderosPorRuta: ReadonlyMap<string, Paradero[]>,
  opciones: OpcionesBusqueda = {},
): Busqueda {
  const radioMaximo = opciones.radioMaximo ?? RADIO_POR_DEFECTO
  const maxResultados = opciones.maxResultados ?? MAX_RESULTADOS

  const directas: ResultadoRuta[] = []
  let masCercana: ResultadoRuta | undefined
  for (const ruta of rutas) {
    const { dentro, cualquiera } = mejorViaje(ruta, paraderosPorRuta.get(ruta.id) ?? [], origen, destino, radioMaximo)
    if (dentro) directas.push(dentro)
    if (cualquiera && (!masCercana || cualquiera.caminaTotal < masCercana.caminaTotal)) masCercana = cualquiera
  }

  if (directas.length > 0) {
    directas.sort((a, b) => a.caminaTotal - b.caminaTotal)
    return { resultados: directas.slice(0, maxResultados), directa: true }
  }
  if (masCercana) {
    let aviso = `No encontramos una ruta directa. La más cercana te deja a ${redondearMetros(masCercana.caminaDesdeBajada)} m.`
    // Si lo largo es llegar al paradero, decirlo: "te deja a 70 m" solo contaría la mitad.
    if (masCercana.caminaHastaAbordaje > radioMaximo) {
      aviso += ` Para tomarla debes caminar ${redondearMetros(masCercana.caminaHastaAbordaje)} m hasta el paradero.`
    }
    return { resultados: [masCercana], directa: false, aviso }
  }
  return { resultados: [], directa: false, aviso: 'No encontramos rutas para este viaje.' }
}
