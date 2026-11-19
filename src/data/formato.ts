/**
 * 2900 → "$2.900". Se hace a mano porque Intl en español no agrupa los
 * números de 4 cifras ("2900") en varios navegadores.
 */
export function formatearTarifa(valor: number): string {
  const entero = String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${entero}`
}

/** "2026-11-18" → "18/11/2026" (sin pasar por Date para evitar líos de zona horaria). */
export function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
