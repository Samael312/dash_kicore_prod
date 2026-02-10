// components/PieChartCard.jsx
import React, { useMemo, useRef } from "react";
import { Pie, getElementAtEvent } from "react-chartjs-2";

/**
 * PieChartCard
 * - Click en porción del pie -> onSliceClick(label, row, index)
 * - Click en leyenda -> onSliceClick(label, row, index)
 * - Leyenda lateral scrollable como BarChartCard
 *
 * Requiere ChartJS.register(ArcElement, Tooltip, Legend, ...) hecho en tu app.
 */
const PieChartCard = ({
  title,
  subtitle,
  data = [],

  // Campos
  labelKey = "name",
  valueKey = "value",

  // Visual
  heightClass = "h-72",
  showLegend = true,
  legendTitle = "Leyenda",
  maxSlices = 50,

  // Colores
  getColor, // (index, row) => string

  // Interacción
  onSliceClick, // (label, row, index) => void
  selectedLabel, // string | null (para resaltar)
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
      .slice(0, Math.max(1, maxSlices));
  }, [data, labelKey, valueKey, maxSlices]);

  const chartData = useMemo(() => {
    const colors = rows.map((r, i) => (typeof getColor === "function" ? getColor(i, r) : undefined));
    return {
      labels: rows.map((r) => r.__label),
      datasets: [
        {
          label: title || "Datos",
          data: rows.map((r) => r.__value),
          backgroundColor: colors,
          borderWidth: 1,
          // ✅ resalte del seleccionado (opcional)
          offset: rows.map((r) => (selectedLabel && String(selectedLabel) === String(r.__label) ? 10 : 0)),
          // ✅ borde más marcado del seleccionado (opcional)
          borderColor: rows.map((r) =>
            selectedLabel && String(selectedLabel) === String(r.__label) ? "#111827" : "rgba(0,0,0,0.08)"
          ),
        },
      ],
    };
  }, [rows, title, getColor, selectedLabel]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              const label = ctx.label ?? "";
              return ` ${label}: ${v}`;
            },
          },
        },
      },

      // ✅ Click en una porción
      onClick: (event) => {
        if (typeof onSliceClick !== "function") return;

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

        onSliceClick(label, row, idx);
      },
    };
  }, [onSliceClick, chartData.labels, rows]);

  const Legend = ({ legendRows, legendTitleText }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full w-full overflow-hidden flex flex-col">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">
        {legendTitleText}
      </h4>
      <div className="overflow-y-auto flex-grow pr-2">
        {legendRows.map((r, idx) => {
          const color = typeof getColor === "function" ? getColor(idx, r) : "#94a3b8";
          const isSelected = selectedLabel && String(selectedLabel) === String(r.__label);

          return (
            <button
              key={`${r.__label}-${idx}`}
              type="button"
              onClick={() => typeof onSliceClick === "function" && onSliceClick(r.__label, r, idx)}
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
    <div className="grid grid-cols-12 gap-6 w-full">
      <div
        className={`col-span-12 ${
          showLegend ? "lg:col-span-9" : "lg:col-span-12"
        } bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col`}
      >
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-400">{subtitle}</p> : null}
        </div>

        <div className={`${heightClass} w-full flex-grow relative`}>
          <Pie ref={chartRef} data={chartData} options={options} />
        </div>

        {typeof onSliceClick === "function" && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Haz clic en el pie o en la leyenda para filtrar
          </p>
        )}
      </div>

      {showLegend && (
        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[300px]">
          <Legend legendRows={rows} legendTitleText={legendTitle} />
        </div>
      )}
    </div>
  );
};

export default PieChartCard;
