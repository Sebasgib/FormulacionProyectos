import type { CSSProperties } from 'react'
import { formatearFecha, formatearTarifa } from '../data/formato'
import type { Paradero, Ruta } from '../data/types'
import { HojaInferior } from './HojaInferior'

interface Props {
  ruta: Ruta
  paraderos: Paradero[]
  /** Paradero que se tocó en el mapa, si se abrió la ficha desde uno. */
  paraderoDestacado?: string
  onCerrar: () => void
  onAltura: (alto: number) => void
}

export function FichaRuta({ ruta, paraderos, paraderoDestacado, onCerrar, onAltura }: Props) {
  return (
    <HojaInferior
      titulo={
        <>
          <span className="muestra-color" style={{ background: ruta.color }} aria-hidden="true" />
          {ruta.nombrePopular}
        </>
      }
      encabezado={ruta.esDemo ? <p className="etiqueta-demo">Datos de demostración</p> : null}
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
          const destacado = p.id === paraderoDestacado
          return (
            <li key={p.id} className={destacado ? 'destacado' : undefined} aria-current={destacado ? 'location' : undefined}>
              <span className="ficha__orden" aria-hidden="true">
                {p.orden}
              </span>
              <span>
                {p.nombre}
                {destacado && <span className="ficha__tocado"> · el que tocaste</span>}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="ficha__verificacion">Verificada en campo el {formatearFecha(ruta.fechaVerificacion)}</p>
    </HojaInferior>
  )
}
