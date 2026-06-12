// components/KpiCard.jsx
import React from 'react';

/**
 * KpiCard — tarjeta de indicador clave unificada para todas las views.
 *
 * Props:
 *  - title      {string}          Etiqueta del KPI
 *  - value      {string|number}   Valor principal a mostrar
 *  - icon       {ReactElement}    Icono de lucide-react (se renderiza con tamaño fijo)
 *  - color      {string}          Color de acento: 'blue'|'green'|'yellow'|'red'|'purple'|'orange'|'indigo'|'slate'
 *  - sub        {string|node}     Texto o nodo secundario bajo el valor (opcional)
 *  - onClick    {Function}        Si se pasa, la tarjeta actúa como filtro toggle
 *  - active     {boolean}         Si está seleccionada como filtro activo
 *  - disabled   {boolean}         Desactiva el cursor interactivo aunque haya onClick
 */

const COLOR_MAP = {
  blue:   { border: 'border-blue-500',   icon: 'bg-blue-500',   ring: 'ring-blue-300',   text: 'text-blue-700'   },
  green:  { border: 'border-green-500',  icon: 'bg-green-500',  ring: 'ring-green-300',  text: 'text-green-700'  },
  yellow: { border: 'border-yellow-500', icon: 'bg-yellow-500', ring: 'ring-yellow-300', text: 'text-yellow-700' },
  red:    { border: 'border-red-500',    icon: 'bg-red-500',    ring: 'ring-red-300',    text: 'text-red-700'    },
  purple: { border: 'border-purple-500', icon: 'bg-purple-500', ring: 'ring-purple-300', text: 'text-purple-700' },
  orange: { border: 'border-orange-500', icon: 'bg-orange-500', ring: 'ring-orange-300', text: 'text-orange-700' },
  indigo: { border: 'border-indigo-500', icon: 'bg-indigo-500', ring: 'ring-indigo-300', text: 'text-indigo-700' },
  slate:  { border: 'border-slate-400',  icon: 'bg-slate-400',  ring: 'ring-slate-300',  text: 'text-slate-700'  },
};

const KpiCard = ({
  title,
  value,
  icon,
  color = 'blue',
  sub,
  onClick,
  active = false,
  disabled = false,
}) => {
  const palette = COLOR_MAP[color] || COLOR_MAP.blue;
  const isClickable = typeof onClick === 'function' && !disabled;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        'relative bg-white rounded-xl border-l-4 shadow-sm flex items-center gap-4 px-5 py-4 transition-all duration-150',
        palette.border,
        isClickable
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' + palette.ring
          : '',
        active
          ? 'ring-2 ring-offset-1 ' + palette.ring
          : '',
      ].join(' ')}
    >
      {/* Icono */}
      {icon && (
        <div className={`flex-shrink-0 p-3 rounded-full text-white shadow-sm ${palette.icon} ${active ? 'opacity-100' : 'opacity-85'}`}>
          {React.cloneElement(icon, { size: 22, strokeWidth: 2 })}
        </div>
      )}

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">{title}</p>
        <p className={`text-3xl font-bold leading-tight mt-0.5 ${palette.text}`}>
          {value ?? 0}
        </p>
        {sub && (
          <div className="text-[11px] text-gray-400 mt-1 leading-snug">{sub}</div>
        )}
      </div>

      {/* Badge "activo" */}
      {active && (
        <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${palette.text} border-current bg-white/80`}>
          activo
        </span>
      )}
    </div>
  );
};

export default KpiCard;