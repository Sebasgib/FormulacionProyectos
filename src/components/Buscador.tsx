import { type KeyboardEvent, useId, useMemo, useState } from 'react'
import { buscarLugares } from '../data/buscarLugares'
import type { Lugar, TipoLugar } from '../data/types'

const NOMBRE_TIPO: Record<TipoLugar, string> = {
  universidad: 'Universidad',
  centro_comercial: 'Centro comercial',
  barrio: 'Barrio',
  hospital: 'Hospital o clínica',
  otro: 'Lugar',
}

interface Props {
  lugares: readonly Lugar[]
  placeholder: string
  /** Nombre accesible del campo. */
  etiqueta: string
  /** Texto con el que arranca (ej. el destino ya elegido). Para cambiarlo, cambiar la `key`. */
  valorInicial?: string
  onElegir: (lugar: Lugar) => void
  onLimpiar?: () => void
  /** Texto de ayuda cuando no hay coincidencias. */
  ayudaSinResultados?: string
}

/** Campo con sugerencias de lugares (nombre o alias, tolera errores de escritura). */
export function Buscador({ lugares, placeholder, etiqueta, valorInicial = '', onElegir, onLimpiar, ayudaSinResultados }: Props) {
  const [texto, setTexto] = useState(valorInicial)
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const idLista = useId()

  const sugerencias = useMemo(() => buscarLugares(texto, lugares, 5), [texto, lugares])
  const mostrarLista = abierto && texto.trim().length >= 2

  function elegir(lugar: Lugar) {
    setTexto(lugar.nombre)
    setAbierto(false)
    setActivo(-1)
    onElegir(lugar)
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (!mostrarLista || sugerencias.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => (i + 1) % sugerencias.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => (i <= 0 ? sugerencias.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      elegir(sugerencias[Math.max(activo, 0)].lugar)
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div className="buscador">
      <div className="buscador__campo">
        <svg className="buscador__lupa" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="buscador__input"
          role="combobox"
          aria-label={etiqueta}
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
          placeholder={placeholder}
          value={texto}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
            setActivo(-1)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={teclas}
        />
        {texto && (
          <button
            type="button"
            className="buscador__limpiar"
            aria-label="Borrar"
            onClick={() => {
              setTexto('')
              setActivo(-1)
              onLimpiar?.()
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {mostrarLista && (
        <ul id={idLista} className="buscador__lista" role="listbox" aria-label="Sugerencias">
          {sugerencias.map(({ lugar }, i) => (
            <li
              key={lugar.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === activo}
              className={i === activo ? 'activo' : undefined}
              // mousedown: elegir antes de que el campo pierda el foco
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(lugar)
              }}
            >
              <span className="buscador__nombre">{lugar.nombre}</span>
              <span className="buscador__tipo">{NOMBRE_TIPO[lugar.tipo]}</span>
            </li>
          ))}
          {sugerencias.length === 0 && (
            <li className="buscador__vacio" role="presentation">
              No encontramos ese lugar.{ayudaSinResultados ? ` ${ayudaSinResultados}` : ''}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
