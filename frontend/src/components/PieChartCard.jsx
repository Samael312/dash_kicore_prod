// components/PieChartCard.jsx (actualizado igual: color por label, no por índice)
import React, { useMemo, useRef, useCallback } from 'react';
import { Pie, getElementAtEvent } from 'react-chartjs-2';

const PieChartCard = ({
  title,
  subtitle,
  data = [],

  labelKey = 'name',
  valueKey = 'value',

  heightClass = 'h-72',
  showLegend = true,
  legendTitle = 'Leyenda',
  maxSlices = 50,

  // getColor puede ser:
  // - (label,row,idx) => string  (RECOMENDADO)
  // - (idx,row) => string        (compat)
  getColor,

  onSliceClick,
  selectedLabel,

  cutout = '60%',
}) => {
  const chartRef = useRef(null);

  const rows = useMemo(() => {
    const safe = Array.isArray(data) ? data : [];
    const normalized = safe
      .map((r) => ({
        ...r,
        __label: String(r?.[labelKey] ?? 'Desconocido'),
        __value: Number(r?.[valueKey] ?? 0),
      }))
      .filter((r) => Number.isFinite(r.__value))
      .sort((a, b) => b.__value - a.__value);

    return normalized.slice(0, Math.max(1, maxSlices));
  }, [data, labelKey, valueKey, maxSlices]);

  const colorFor = useCallback(
    (row, idx) => {
      if (typeof getColor !== 'function') return undefined;
      if (getColor.length >= 3) return getColor(row.__label, row, idx);
      return getColor(idx, row);
    },
    [getColor]
  );

  const chartData = useMemo(
    () => ({
      labels: rows.map((r) => r.__label),
      datasets: [
        {
          data: rows.map((r) => r.__value),
          backgroundColor: rows.map((r, i) => colorFor(r, i)),
          borderWidth: 1,
          borderColor: '#fff',
        },
      ],
    }),
    [rows, colorFor]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: { legend: { display: false } },
    }),
    [cutout]
  );

  const handleChartClick = useCallback(
    (event) => {
      if (typeof onSliceClick !== 'function') return;
      const chart = chartRef.current;
      if (!chart) return;

      const els = getElementAtEvent(chart, event);
      if (!els?.length) return;

      const idx = els[0].index;
      const label = chartData.labels[idx];
      const row = rows[idx];
      onSliceClick(label, row, idx);
    },
    [onSliceClick, chartData.labels, rows]
  );

  return (
    <div className="grid grid-cols-12 gap-6 w-full">
      <div className={`col-span-12 ${showLegend ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col`}>
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
        </div>

        <div className={`${heightClass} w-full flex-grow relative`}>
          <Pie ref={chartRef} data={chartData} options={options} onClick={handleChartClick} />
        </div>

        {typeof onSliceClick === 'function' && (
          <p className="text-xs text-center text-gray-400 mt-2">Haz clic en el gráfico o en la leyenda para filtrar</p>
        )}
      </div>

      {showLegend && (
        <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[320px]">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full w-full overflow-hidden flex flex-col">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">{legendTitle}</h4>
            <div className="overflow-y-auto flex-grow pr-2">
              {rows.map((r, idx) => {
                const color = colorFor(r, idx) || '#94a3b8';
                const isSelected = selectedLabel && String(selectedLabel) === String(r.__label);

                return (
                  <button
                    key={`${r.__label}-${idx}`}
                    type="button"
                    onClick={() => typeof onSliceClick === 'function' && onSliceClick(r.__label, r, idx)}
                    className={`w-full text-left flex items-center py-2 px-2 rounded border-b border-gray-100 transition-colors text-sm
                      ${isSelected ? 'bg-blue-100/60' : 'hover:bg-gray-100'}`}
                    title={r.__label}
                  >
                    <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-grow text-gray-700 font-medium truncate mr-2">{r.__label}</span>
                    <span className="font-bold text-blue-900">{r.__value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PieChartCard;
