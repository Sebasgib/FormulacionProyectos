import { type ReactNode, useId, useLayoutEffect, useRef } from 'react'

interface Props {
  /** Identifica el contenido: al cambiar, el foco vuelve al título y el panel sube al inicio. */
  clave: string
  titulo: ReactNode
  /** Contenido antes del título (ej. la etiqueta de demostración). */
  encabezado?: ReactNode
  children: ReactNode
  onCerrar: () => void
  /** Informa el alto del panel (px) para que el mapa encuadre por encima. 0 al cerrarse. */
  onAltura: (alto: number) => void
}

/** Panel inferior (bottom sheet) no modal: el mapa sigue usable detrás. */
export function HojaInferior({ clave, titulo, encabezado, children, onCerrar, onAltura }: Props) {
  const ref = useRef<HTMLElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const idTitulo = useId()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const raiz = document.documentElement
    const informar = () => {
      const alto = el.getBoundingClientRect().height
      // Sube los controles inferiores del mapa (atribución) por encima del panel.
      raiz.style.setProperty('--alto-hoja', `${alto}px`)
      onAltura(alto)
    }
    informar()
    const obs = new ResizeObserver(informar)
    obs.observe(el)
    return () => {
      obs.disconnect()
      raiz.style.setProperty('--alto-hoja', '0px')
      onAltura(0)
    }
  }, [onAltura])

  // Al abrir (o cambiar de contenido) llevar el foco al título, para lectores de pantalla.
  useLayoutEffect(() => {
    tituloRef.current?.focus({ preventScroll: true })
    ref.current?.scrollTo({ top: 0 })
  }, [clave])

  return (
    <section ref={ref} className="hoja" role="dialog" aria-modal="false" aria-labelledby={idTitulo}>
      <div className="hoja__cabecera">
        <div className="hoja__titulos">
          {encabezado}
          <h2 id={idTitulo} ref={tituloRef} tabIndex={-1} className="hoja__titulo">
            {titulo}
          </h2>
        </div>
        <button type="button" className="hoja__cerrar" onClick={onCerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="hoja__cuerpo">{children}</div>
    </section>
  )
}
