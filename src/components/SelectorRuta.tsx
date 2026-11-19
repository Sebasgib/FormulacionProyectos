import type { Ruta } from '../data/types'
import type { OpcionToque } from '../map/capasRutas'
import { HojaInferior } from './HojaInferior'

interface Props {
  opciones: { opcion: OpcionToque; ruta: Ruta }[]
  onElegir: (opcion: OpcionToque) => void
  onCerrar: () => void
  onAltura: (alto: number) => void
}

/** Cuando el toque cae sobre varias rutas a la vez (calles compartidas). */
export function SelectorRuta({ opciones, onElegir, onCerrar, onAltura }: Props) {
  return (
    <HojaInferior titulo="Por aquí pasan varias rutas" onCerrar={onCerrar} onAltura={onAltura}>
      <ul className="selector">
        {opciones.map(({ opcion, ruta }) => (
          <li key={ruta.id}>
            <button type="button" className="selector__boton" onClick={() => onElegir(opcion)}>
              <span className="muestra-color" style={{ background: ruta.color }} aria-hidden="true" />
              {ruta.nombrePopular}
            </button>
          </li>
        ))}
      </ul>
    </HojaInferior>
  )
}
