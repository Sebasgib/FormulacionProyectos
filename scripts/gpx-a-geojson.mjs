#!/usr/bin/env node
// Convierte una traza GPX (grabada con el celular) en una ruta de Stationnow y
// la agrega o reemplaza en public/data/rutas.geojson.
//
// Uso:
//   node scripts/gpx-a-geojson.mjs <traza.gpx> --id <id> [opciones]
//
// Opciones (obligatorias para una ruta nueva; al reemplazar, las que falten
// se conservan de la ruta existente):
//   --nombre "Ruta 7 Centro"      nombre popular
//   --empresa "Nombre empresa"
//   --tarifa 2900                 pasaje aproximado en COP
//   --barrios "Centro,Latino"     separados por coma
//   --color "#C8102E"             color de la línea
// Otras:
//   --tolerancia 10               simplificación en metros (por defecto 10)
//   --archivo <ruta.geojson>      destino (por defecto public/data/rutas.geojson)
//
// Siempre deja esDemo: false y fechaVerificacion = hoy (hora local).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVO_POR_DEFECTO = resolve(RAIZ, 'public/data/rutas.geojson')
const BBOX = [-72.56, 7.8, -72.42, 7.98] // área de cucuta.pmtiles

function fallar(msg) {
  console.error(`Error: ${msg}`)
  process.exit(1)
}

// ---------- Argumentos ----------
function leerArgumentos(argv) {
  const opciones = {}
  const sueltos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [clave, valorEnLinea] = a.slice(2).split('=', 2)
      const valor = valorEnLinea ?? argv[++i]
      if (valor === undefined) fallar(`falta el valor de --${clave}`)
      opciones[clave] = valor
    } else {
      sueltos.push(a)
    }
  }
  return { gpx: sueltos[0], opciones }
}

