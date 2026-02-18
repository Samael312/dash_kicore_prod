// components/BarChartCard.jsx
import React, { useMemo, useRef } from "react";
import { Bar } from "react-chartjs-2";
// Nota: Asegúrate de tener registrados los componentes de ChartJS en tu app (ChartJS.register(...))

const BarChartCard = ({
  title,
  subtitle,
  data = [],
  labelKey = "name",
  valueKey = "value",
  heightClass = "h-96", // Esta clase define la altura del gráfico (ej. 24rem/384px)
  showLegend = true,
  legendTitle = "Leyenda",
  maxBars = 50,
  indexAxis = "x",
  getColor,
  onBarClick,
  selectedLabel,
}) => {
  const chartRef = useRef(null);

  const rows = useMemo(() => {
    const safe = Array.isArray(data) ? data : [];
    return safe
      .map((r) => ({
        ...r,
        __label: String(r?.[labelKey] ?? "Desconocido"),
        __value: Number(r?.[valueKey] ?? 0),
      }))
      .filter((r) => Number.isFinite(r.__value))
      .sort((a, b) => b.__value - a.__value)
      .slice(0, Math.max(1, maxBars));
  }, [data, labelKey, valueKey, maxBars]);

  const chartData = useMemo(
    () => ({
      labels: rows.map((r) => r.__label),
      datasets: [
        {
          label: title || "Datos",
          data: rows.map((r) => r.__value),
          backgroundColor: rows.map((r, i) =>
            typeof getColor === "function" ? getColor(i, r) : undefined
          ),
          borderRadius: 4,
        },
      ],
    }),
    [rows, title, getColor]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed?.[indexAxis === "y" ? "x" : "y"];
              return ` ${v}`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          ...(indexAxis === "x" ? { display: false } : {}),
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          ...(indexAxis === "y" ? { display: false } : {}),
        },
      },
      onClick: (event) => {
        if (typeof onBarClick !== "function") return;
        const chart = chartRef.current;
        if (!chart) return;
        const nativeEvent = event?.nativeEvent ?? event;
        const elements = chart.getElementsAtEventForMode(
          nativeEvent,
          "nearest",
          { intersect: true },
          true
        );
        if (!elements?.length) return;
        const idx = elements[0].index;
        const label = chartData.labels[idx];
        const row = rows[idx];
        if (!label || !row) return;
        onBarClick(label, row, idx);
      },
    }),
    [indexAxis, onBarClick, chartData.labels, rows]
  );

  // MODIFICADO: Aceptamos heightClass para sincronizar la altura
  const Legend = ({ legendRows, legendTitleText, listHeightClass }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 w-full flex flex-col h-full">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">
        {legendTitleText}
      </h4>
      {/* AQUÍ ESTÁ EL CAMBIO CLAVE:
         Aplicamos la clase de altura (ej. h-96) directamente al contenedor de la lista.
         Esto fuerza a que el scroll aparezca cuando el contenido excede esa altura,
         en lugar de empujar el contenedor padre.
      */}
      <div className={`overflow-y-auto flex-grow pr-2 ${listHeightClass}`}>
        {legendRows.map((r, idx) => {
          const color = typeof getColor === "function" ? getColor(idx, r) : "#94a3b8";
          const isSelected = selectedLabel && String(selectedLabel) === String(r.__label);

          return (
            <button
              key={`${r.__label}-${idx}`}
              type="button"
              onClick={() => typeof onBarClick === "function" && onBarClick(r.__label, r, idx)}
              className={`w-full text-left flex items-center py-2 px-2 rounded border-b border-gray-100 transition-colors text-sm
                ${isSelected ? "bg-blue-100/60" : "hover:bg-gray-100"}`}
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
  );

  return (
    <div className="grid grid-cols-12 gap-6 w-full items-start">
      <div
        className={`col-span-12 ${
          showLegend ? "lg:col-span-9" : "lg:col-span-12"
        } bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col`}
      >
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
        </div>

        {/* El gráfico tiene heightClass */}
        <div className={`${heightClass} w-full flex-grow relative`}>
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>

        {typeof onBarClick === "function" && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Haz clic en las barras o en la leyenda para filtrar
          </p>
        )}
      </div>

      {showLegend && (
        // Quitamos min-h-[400px] y h-full estricto del wrapper exterior para evitar conflictos de Grid
        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full">
          <Legend 
            legendRows={rows} 
            legendTitleText={legendTitle} 
            listHeightClass={heightClass} // Pasamos la misma altura que el gráfico
          />
        </div>
      )}
    </div>
  );
};

export default BarChartCard;