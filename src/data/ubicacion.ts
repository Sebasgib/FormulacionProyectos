import { TILES_BBOX } from '../map/config'
import type { Coordenada } from './types'

export type FalloUbicacion = 'denegado' | 'no-disponible' | 'fuera-del-area'

/**
 * Ubicación actual del teléfono. Privacidad (F-09): la coordenada solo se
 * devuelve a quien llama; no se guarda ni se envía a ningún servidor.
 */
export function obtenerUbicacion(): Promise<Coordenada> {
  return new Promise((resolver, rechazar) => {
    if (!('geolocation' in navigator)) {
      rechazar('no-disponible' satisfies FalloUbicacion)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const c: Coordenada = [coords.longitude, coords.latitude]
        const [oeste, sur, este, norte] = TILES_BBOX
        const dentro = c[0] >= oeste && c[0] <= este && c[1] >= sur && c[1] <= norte
        if (dentro) resolver(c)
        else rechazar('fuera-del-area' satisfies FalloUbicacion)
      },
      (err) => rechazar((err.code === err.PERMISSION_DENIED ? 'denegado' : 'no-disponible') satisfies FalloUbicacion),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

/** Estado del permiso sin preguntar nada al usuario. */
export async function estadoPermisoUbicacion(): Promise<PermissionState | 'desconocido'> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state
  } catch {
    return 'desconocido'
  }
}
