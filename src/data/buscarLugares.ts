import type { Lugar } from './types'

/** Minúsculas, sin tildes ni signos, espacios simples: "Unisimón!" → "unisimon". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

/**
 * Distancia de edición (Damerau-Levenshtein restringida): inserción, borrado,
 * cambio y trasposición de dos letras vecinas ("vnetura") cuentan 1 cada uno.
 */
export function distanciaEdicion(a: string, b: string): number {
  const n = a.length
  const m = b.length
  if (n === 0) return m
  if (m === 0) return n
  let anterior2 = new Array<number>(m + 1).fill(0)
  let anterior = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const actual = new Array<number>(m + 1)
    actual[0] = i
    for (let j = 1; j <= m; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      actual[j] = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        actual[j] = Math.min(actual[j], anterior2[j - 2] + 1)
      }
    }
    anterior2 = anterior
    anterior = actual
  }
  return anterior[m]
}

/** Errores tolerados según el largo de lo escrito. */
function erroresPermitidos(largo: number): number {
  if (largo <= 3) return 0
  if (largo <= 5) return 1
  return 2
}

/**
 * Qué tan bien `consulta` describe `texto` (ambos normalizados); menor es mejor,
 * `null` si no coincide.
 *   0 igual · 1 empieza igual · 2 una palabra empieza igual · 2+n con n errores ·
 *   3+n palabra por palabra
 */
function puntaje(consulta: string, texto: string): number | null {
  if (texto === consulta) return 0
  if (texto.startsWith(consulta)) return 1
  if (texto.includes(` ${consulta}`)) return 2

  // Con errores: comparar contra el comienzo de cada palabra, recortado al
  // largo escrito (±1), para que "ventra" encuentre "ventura plaza".
  const permitidos = erroresPermitidos(consulta.length)
  if (permitidos === 0) return null
  let mejor = Infinity
  for (let inicio = 0; inicio < texto.length; inicio++) {
    if (inicio > 0 && texto[inicio - 1] !== ' ') continue
    for (let largo = consulta.length - 1; largo <= consulta.length + 1; largo++) {
      if (largo <= 0 || inicio + largo > texto.length) continue
      mejor = Math.min(mejor, distanciaEdicion(consulta, texto.slice(inicio, inicio + largo)))
    }
  }
  if (mejor <= permitidos) return 2 + mejor
  return puntajePorPalabras(consulta, texto)
}

/**
 * Varias palabras en cualquier orden y con errores ("hospital erazmo" →
 * "hospital universitario erasmo meoz"): cada palabra escrita debe parecerse al
 * comienzo de alguna palabra del texto.
 */
function puntajePorPalabras(consulta: string, texto: string): number | null {
  const escritas = consulta.split(' ')
  if (escritas.length < 2) return null
  const palabras = texto.split(' ')
  let total = 0
  for (const q of escritas) {
    let mejor = Infinity
    for (const p of palabras) {
      if (p.startsWith(q)) {
        mejor = 0
        break
      }
      if (erroresPermitidos(q.length) === 0) continue
      for (let largo = q.length - 1; largo <= q.length + 1; largo++) {
        if (largo > 0 && largo <= p.length) mejor = Math.min(mejor, distanciaEdicion(q, p.slice(0, largo)))
      }
    }
    if (mejor > erroresPermitidos(q.length)) return null
    total += mejor
  }
  return 3 + total
}

export interface Sugerencia {
  lugar: Lugar
  puntaje: number
}

/** Hasta `max` lugares que coinciden por nombre o alias, del mejor al peor. */
export function buscarLugares(consulta: string, lugares: readonly Lugar[], max = 5): Sugerencia[] {
  const q = normalizar(consulta)
  if (q.length < 2) return []
  const encontrados: Sugerencia[] = []
  for (const lugar of lugares) {
    let mejor: number | null = null
    for (const texto of [lugar.nombre, ...lugar.alias]) {
      const p = puntaje(q, normalizar(texto))
      if (p !== null && (mejor === null || p < mejor)) mejor = p
    }
    if (mejor !== null) encontrados.push({ lugar, puntaje: mejor })
  }
  encontrados.sort((a, b) => a.puntaje - b.puntaje || a.lugar.nombre.length - b.lugar.nombre.length)
  return encontrados.slice(0, max)
}
