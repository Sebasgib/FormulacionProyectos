# StationNow

PWA para consultar rutas de buseta en Cúcuta. Funciona sin conexión después de la primera visita.

Stack: React + Vite + TypeScript, vite-plugin-pwa (Workbox), MapLibre GL JS y PMTiles (Protomaps / OpenStreetMap).
El mapa sale de un archivo PMTiles propio; no se usa tile.openstreetmap.org ni Mapbox.

## Desarrollo

```bash
npm install
npm run dev       # desarrollo (el service worker no se activa en dev)
npm run build     # compila a dist/
npm run preview   # sirve dist/ en http://localhost:4173 (para probar offline e instalación)
```

## Estructura

```
public/
  tiles/cucuta.pmtiles   mapa vectorial del área metropolitana (z0–15)
  fonts/                 glifos Noto Sans (rangos latinos) para las etiquetas
  sprites/               íconos del estilo claro de Protomaps (v4)
  icons/                 íconos provisionales de la PWA
src/
  components/            UI (OfflineBadge)
  map/                   MapView, estilo y configuración del mapa
  data/                  datos de rutas (fases siguientes)
  sw.ts                  service worker (precarga + RangeRequestsPlugin)
```

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
