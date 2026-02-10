// components/BarChartCard.jsx
import React, { useMemo, useRef } from "react";
import { Bar, getElementAtEvent } from "react-chartjs-2";

const BarChartCard = ({
  title,
  subtitle,
  data = [],
  labelKey = "name",
  valueKey = "value",
  heightClass = "h-96",
  showLegend = true,
  legendTitle = "Leyenda",
  maxBars = 50,
  indexAxis = "x", // 'x' (vertical) o 'y' (horizontal)
  getColor, // (index, row) => string
  onBarClick, // (label, row, index) => void
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

      // ✅ FIX: usar nativeEvent para que Chart.js detecte el elemento
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
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>

        {typeof onBarClick === "function" && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Haz clic en las barras o en la leyenda para filtrar
          </p>
        )}
      </div>

      {showLegend && (
        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[400px]">
          <Legend legendRows={rows} legendTitleText={legendTitle} />
        </div>
      )}
    </div>
  );
};

export default BarChartCard;
