import { describe, expect, it } from 'vitest'
import archivo from '../../public/data/lugares.json'
import { buscarLugares, distanciaEdicion, normalizar } from './buscarLugares'
import type { ArchivoLugares } from './types'

// El JSON se infiere con tipos amplios (string, number[]): se afirma la forma del archivo.
const { lugares } = archivo as unknown as ArchivoLugares
const primero = (q: string) => buscarLugares(q, lugares)[0]?.lugar.id

describe('normalizar', () => {
  it('quita tildes, mayúsculas y signos', () => {
    expect(normalizar('  Unisimón, CC  Ventura-Plaza! ')).toBe('unisimon cc ventura plaza')
  })
})

describe('distanciaEdicion', () => {
  it('cuenta inserciones, cambios y trasposiciones', () => {
    expect(distanciaEdicion('ventra', 'ventura')).toBe(1)
    expect(distanciaEdicion('vnetura', 'ventura')).toBe(1)
    expect(distanciaEdicion('casa', 'cosa')).toBe(1)
    expect(distanciaEdicion('', 'abc')).toBe(3)
  })
})

describe('buscarLugares', () => {
  it('encuentra por nombre y por alias sin importar mayúsculas ni tildes', () => {
    expect(primero('ventura')).toBe('ventura-plaza')
    expect(primero('UNISIMON')).toBe('usb')
    expect(primero('la simon bolivar')).toBe('usb')
    expect(primero('USB')).toBe('usb')
    expect(primero('Erasmo')).toBe('huem')
  })

  it('tolera tildes mal puestas y errores pequeños de escritura', () => {
    expect(primero('ventra')).toBe('ventura-plaza')
    expect(primero('Unisímon')).toBe('usb')
    expect(primero('unisimn')).toBe('usb')
    expect(primero('simon bolibar')).toBe('usb')
    expect(primero('unicentor')).toBe('unicentro')
  })

  it('acepta varias palabras en otro orden y con errores', () => {
    expect(primero('hospital erazmo')).toBe('huem')
    expect(primero('plaza ventura')).toBe('ventura-plaza')
    expect(primero('universidad libre')).toBe('unilibre')
  })

  it('devuelve como máximo 5 sugerencias', () => {
    expect(buscarLugares('universidad', lugares).length).toBeLessThanOrEqual(5)
    expect(buscarLugares('universidad', lugares).length).toBeGreaterThan(1)
  })

  it('no sugiere nada con menos de 2 letras ni con texto sin parecido', () => {
    expect(buscarLugares('v', lugares)).toEqual([])
    expect(buscarLugares('xyzxyzxyz', lugares)).toEqual([])
  })
})
