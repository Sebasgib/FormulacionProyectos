import { useCallback, useEffect, useMemo, useState } from 'react'
import { FichaRuta } from './components/FichaRuta'
import { OfflineBadge } from './components/OfflineBadge'
import { PanelBusqueda } from './components/PanelBusqueda'
import { type EstadoGps, PanelOrigen } from './components/PanelOrigen'
import { Resultados } from './components/Resultados'
import { SelectorRuta } from './components/SelectorRuta'
import { buscarRutas } from './data/buscarRutas'
import { cargarDatosRutas, type DatosRutas } from './data/cargarDatos'
import { ORIGEN_SIMULADO } from './data/origenSimulado'
import type { Coordenada, Lugar, PuntoViaje } from './data/types'
import { estadoPermisoUbicacion, type FalloUbicacion, obtenerUbicacion } from './data/ubicacion'
import type { OpcionToque } from './map/capasRutas'
import { type Encuadre, MapView } from './map/MapView'

type Seleccion =
  | ({ tipo: 'ruta' } & OpcionToque)
  | { tipo: 'varias'; opciones: OpcionToque[] }

const desdeLugar = (lugar: Lugar): PuntoViaje => ({ coord: lugar.coordenadas, nombre: lugar.nombre, fuente: 'lugar' })
const desdeMapa = (coord: Coordenada, nombre: string): PuntoViaje => ({ coord, nombre, fuente: 'mapa' })

