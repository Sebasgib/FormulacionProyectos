import { describe, expect, it } from 'vitest'
import { buscarRutas } from './buscarRutas'
import type { Coordenada, Paradero, Ruta } from './types'

// Ruta sintética de oeste a este sobre la latitud 7.89, paraderos cada ~500 m.
// 0.0045° de longitud ≈ 496 m a esta latitud; 0.0009° de latitud ≈ 100 m.
const LAT = 7.89
const LNG0 = -72.52
const PASO = 0.0045
const GRADOS_POR_100M = 0.0009

function crearRuta(id: string, n = 5, sentido: 1 | -1 = 1): { ruta: Ruta; paraderos: Paradero[] } {
  const coords: Coordenada[] = Array.from({ length: n }, (_, k) => [LNG0 + k * PASO, LAT])
  if (sentido === -1) coords.reverse()
  const ruta: Ruta = {
    id,
    nombrePopular: `Ruta ${id}`,
    empresa: 'Prueba',
    tarifaAprox: 2900,
    barrios: [],
    color: '#000000',
    fechaVerificacion: '2026-11-18',
    esDemo: true,
    geometria: { type: 'LineString', coordinates: coords },
  }
  const paraderos = coords.map((c, i) => ({ id: `${id}-p${i + 1}`, rutaId: id, nombre: `P${i + 1}`, coordenadas: c, orden: i + 1 }))
  return { ruta, paraderos }
}

function datos(...rs: ReturnType<typeof crearRuta>[]) {
  return {
    rutas: rs.map((r) => r.ruta),
    paraderos: new Map(rs.map((r) => [r.ruta.id, r.paraderos])),
  }
}

/** Punto `metrosNorte` al norte del paradero k (0 = primero de oeste a este). */
const cerca = (k: number, metrosNorte: number): Coordenada => [LNG0 + k * PASO, LAT + (metrosNorte / 100) * GRADOS_POR_100M]

describe('buscarRutas', () => {
  it('encuentra la ruta cuando ambos paraderos están cerca y en el sentido del recorrido', () => {
    const { rutas, paraderos } = datos(crearRuta('A'))
    const r = buscarRutas(cerca(0, 50), cerca(3, 80), rutas, paraderos)

    expect(r.directa).toBe(true)
    expect(r.aviso).toBeUndefined()
    expect(r.resultados).toHaveLength(1)
    const [res] = r.resultados
    expect(res.abordaje.id).toBe('A-p1')
    expect(res.bajada.id).toBe('A-p4')
    expect(res.caminaHastaAbordaje).toBeCloseTo(50, -1)
    expect(res.caminaDesdeBajada).toBeCloseTo(80, -1)
    expect(res.caminaTotal).toBeCloseTo(130, -1)
  })

  it('NO usa una ruta en sentido contrario (las rutas son de un solo sentido)', () => {
    // La ruta B va de este a oeste: de p1 (este) a p5 (oeste). El viaje va de oeste a este.
    const { rutas, paraderos } = datos(crearRuta('B', 5, -1))
    const r = buscarRutas(cerca(0, 50), cerca(3, 80), rutas, paraderos)

    expect(r.directa).toBe(false)
    expect(r.aviso).toMatch(/^No encontramos una ruta directa\. La más cercana te deja a \d+ m\./)
    // Ningún resultado puede abordar después de bajarse.
    for (const res of r.resultados) expect(res.abordaje.orden).toBeLessThan(res.bajada.orden)
  })

  it('descarta la ruta si el destino queda a más de 400 m del paradero, y avisa la distancia', () => {
    const { rutas, paraderos } = datos(crearRuta('A'))
    const r = buscarRutas(cerca(0, 50), cerca(3, 600), rutas, paraderos)

    expect(r.directa).toBe(false)
    expect(r.resultados).toHaveLength(1)
    expect(r.resultados[0].abordaje.id).toBe('A-p1')
    expect(r.resultados[0].bajada.id).toBe('A-p4')
    expect(r.aviso).toBe('No encontramos una ruta directa. La más cercana te deja a 600 m.')
  })

  it('también descarta si el origen queda a más de 400 m del paradero de abordaje', () => {
    const { rutas, paraderos } = datos(crearRuta('A'))
    const r = buscarRutas(cerca(0, 450), cerca(3, 50), rutas, paraderos)
    expect(r.directa).toBe(false)
    expect(r.aviso).toBe(
      'No encontramos una ruta directa. La más cercana te deja a 50 m. Para tomarla debes caminar 450 m hasta el paradero.',
    )
  })

  it('sin rutas no hay resultados y lo avisa', () => {
    const r = buscarRutas(cerca(0, 0), cerca(3, 0), [], new Map())
    expect(r.resultados).toEqual([])
    expect(r.directa).toBe(false)
    expect(r.aviso).toBe('No encontramos rutas para este viaje.')
  })

  it('ordena por caminata total y devuelve como máximo 3', () => {
    // Cuatro rutas iguales desplazadas al norte: más desplazamiento, más caminata.
    const rs = [300, 0, 200, 100].map((norte, i) => {
      const r = crearRuta(`R${i}`)
      const mover = (c: Coordenada): Coordenada => [c[0], c[1] + (norte / 100) * GRADOS_POR_100M]
      r.paraderos = r.paraderos.map((p) => ({ ...p, coordenadas: mover(p.coordenadas) }))
      return r
    })
    const { rutas, paraderos } = datos(...rs)
    const r = buscarRutas(cerca(0, 0), cerca(3, 0), rutas, paraderos)

    expect(r.directa).toBe(true)
    expect(r.resultados.map((x) => x.ruta.id)).toEqual(['R1', 'R3', 'R2'])
  })
})
