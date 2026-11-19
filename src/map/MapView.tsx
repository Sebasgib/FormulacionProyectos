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
import { useEffect, useRef } from 'react'
import { CUCUTA_CENTER, INITIAL_ZOOM, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM } from './config'
import { buildStyle } from './style'

// MapLibre 6 carga su worker como archivo aparte; Vite no lo detecta solo,
// así que se emite como asset (y entra en la precarga del service worker).
setWorkerUrl(workerUrl)

// Registrar el protocolo pmtiles:// una sola vez.
const protocol = new Protocol()
addProtocol('pmtiles', protocol.tile)

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)

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

    // compact: false → la atribución se ve siempre, también en pantallas pequeñas.
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right')
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    return () => map.remove()
  }, [])

  return <div ref={containerRef} className="map" />
}
