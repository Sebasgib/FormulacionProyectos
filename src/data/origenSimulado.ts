import type { PuntoViaje } from './types'

/**
 * Origen falso para probar en PC sin GPS: Universidad Simón Bolívar.
 * Solo existe con `npm run dev` o con `npm run build:simulado` (.env.simulado).
 * En el build normal Vite lo reemplaza por `null` y el código se elimina.
 */
export const ORIGEN_SIMULADO: PuntoViaje | null =
  import.meta.env.DEV || import.meta.env.VITE_ORIGEN_SIMULADO === 'true'
    ? { coord: [-72.5012, 7.88353], nombre: 'Universidad Simón Bolívar (simulado)', fuente: 'simulado' }
    : null
