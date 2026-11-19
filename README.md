# StationNow

PWA para consultar rutas de buseta en Cúcuta. Funciona sin conexión después de la primera visita.

Stack: React + Vite + TypeScript, vite-plugin-pwa (Workbox), MapLibre GL JS y PMTiles (Protomaps / OpenStreetMap).
El mapa sale de un archivo PMTiles propio; no se usa tile.openstreetmap.org ni Mapbox.

## Desarrollo

```bash
npm install
npm run dev             # desarrollo (el service worker no se activa en dev)
npm run build           # compila a dist/
npm run build:simulado  # igual, pero con el origen simulado en la USB (pruebas en PC)
npm run preview         # sirve dist/ en http://localhost:4173 (para probar offline e instalación)
npm test                # pruebas unitarias (Vitest)
npm run lint
```

## Búsqueda de rutas (en el teléfono)

1. **Destino**: el campo "¿A dónde vas?" busca en `lugares.json` por nombre y alias, sin
   distinguir mayúsculas ni tildes y tolerando errores de escritura (distancia de edición
   propia en `src/data/buscarLugares.ts`: 1 error hasta 5 letras, 2 desde 6). También se
   puede **mantener presionado el mapa** (o clic derecho en PC) para elegir un punto exacto.
2. **Origen**: la ubicación del teléfono (Geolocation API), con una explicación antes de
   pedir el permiso. Si se niega o no hay GPS, se elige con el buscador o tocando el mapa.
   En `npm run dev` y `npm run build:simulado` el origen arranca en la Universidad Simón
   Bolívar (7.88353, -72.50120); el build normal no incluye ese origen.
3. **Cálculo** (`src/data/buscarRutas.ts`, función pura con pruebas): para cada ruta busca
   el par de paraderos abordaje → bajada, con el abordaje **antes** que la bajada en el
   recorrido (rutas de un solo sentido) y ambos a máximo **400 m** en línea recta del
   origen y del destino. Ordena por caminata total y muestra hasta 3. Si ninguna sirve,
   muestra la más cercana con un aviso. Sin trasbordos.

**Privacidad (F-09):** la ubicación nunca se envía a ningún servidor ni se guarda; solo
vive en la memoria de la página. Todo el cálculo usa los datos ya precargados.

## Estructura

```
public/
  tiles/cucuta.pmtiles   mapa vectorial del área metropolitana (z0–15)
  fonts/                 glifos Noto Sans (rangos latinos) para las etiquetas
  sprites/               íconos del estilo claro de Protomaps (v4)
  icons/                 íconos provisionales de la PWA
  data/
    rutas.geojson        recorridos (LineString, un solo sentido)
    paraderos.geojson    paraderos (Point) con rutaId y orden
    lugares.json         lugares de referencia con alias populares
scripts/
  gpx-a-geojson.mjs      convierte una traza GPX en una ruta
src/
  components/            UI: PanelBusqueda, Buscador, PanelOrigen, Resultados,
                         FichaRuta, SelectorRuta, HojaInferior, OfflineBadge
  map/                   MapView, capas de rutas, marcadores, estilo y configuración
  data/                  tipos, carga de datos, buscarLugares, buscarRutas (+ pruebas),
                         ubicación, origen simulado y formato
  sw.ts                  service worker (precarga + RangeRequestsPlugin)
```

## Datos de rutas

Los tipos están en `src/data/types.ts` (`Ruta`, `Paradero`, `Lugar`). Los archivos de
`public/data/` entran en la precarga del service worker, así que funcionan sin conexión.

Las 4 rutas actuales (`Ruta 7 Centro`, `Ruta 2A Atalaya`, `Ruta 12 San Mateo`,
`Ruta 5 Libertad`) son **de demostración** (`esDemo: true`): se trazaron sobre la red
vial de OpenStreetMap pasando por el corredor Universidad Simón Bolívar – Centro –
Ventura Plaza, pero **no son recorridos reales**, y sus empresas son ficticias.
La app las marca con la etiqueta "Datos de demostración".

Referencias usadas (OpenStreetMap):

| Lugar | lat, lng | Fuente |
|---|---|---|
| Universidad Simón Bolívar, sede Cúcuta (Av. 3 Nº 13-34) | 7.88353, -72.50120 | OSM way/283721894 |
| CC Ventura Plaza | 7.88779, -72.49666 | OSM way/646357565 |
| Parque Santander | 7.88629, -72.50428 | OSM way/288636323 |

## Agregar una ruta grabada con GPS (GPX → GeoJSON)

1. Graba el recorrido en un solo sentido con una app de GPS del celular y expórtalo como `.gpx`.
2. Ejecuta:

```bash
# Ruta nueva: todos los metadatos son obligatorios
node scripts/gpx-a-geojson.mjs traza.gpx --id ruta-7-centro \
  --nombre "Ruta 7 Centro" --empresa "Nombre de la empresa" --tarifa 2900 \
  --barrios "Ceiba II, Quinta Bosch, Centro" --color "#C8102E"

# Reemplazar el recorrido de una ruta existente (conserva nombre, empresa, etc.)
node scripts/gpx-a-geojson.mjs traza.gpx --id ruta-7-centro
```

El script lee los `<trkpt>` (o `<rtept>`), quita puntos repetidos, simplifica la línea
(Douglas-Peucker, `--tolerancia 10` metros por defecto) y agrega o reemplaza la ruta en
`public/data/rutas.geojson` con `esDemo: false` y la fecha de hoy en `fechaVerificacion`.
Avisa si hay puntos fuera del área del mapa. Con `--archivo otro.geojson` escribe en otro archivo.

Los paraderos no se tocan: después de reemplazar un recorrido, revisa que los de esa ruta
en `public/data/paraderos.geojson` sigan sobre la nueva línea. Luego `npm run build`.

## Cómo funciona sin conexión

- El service worker precarga la app, `cucuta.pmtiles` completo, fuentes y sprites.
- PMTiles lee el archivo con peticiones `Range`. `RangeRequestsPlugin` está añadido a la
  precarga (`addPlugins`), así que la respuesta guardada se recorta y se devuelve como `206`.
- Fuentes y sprites se sirven desde `public/` porque el estilo de `@protomaps/basemaps`
  no los incluye y por defecto apuntarían a un servidor externo.

## Regenerar el mapa

Con la CLI [go-pmtiles](https://github.com/protomaps/go-pmtiles/releases). Busca la build más
reciente en https://maps.protomaps.com/builds (lista: https://build-metadata.protomaps.dev/builds.json):

```bash
pmtiles extract https://build.protomaps.com/AAAAMMDD.pmtiles public/tiles/cucuta.pmtiles \
  --bbox=-72.56,7.80,-72.42,7.98 --maxzoom=15
```

Build usada actualmente: `20261118.pmtiles` (esquema de teselas 4.15.2) → 4,92 MB.

Fuentes y sprites vienen de https://github.com/protomaps/basemaps-assets
(`fonts/Noto Sans {Regular,Medium,Italic}/{0-255,256-511,8192-8447}.pbf` y `sprites/v4/light*`).

## Atribución

© colaboradores de OpenStreetMap · Protomaps
