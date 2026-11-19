/**
 * 2900 → "$2.900". Se hace a mano porque Intl en español no agrupa los
 * números de 4 cifras ("2900") en varios navegadores.
 */
export function formatearTarifa(valor: number): string {
  const entero = String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${entero}`
}

/** 1234.5 → "1.230 m" (redondeado a decenas; nunca menos de 10 m). */
export function formatearMetros(m: number): string {
  const redondeado = Math.max(10, Math.round(m / 10) * 10)
  return `${String(redondeado).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m`
}

/** "2026-11-18" → "18/11/2026" (sin pasar por Date para evitar líos de zona horaria). */
export function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