// ---------- GPX ----------
/** Puntos de <trkpt> (o <rtept> si no hay traza), en orden. Devuelve [lng, lat][]. */
function leerGpx(texto) {
  const puntos = []
  for (const etiqueta of ['trkpt', 'rtept']) {
    const re = new RegExp(`<${etiqueta}\\b([^>]*)>`, 'g')
    for (const m of texto.matchAll(re)) {
      const lat = /\blat\s*=\s*["']([-+\d.eE]+)["']/.exec(m[1])
      const lon = /\blon\s*=\s*["']([-+\d.eE]+)["']/.exec(m[1])
      if (lat && lon) puntos.push([Number(lon[1]), Number(lat[1])])
    }
    if (puntos.length > 0) break
  }
  return puntos.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}

// ---------- Geometría ----------
const RADIO_TIERRA = 6371008.8
const rad = (g) => (g * Math.PI) / 180

/** Proyección equirectangular local en metros (sobra para unos km). */
function aMetros(puntos) {
  const lat0 = rad(puntos.reduce((s, p) => s + p[1], 0) / puntos.length)
  return puntos.map(([lng, lat]) => [rad(lng) * RADIO_TIERRA * Math.cos(lat0), rad(lat) * RADIO_TIERRA])
}

function distanciaASegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Douglas-Peucker iterativo. Devuelve los índices que se conservan. */
function simplificar(metros, tolerancia) {
  const conservar = new Uint8Array(metros.length)
  conservar[0] = conservar[metros.length - 1] = 1
  const pila = [[0, metros.length - 1]]
  while (pila.length) {
    const [ini, fin] = pila.pop()
    let maxDist = 0
    let idx = -1
    for (let i = ini + 1; i < fin; i++) {
      const d = distanciaASegmento(metros[i], metros[ini], metros[fin])
      if (d > maxDist) {
        maxDist = d
        idx = i
      }
    }
    if (idx !== -1 && maxDist > tolerancia) {
      conservar[idx] = 1
      pila.push([ini, idx], [idx, fin])
    }
  }
  return [...conservar.keys()].filter((i) => conservar[i])
}

function longitudMetros(metros) {
  let total = 0
  for (let i = 1; i < metros.length; i++) total += Math.hypot(metros[i][0] - metros[i - 1][0], metros[i][1] - metros[i - 1][1])
  return total
}

const redondear = ([lng, lat]) => [Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]

function hoy() {
  const d = new Date()
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

// ---------- Principal ----------
const { gpx, opciones } = leerArgumentos(process.argv.slice(2))
if (!gpx || !opciones.id) {
  console.error('Uso: node scripts/gpx-a-geojson.mjs <traza.gpx> --id <id> [--nombre ..] [--empresa ..] [--tarifa ..] [--barrios ..] [--color ..] [--tolerancia 10] [--archivo ..]')
  process.exit(1)
}
if (!/^[a-z0-9-]+$/.test(opciones.id)) fallar('--id solo admite minúsculas, números y guiones (ej. ruta-7-centro)')

const tolerancia = opciones.tolerancia !== undefined ? Number(opciones.tolerancia) : 10
if (!(tolerancia >= 0)) fallar('--tolerancia debe ser un número de metros ≥ 0')

let textoGpx
try {
  textoGpx = readFileSync(gpx, 'utf8')
} catch (e) {
  fallar(`no se pudo leer ${gpx}: ${e.message}`)
}

// Quitar puntos repetidos seguidos (el GPS los genera al estar detenido).
const crudos = leerGpx(textoGpx).filter((p, i, arr) => i === 0 || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1])
if (crudos.length < 2) fallar('el GPX no tiene al menos 2 puntos de traza (<trkpt>) ni de ruta (<rtept>)')

const fuera = crudos.filter(([lng, lat]) => lng < BBOX[0] || lng > BBOX[2] || lat < BBOX[1] || lat > BBOX[3])
if (fuera.length > 0) console.warn(`Aviso: ${fuera.length} de ${crudos.length} puntos quedan fuera del área del mapa.`)

const metros = aMetros(crudos)
const indices = simplificar(metros, tolerancia)
const coordenadas = indices.map((i) => redondear(crudos[i]))

const archivo = opciones.archivo ? resolve(opciones.archivo) : ARCHIVO_POR_DEFECTO
let coleccion
try {
  coleccion = JSON.parse(readFileSync(archivo, 'utf8'))
} catch (e) {
  fallar(`no se pudo leer ${archivo}: ${e.message}`)
}
if (coleccion?.type !== 'FeatureCollection' || !Array.isArray(coleccion.features)) fallar(`${archivo} no es un FeatureCollection`)

const indiceExistente = coleccion.features.findIndex((f) => f.properties?.id === opciones.id)
const anterior = indiceExistente >= 0 ? coleccion.features[indiceExistente].properties : {}

const tarifa = opciones.tarifa !== undefined ? Number(String(opciones.tarifa).replace(/[$.\s]/g, '')) : anterior.tarifaAprox
const propiedades = {
  id: opciones.id,
  nombrePopular: opciones.nombre ?? anterior.nombrePopular,
  empresa: opciones.empresa ?? anterior.empresa,
  tarifaAprox: tarifa,
  barrios: opciones.barrios !== undefined ? opciones.barrios.split(',').map((b) => b.trim()).filter(Boolean) : anterior.barrios,
  color: opciones.color ?? anterior.color,
  fechaVerificacion: hoy(),
  esDemo: false,
}

const faltan = Object.entries({ nombre: propiedades.nombrePopular, empresa: propiedades.empresa, tarifa: propiedades.tarifaAprox, barrios: propiedades.barrios, color: propiedades.color })
  .filter(([, v]) => v === undefined)
  .map(([k]) => `--${k}`)
if (faltan.length) fallar(`ruta nueva: faltan ${faltan.join(', ')}`)
if (!Number.isFinite(propiedades.tarifaAprox) || propiedades.tarifaAprox <= 0) fallar('--tarifa debe ser un número de pesos, ej. 2900')
if (!/^#[0-9a-fA-F]{6}$/.test(propiedades.color)) fallar('--color debe ser hex de 6 dígitos, ej. #C8102E')

const feature = { type: 'Feature', properties: propiedades, geometry: { type: 'LineString', coordinates: coordenadas } }
if (indiceExistente >= 0) coleccion.features[indiceExistente] = feature
else coleccion.features.push(feature)

writeFileSync(archivo, JSON.stringify(coleccion, null, 1) + '\n')

console.log(`${indiceExistente >= 0 ? 'Reemplazada' : 'Agregada'} "${propiedades.nombrePopular}" (${opciones.id}) en ${archivo}`)
console.log(`  Puntos: ${crudos.length} → ${coordenadas.length} (tolerancia ${tolerancia} m)`)
// Se mide la línea simplificada: la traza cruda zigzaguea por el ruido del GPS.
const longitud = longitudMetros(indices.map((i) => metros[i]))
console.log(`  Longitud: ${(longitud / 1000).toFixed(2)} km · verificada ${propiedades.fechaVerificacion}`)
if (indiceExistente >= 0) console.log('  Recuerda revisar sus paraderos en public/data/paraderos.geojson.')
