import type { FalloUbicacion } from '../data/ubicacion'
import type { Lugar } from '../data/types'
import { Buscador } from './Buscador'
import { HojaInferior } from './HojaInferior'

export type EstadoGps = 'inactivo' | 'buscando' | FalloUbicacion

const MENSAJE_FALLO: Record<FalloUbicacion, string> = {
  denegado: 'No tenemos permiso para usar tu ubicación.',
  'no-disponible': 'No pudimos obtener tu ubicación (sin GPS o sin señal).',
  'fuera-del-area': 'Tu ubicación está fuera del área del mapa de Cúcuta.',
}

interface Props {
  lugares: readonly Lugar[]
  estadoGps: EstadoGps
  eligiendoEnMapa: boolean
  /** Solo en desarrollo / build simulado. */
  hayOrigenSimulado: boolean
  onUsarUbicacion: () => void
  onElegirLugar: (lugar: Lugar) => void
  onMarcarEnMapa: (activo: boolean) => void
  onUsarSimulado: () => void
  onCerrar: () => void
  onAltura: (alto: number) => void
}

/** "¿Desde dónde sales?": GPS (con explicación de privacidad), buscador o mapa. */
export function PanelOrigen({
  lugares,
  estadoGps,
  eligiendoEnMapa,
  hayOrigenSimulado,
  onUsarUbicacion,
  onElegirLugar,
  onMarcarEnMapa,
  onUsarSimulado,
  onCerrar,
  onAltura,
}: Props) {
  if (eligiendoEnMapa) {
    return (
      <HojaInferior clave="origen-mapa" titulo="Toca el mapa donde estás" onCerrar={onCerrar} onAltura={onAltura}>
        <p className="texto-ayuda">Mueve el mapa si hace falta y toca el punto de salida.</p>
        <button type="button" className="boton boton--secundario" onClick={() => onMarcarEnMapa(false)}>
          Cancelar
        </button>
      </HojaInferior>
    )
  }

  const fallo = estadoGps !== 'inactivo' && estadoGps !== 'buscando' ? MENSAJE_FALLO[estadoGps] : null

  return (
    <HojaInferior clave={`origen:${estadoGps}`} titulo="¿Desde dónde sales?" onCerrar={onCerrar} onAltura={onAltura}>
      {fallo ? (
        <p className="aviso" role="alert">
          {fallo} Elige el origen con el buscador o en el mapa.
        </p>
      ) : (
        <>
          <p className="texto-privacidad">
            Usamos tu ubicación solo en tu teléfono para buscar rutas cercanas. No se guarda ni se envía.
          </p>
          <button
            type="button"
            className="boton boton--primario"
            onClick={onUsarUbicacion}
            disabled={estadoGps === 'buscando'}
          >
            {estadoGps === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
          </button>
        </>
      )}

      <p className="separador">o elige un lugar</p>
      <Buscador
        lugares={lugares}
        etiqueta="Lugar de salida"
        placeholder="Busca un lugar de salida"
        onElegir={onElegirLugar}
      />
      <button type="button" className="boton boton--secundario" onClick={() => onMarcarEnMapa(true)}>
        Marcar en el mapa
      </button>
      {hayOrigenSimulado && (
        <button type="button" className="boton boton--secundario" onClick={onUsarSimulado}>
          Usar origen simulado (USB) · solo pruebas
        </button>
      )}
    </HojaInferior>
  )
}
