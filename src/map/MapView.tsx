import {
  AttributionControl,
  addProtocol,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useEffect, useRef, useState } from 'react'
import type { DatosRutas } from '../data/cargarDatos'
import {
  agregarCapasRutas,
  CAPA_PARADEROS,
  CAPA_RUTAS,
  limitesRuta,
  type OpcionToque,
  resaltarRuta,
  rutasEnPunto,
} from './capasRutas'
import { CUCUTA_CENTER, INITIAL_ZOOM, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM } from './config'
import { buildStyle } from './style'

// MapLibre 6 carga su worker como archivo aparte; Vite no lo detecta solo,
// así que se emite como asset (y entra en la precarga del service worker).
setWorkerUrl(workerUrl)

// Registrar el protocolo pmtiles:// una sola vez.
const protocol = new Protocol()
addProtocol('pmtiles', protocol.tile)

interface Props {
  datos: DatosRutas | null
  rutaSeleccionada: string | null
  /** Alto (px) del panel inferior abierto, para encuadrar la ruta por encima. */
  paddingInferior: number
  onToque: (opciones: OpcionToque[]) => void
}

export function MapView({ datos, rutaSeleccionada, paddingInferior, onToque }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onToqueRef = useRef(onToque)
  const [estiloListo, setEstiloListo] = useState(false)
  const [capasListas, setCapasListas] = useState(false)

  useEffect(() => {
    onToqueRef.current = onToque
  }, [onToque])

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
    map.on('click', (e) => {
      const opciones = rutasEnPunto(map, e.point.x, e.point.y)
      if (opciones.length > 0) onToqueRef.current(opciones)
    })
    for (const capa of [CAPA_RUTAS, CAPA_PARADEROS]) {
      map.on('mouseenter', capa, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', capa, () => (map.getCanvas().style.cursor = ''))
    }

    return () => {
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

  // Resaltar y encuadrar la ruta elegida.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !capasListas || !datos) return
    resaltarRuta(map, rutaSeleccionada)
    const ruta = rutaSeleccionada ? datos.rutas.get(rutaSeleccionada) : undefined
    if (!ruta) return
    const alto = map.getContainer().clientHeight
    map.fitBounds(limitesRuta(ruta), {
      padding: {
        top: 64,
        left: 32,
        right: 64, // deja libres los botones de zoom
        bottom: Math.min(paddingInferior + 24, Math.max(alto - 220, 24)),
      },
      maxZoom: 16,
      duration: 600,
    })
  }, [capasListas, datos, rutaSeleccionada, paddingInferior])

  return <div ref={containerRef} className="map" />
}
