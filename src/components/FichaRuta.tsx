import type { CSSProperties } from 'react'
import { formatearFecha, formatearTarifa } from '../data/formato'
import type { Paradero, Ruta } from '../data/types'
import { HojaInferior } from './HojaInferior'

interface Props {
  ruta: Ruta
  paraderos: Paradero[]
  /** Paradero que se tocó en el mapa, si se abrió la ficha desde uno. */
  paraderoDestacado?: string
  /** Viaje elegido en los resultados: dónde subir y dónde bajar. */
  abordajeId?: string
  bajadaId?: string
  /** Si viene de los resultados, botón para volver a ellos. */
  onVolver?: () => void
  onCerrar: () => void
  onAltura: (alto: number) => void
}

export function FichaRuta({ ruta, paraderos, paraderoDestacado, abordajeId, bajadaId, onVolver, onCerrar, onAltura }: Props) {
  return (
    <HojaInferior
      clave={`ruta:${ruta.id}:${abordajeId ?? ''}:${bajadaId ?? ''}:${paraderoDestacado ?? ''}`}
      titulo={
        <>
          <span className="muestra-color" style={{ background: ruta.color }} aria-hidden="true" />
          {ruta.nombrePopular}
        </>
      }
      encabezado={
        <>
          {onVolver && (
            <button type="button" className="boton-volver" onClick={onVolver}>
              <span aria-hidden="true">←</span> Volver a los resultados
            </button>
          )}
          {ruta.esDemo && <p className="etiqueta-demo">Datos de demostración</p>}
        </>
      }
      onCerrar={onCerrar}
      onAltura={onAltura}
    >
      <dl className="ficha__datos">
        <div>
          <dt>Empresa</dt>
          <dd>{ruta.empresa}</dd>
        </div>
        <div>
          <dt>Tarifa aproximada</dt>
          <dd className="ficha__tarifa">{formatearTarifa(ruta.tarifaAprox)}</dd>
        </div>
        <div>
          <dt>Pasa por</dt>
          <dd>{ruta.barrios.join(', ')}</dd>
        </div>
      </dl>

      <h3 className="ficha__subtitulo">Paraderos ({paraderos.length})</h3>
      <ol className="ficha__paraderos" style={{ '--color-ruta': ruta.color } as CSSProperties}>
        {paraderos.map((p) => {
          const marca =
            p.id === abordajeId
              ? { clase: 'abordaje', texto: ' · súbete aquí' }
              : p.id === bajadaId
                ? { clase: 'bajada', texto: ' · bájate aquí' }
                : p.id === paraderoDestacado
                  ? { clase: 'destacado', texto: ' · el que tocaste' }
                  : null
          return (
            <li key={p.id} className={marca?.clase} aria-current={marca ? 'location' : undefined}>
              <span className="ficha__orden" aria-hidden="true">
                {p.orden}
              </span>
              <span>
                {p.nombre}
                {marca && <span className={`ficha__marca ficha__marca--${marca.clase}`}>{marca.texto}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="ficha__verificacion">Verificada en campo el {formatearFecha(ruta.fechaVerificacion)}</p>
    </HojaInferior>
  )
}
