import { useLayoutEffect, useRef } from 'react'
import type { Lugar, PuntoViaje } from '../data/types'
import { Buscador } from './Buscador'

interface Props {
  lugares: readonly Lugar[]
  origen: PuntoViaje | null
  destino: PuntoViaje | null
  onElegirDestino: (lugar: Lugar) => void
  onLimpiarDestino: () => void
  onCambiarOrigen: () => void
  /** Alto (px) del panel, para que el mapa encuadre por debajo. */
  onAltura: (alto: number) => void
}

/** Barra fija arriba: origen actual y el campo "¿A dónde vas?". */
export function PanelBusqueda({ lugares, origen, destino, onElegirDestino, onLimpiarDestino, onCambiarOrigen, onAltura }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const informar = () => {
      // Solo la parte fija: las sugerencias flotan encima del mapa.
      const alto = el.getBoundingClientRect().bottom
      document.documentElement.style.setProperty('--alto-panel', `${alto}px`)
      onAltura(alto)
    }
    informar()
    const obs = new ResizeObserver(informar)
    obs.observe(el)
    return () => obs.disconnect()
  }, [onAltura])

  return (
    <div ref={ref} className="panel-busqueda">
      <div className="panel-busqueda__origen">
        <span className="panel-busqueda__desde">
          Desde: <strong>{origen ? origen.nombre : 'sin elegir'}</strong>
        </span>
        <button type="button" className="boton-texto" onClick={onCambiarOrigen}>
          {origen ? 'Cambiar' : 'Elegir'}
        </button>
      </div>
      <Buscador
        key={destino ? `${destino.nombre}|${destino.coord.join(',')}` : 'vacio'}
        lugares={lugares}
        etiqueta="¿A dónde vas?"
        placeholder="¿A dónde vas?"
        valorInicial={destino?.nombre}
        onElegir={onElegirDestino}
        onLimpiar={onLimpiarDestino}
        ayudaSinResultados="También puedes mantener presionado el mapa."
      />
    </div>
  )
}
