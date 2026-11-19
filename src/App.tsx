import { useCallback, useEffect, useState } from 'react'
import { FichaRuta } from './components/FichaRuta'
import { OfflineBadge } from './components/OfflineBadge'
import { SelectorRuta } from './components/SelectorRuta'
import { cargarDatosRutas, type DatosRutas } from './data/cargarDatos'
import type { OpcionToque } from './map/capasRutas'
import { MapView } from './map/MapView'

type Seleccion =
  | ({ tipo: 'ruta' } & OpcionToque)
  | { tipo: 'varias'; opciones: OpcionToque[] }

function App() {
  const [datos, setDatos] = useState<DatosRutas | null>(null)
  const [errorDatos, setErrorDatos] = useState(false)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const [altoHoja, setAltoHoja] = useState(0)

  useEffect(() => {
    cargarDatosRutas()
      .then(setDatos)
      .catch((e: unknown) => {
        console.error(e)
        setErrorDatos(true)
      })
  }, [])

  const onToque = useCallback((opciones: OpcionToque[]) => {
    setSeleccion(
      opciones.length === 1 ? { tipo: 'ruta', ...opciones[0] } : { tipo: 'varias', opciones },
    )
  }, [])
  const cerrar = useCallback(() => setSeleccion(null), [])

  const rutaElegida = seleccion?.tipo === 'ruta' ? datos?.rutas.get(seleccion.rutaId) : undefined

  return (
    <>
      <MapView
        datos={datos}
        rutaSeleccionada={rutaElegida?.id ?? null}
        paddingInferior={altoHoja}
        onToque={onToque}
      />
      <OfflineBadge />
      {errorDatos && (
        <p className="aviso-error" role="alert">
          No se pudieron cargar las rutas.
        </p>
      )}

      {seleccion?.tipo === 'ruta' && rutaElegida && datos && (
        <FichaRuta
          ruta={rutaElegida}
          paraderos={datos.paraderosPorRuta.get(rutaElegida.id) ?? []}
          paraderoDestacado={seleccion.paraderoId}
          onCerrar={cerrar}
          onAltura={setAltoHoja}
        />
      )}
      {seleccion?.tipo === 'varias' && datos && (
        <SelectorRuta
          opciones={seleccion.opciones.flatMap((opcion) => {
            const ruta = datos.rutas.get(opcion.rutaId)
            return ruta ? [{ opcion, ruta }] : []
          })}
          onElegir={(opcion) => setSeleccion({ tipo: 'ruta', ...opcion })}
          onCerrar={cerrar}
          onAltura={setAltoHoja}
        />
      )}
    </>
  )
}

export default App