function App() {
  const [datos, setDatos] = useState<DatosRutas | null>(null)
  const [errorDatos, setErrorDatos] = useState(false)

  // Viaje. Privacidad (F-09): el origen por GPS vive solo en este estado (memoria).
  const [origen, setOrigenEstado] = useState<PuntoViaje | null>(ORIGEN_SIMULADO)
  const [destino, setDestinoEstado] = useState<PuntoViaje | null>(null)
  const [resultadoElegido, setResultadoElegido] = useState<number | null>(null)
  const [panelOrigen, setPanelOrigen] = useState(false)
  const [estadoGps, setEstadoGps] = useState<EstadoGps>('inactivo')
  const [eligiendoOrigenEnMapa, setEligiendoOrigenEnMapa] = useState(false)

  // Toques directos sobre rutas del mapa (Fase 2).
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)

  const [altoHoja, setAltoHoja] = useState(0)
  const [altoPanel, setAltoPanel] = useState(0)

  useEffect(() => {
    cargarDatosRutas()
      .then(setDatos)
      .catch((e: unknown) => {
        console.error(e)
        setErrorDatos(true)
      })
  }, [])

  const usarUbicacion = useCallback(() => {
    setEstadoGps('buscando')
    obtenerUbicacion()
      .then((coord) => {
        setEstadoGps('inactivo')
        setOrigenEstado({ coord, nombre: 'Tu ubicación', fuente: 'gps' })
        setResultadoElegido(null)
        setPanelOrigen(false)
      })
      .catch((fallo: FalloUbicacion) => setEstadoGps(fallo))
  }, [])

  /** Abre "¿Desde dónde sales?"; si el permiso ya estaba dado, pide la ubicación de una vez. */
  const pedirOrigen = useCallback(() => {
    setSeleccion(null)
    setEligiendoOrigenEnMapa(false)
    setPanelOrigen(true)
    void estadoPermisoUbicacion().then((estado) => {
      if (estado === 'granted') usarUbicacion()
      else if (estado === 'denied') setEstadoGps('denegado')
    })
  }, [usarUbicacion])

  const fijarOrigen = useCallback((punto: PuntoViaje) => {
    setOrigenEstado(punto)
    setResultadoElegido(null)
    setPanelOrigen(false)
    setEligiendoOrigenEnMapa(false)
  }, [])

  const fijarDestino = useCallback(
    (punto: PuntoViaje | null) => {
      setDestinoEstado(punto)
      setResultadoElegido(null)
      setSeleccion(null)
      if (punto && !origen) pedirOrigen()
    },
    [origen, pedirOrigen],
  )

  const busqueda = useMemo(
    () => (datos && origen && destino ? buscarRutas(origen.coord, destino.coord, datos.rutas.values(), datos.paraderosPorRuta) : null),
    [datos, origen, destino],
  )
  const elegido = busqueda && resultadoElegido !== null ? busqueda.resultados[resultadoElegido] : undefined
  const rutaTocada = seleccion?.tipo === 'ruta' ? datos?.rutas.get(seleccion.rutaId) : undefined

  const encuadre = useMemo<Encuadre | null>(() => {
    const p = (x: PuntoViaje | null) => (x ? [x.coord] : [])
    if (rutaTocada) return { id: `ruta:${rutaTocada.id}`, puntos: rutaTocada.geometria.coordinates }
    if (elegido) return { id: `res:${elegido.ruta.id}`, puntos: [...elegido.ruta.geometria.coordinates, ...p(origen), ...p(destino)] }
    if (origen && destino) return { id: 'viaje', puntos: [origen.coord, destino.coord] }
    if (destino) return { id: 'destino', puntos: [destino.coord] }
    return null
  }, [rutaTocada, elegido, origen, destino])

  const onToque = useCallback((opciones: OpcionToque[]) => {
    setSeleccion(opciones.length === 1 ? { tipo: 'ruta', ...opciones[0] } : { tipo: 'varias', opciones })
  }, [])
  const cerrarSeleccion = useCallback(() => setSeleccion(null), [])
  const cerrarPanelOrigen = useCallback(() => {
    setPanelOrigen(false)
    setEligiendoOrigenEnMapa(false)
  }, [])

  const lugares = datos?.lugares ?? []

  let hoja = null
  if (seleccion?.tipo === 'ruta' && rutaTocada && datos) {
    hoja = (
      <FichaRuta
        ruta={rutaTocada}
        paraderos={datos.paraderosPorRuta.get(rutaTocada.id) ?? []}
        paraderoDestacado={seleccion.paraderoId}
        onCerrar={cerrarSeleccion}
        onAltura={setAltoHoja}
      />
    )
  } else if (seleccion?.tipo === 'varias' && datos) {
    hoja = (
      <SelectorRuta
        opciones={seleccion.opciones.flatMap((opcion) => {
          const ruta = datos.rutas.get(opcion.rutaId)
          return ruta ? [{ opcion, ruta }] : []
        })}
        onElegir={(opcion) => setSeleccion({ tipo: 'ruta', ...opcion })}
        onCerrar={cerrarSeleccion}
        onAltura={setAltoHoja}
      />
    )
  } else if (panelOrigen) {
    hoja = (
      <PanelOrigen
        lugares={lugares}
        estadoGps={estadoGps}
        eligiendoEnMapa={eligiendoOrigenEnMapa}
        hayOrigenSimulado={ORIGEN_SIMULADO !== null}
        onUsarUbicacion={usarUbicacion}
        onElegirLugar={(lugar) => fijarOrigen(desdeLugar(lugar))}
        onMarcarEnMapa={setEligiendoOrigenEnMapa}
        onUsarSimulado={() => ORIGEN_SIMULADO && fijarOrigen(ORIGEN_SIMULADO)}
        onCerrar={cerrarPanelOrigen}
        onAltura={setAltoHoja}
      />
    )
  } else if (elegido && datos) {
    hoja = (
      <FichaRuta
        ruta={elegido.ruta}
        paraderos={datos.paraderosPorRuta.get(elegido.ruta.id) ?? []}
        abordajeId={elegido.abordaje.id}
        bajadaId={elegido.bajada.id}
        onVolver={() => setResultadoElegido(null)}
        onCerrar={() => fijarDestino(null)}
        onAltura={setAltoHoja}
      />
    )
  } else if (busqueda && origen && destino) {
    hoja = (
      <Resultados
        origen={origen}
        destino={destino}
        busqueda={busqueda}
        onElegir={setResultadoElegido}
        onCerrar={() => fijarDestino(null)}
        onAltura={setAltoHoja}
      />
    )
  }

  return (
    <>
      <MapView
        datos={datos}
        rutaSeleccionada={rutaTocada?.id ?? elegido?.ruta.id ?? null}
        soloRutaSeleccionada={!rutaTocada && !!elegido}
        viaje={{ origen, destino, abordaje: elegido?.abordaje, bajada: elegido?.bajada }}
        encuadre={encuadre}
        margenSuperior={altoPanel}
        margenInferior={altoHoja}
        eligiendoOrigen={eligiendoOrigenEnMapa}
        onToque={onToque}
        onToqueOrigen={(coord) => fijarOrigen(desdeMapa(coord, 'Punto elegido en el mapa'))}
        onPulsacionLarga={(coord) => fijarDestino(desdeMapa(coord, 'Punto en el mapa'))}
      />
      <PanelBusqueda
        lugares={lugares}
        origen={origen}
        destino={destino}
        onElegirDestino={(lugar) => fijarDestino(desdeLugar(lugar))}
        onLimpiarDestino={() => fijarDestino(null)}
        onCambiarOrigen={pedirOrigen}
        onAltura={setAltoPanel}
      />
      <OfflineBadge />
      {errorDatos && (
        <p className="aviso-error" role="alert">
          No se pudieron cargar las rutas.
        </p>
      )}
      {hoja}
    </>
  )
}

export default App
