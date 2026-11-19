import type { Busqueda } from '../data/buscarRutas'
import { formatearMetros } from '../data/formato'
import type { PuntoViaje } from '../data/types'
import { HojaInferior } from './HojaInferior'

interface Props {
  origen: PuntoViaje
  destino: PuntoViaje
  busqueda: Busqueda
  onElegir: (indice: number) => void
  onCerrar: () => void
  onAltura: (alto: number) => void
}

export function Resultados({ origen, destino, busqueda, onElegir, onCerrar, onAltura }: Props) {
  const { resultados, aviso, directa } = busqueda
  return (
    <HojaInferior
      clave={`resultados:${origen.coord.join(',')}:${destino.coord.join(',')}`}
      titulo={directa ? 'Rutas para llegar' : 'Sin ruta directa'}
      onCerrar={onCerrar}
      onAltura={onAltura}
    >
      <p className="viaje-resumen">
        De <strong>{origen.nombre}</strong> a <strong>{destino.nombre}</strong>
      </p>
      {aviso && (
        <p className="aviso" role="status">
          {aviso}
        </p>
      )}
      <ul className="resultados">
        {resultados.map((r, i) => (
          <li key={r.ruta.id}>
            <button type="button" className="resultado" onClick={() => onElegir(i)}>
              <span className="resultado__nombre">
                <span className="muestra-color" style={{ background: r.ruta.color }} aria-hidden="true" />
                {r.ruta.nombrePopular}
              </span>
              {r.ruta.esDemo && <span className="etiqueta-demo">Datos de demostración</span>}
              <span>
                Camina {formatearMetros(r.caminaHastaAbordaje)} hasta <strong>{r.abordaje.nombre}</strong>
              </span>
              <span>
                Bájate en <strong>{r.bajada.nombre}</strong>
              </span>
              <span className="resultado__secundario">
                Luego camina {formatearMetros(r.caminaDesdeBajada)} hasta tu destino
              </span>
            </button>
          </li>
        ))}
      </ul>
    </HojaInferior>
  )
}
