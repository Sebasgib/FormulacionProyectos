import {
  AttributionControl,
  addProtocol,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useEffect, useRef, useState } from 'react'
import type { DatosRutas } from '../data/cargarDatos'
import type { Coordenada, Paradero, PuntoViaje } from '../data/types'
import {
  agregarCapasRutas,
  CAPA_PARADEROS,
  CAPA_RUTAS,
  dibujarCaminata,
  limites,
  type OpcionToque,
  resaltarRuta,
  rutasEnPunto,
} from './capasRutas'
import { CUCUTA_CENTER, INITIAL_ZOOM, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM } from './config'
import { crearMarcador } from './marcadores'
import { buildStyle } from './style'

// MapLibre 6 carga su worker como archivo aparte; Vite no lo detecta solo,
// así que se emite como asset (y entra en la precarga del service worker).
setWorkerUrl(workerUrl)

// Registrar el protocolo pmtiles:// una sola vez.
const protocol = new Protocol()
addProtocol('pmtiles', protocol.tile)

/** Mantener presionado este tiempo (ms) para elegir un punto. */
const PULSACION_LARGA_MS = 550

export interface ViajeEnMapa {
  origen: PuntoViaje | null
  destino: PuntoViaje | null
  abordaje?: Paradero
  bajada?: Paradero
}

export interface Encuadre {
  /** Cambia cuando hay que volver a encuadrar. */
  id: string
  puntos: Coordenada[]
}

interface Props {
  datos: DatosRutas | null
  rutaSeleccionada: string | null
  /** Ocultar las demás rutas (resultado de búsqueda elegido). */
  soloRutaSeleccionada: boolean
  viaje: ViajeEnMapa
  encuadre: Encuadre | null
  /** Espacio (px) ocupado arriba (buscador) y abajo (panel) al encuadrar. */
  margenSuperior: number
  margenInferior: number
  /** Si es true, un toque en el mapa elige el origen en vez de abrir rutas. */
  eligiendoOrigen: boolean
  onToque: (opciones: OpcionToque[]) => void
  onToqueOrigen: (coord: Coordenada) => void
  onPulsacionLarga: (coord: Coordenada) => void
}

export function MapView(props: Props) {
  const { datos, rutaSeleccionada, soloRutaSeleccionada, viaje, encuadre, margenSuperior, margenInferior } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // Callbacks y modo actuales para los manejadores registrados una sola vez.
  const propsRef = useRef(props)
  const [estiloListo, setEstiloListo] = useState(false)
  const [capasListas, setCapasListas] = useState(false)

  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    if (!containerRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildStyle(),
      center: CUCUTA_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: MAX_BOUNDS,
      attributionControl: false,
    })
    mapRef.current = map

    // compact: false → la atribución se ve siempre, también en pantallas pequeñas.
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right')
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => setEstiloListo(true))

    // --- Pulsación larga: táctil con temporizador; con mouse, clic derecho. ---
    let temporizador: ReturnType<typeof setTimeout> | undefined
    let inicio: { x: number; y: number } | undefined
    let ultimaPulsacion = 0
    const cancelar = () => {
      clearTimeout(temporizador)
      temporizador = undefined
      inicio = undefined
    }
    const disparar = (lng: number, lat: number) => {
      const ahora = Date.now()
      if (ahora - ultimaPulsacion < 1000) return // Android dispara también "contextmenu"
      ultimaPulsacion = ahora
      navigator.vibrate?.(20)
      propsRef.current.onPulsacionLarga([lng, lat])
    }
    map.on('touchstart', (e) => {
      cancelar()
      if (e.originalEvent.touches.length !== 1) return
      inicio = { x: e.point.x, y: e.point.y }
      const { lng, lat } = e.lngLat
      temporizador = setTimeout(() => {
        temporizador = undefined
        disparar(lng, lat)
      }, PULSACION_LARGA_MS)
    })
    map.on('touchmove', (e) => {
      if (inicio && Math.hypot(e.point.x - inicio.x, e.point.y - inicio.y) > 10) cancelar()
    })
    map.on('touchend', cancelar)
    map.on('touchcancel', cancelar)
    map.on('dragstart', cancelar)
    map.on('contextmenu', (e) => disparar(e.lngLat.lng, e.lngLat.lat))

    map.on('click', (e) => {
      if (Date.now() - ultimaPulsacion < 700) return // el clic que sigue a la pulsación larga
      const actual = propsRef.current
      if (actual.eligiendoOrigen) {
        actual.onToqueOrigen([e.lngLat.lng, e.lngLat.lat])
        return
      }
      const opciones = rutasEnPunto(map, e.point.x, e.point.y)
      if (opciones.length > 0) actual.onToque(opciones)
    })
    for (const capa of [CAPA_RUTAS, CAPA_PARADEROS]) {
      map.on('mouseenter', capa, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', capa, () => (map.getCanvas().style.cursor = ''))
    }

    return () => {
      cancelar()
      mapRef.current = null
      setEstiloListo(false)
      setCapasListas(false)
      map.remove()
    }
  }, [])

  // Capas de rutas y paraderos, una vez que hay estilo y datos.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !estiloListo || !datos || map.getSource('rutas')) return
    agregarCapasRutas(map, datos)
    setCapasListas(true)
  }, [estiloListo, datos])

  // Resaltar la ruta elegida (o mostrar solo esa).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !capasListas) return
    resaltarRuta(map, rutaSeleccionada, soloRutaSeleccionada)
  }, [capasListas, rutaSeleccionada, soloRutaSeleccionada])

  // Marcadores del viaje y tramos a pie.
  const { origen, destino, abordaje, bajada } = viaje
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const marcadores: Marker[] = []
    const poner = (tipo: Parameters<typeof crearMarcador>[0], coord: Coordenada | undefined) => {
      if (coord) marcadores.push(crearMarcador(tipo, coord).addTo(map))
    }
    poner('origen', origen?.coord)
    poner('destino', destino?.coord)
    poner('abordaje', abordaje?.coordenadas)
    poner('bajada', bajada?.coordenadas)
    return () => marcadores.forEach((m) => m.remove())
  }, [origen, destino, abordaje, bajada])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !capasListas) return
    const tramos: [Coordenada, Coordenada][] = []
    if (origen && abordaje) tramos.push([origen.coord, abordaje.coordenadas])
    if (bajada && destino) tramos.push([bajada.coordenadas, destino.coord])
    dibujarCaminata(map, tramos)
  }, [capasListas, origen, destino, abordaje, bajada])

  // Encuadrar lo que importa, dejando libres el buscador y el panel inferior.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !estiloListo || !encuadre || encuadre.puntos.length === 0) return
    const alto = map.getContainer().clientHeight
    const arriba = margenSuperior + 48 // + alto de los pines (destino, "Bájate aquí"), que crecen hacia arriba
    const abajo = Math.max(24, Math.min(margenInferior + 24, alto - arriba - 140))
    const padding = { top: arriba, bottom: abajo, left: 32, right: 64 } // derecha: botones de zoom
    const [primero] = encuadre.puntos
    const unPunto = encuadre.puntos.every((p) => p[0] === primero[0] && p[1] === primero[1])
    if (unPunto) map.easeTo({ center: primero, zoom: Math.max(map.getZoom(), 15), padding, duration: 600 })
    else map.fitBounds(limites(encuadre.puntos), { padding, maxZoom: 16, duration: 600 })
  }, [estiloListo, encuadre, margenSuperior, margenInferior])

  return <div ref={containerRef} className="map" />
}
