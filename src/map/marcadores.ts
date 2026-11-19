import { Marker } from 'maplibre-gl'
import type { Coordenada } from '../data/types'

export type TipoMarcador = 'origen' | 'destino' | 'abordaje' | 'bajada'

const NOMBRE: Record<TipoMarcador, string> = {
  origen: 'Origen',
  destino: 'Destino',
  abordaje: 'Súbete aquí',
  bajada: 'Bájate aquí',
}

/** Marcadores HTML (no capas) para poder darles texto legible y contraste propio. */
export function crearMarcador(tipo: TipoMarcador, coord: Coordenada): Marker {
  const el = document.createElement('div')
  el.className = `marcador marcador--${tipo}`
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', NOMBRE[tipo])
  el.title = NOMBRE[tipo]

  if (tipo === 'bajada') {
    const etiqueta = document.createElement('span')
    etiqueta.className = 'marcador__etiqueta'
    etiqueta.textContent = 'Bájate aquí'
    const punta = document.createElement('span')
    punta.className = 'marcador__pin'
    el.append(etiqueta, punta)
  }

  const anclaAbajo = tipo === 'bajada' || tipo === 'destino'
  return new Marker({ element: el, anchor: anclaAbajo ? 'bottom' : 'center' }).setLngLat(coord)
}
