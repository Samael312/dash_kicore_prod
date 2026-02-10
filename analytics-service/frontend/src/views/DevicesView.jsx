import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { getConsistentColor } from '../utils/colors';
import { Loader2 } from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, getElementAtEvent } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const DevicesView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Refs (uno por gráfico)
  const barChartModelRef = useRef(null);
  const barChartHwRef = useRef(null);

  // Filtros externos
  const [selectedModel, setSelectedModel] = useState('Todos');
  const [selectedOrg, setSelectedOrg] = useState('Todas');
  const [drilldownModel, setDrilldownModel] = useState(null);
  const [drilldownHardware, setDrilldownHardware] = useState(null);

  // TableCard toolbar
  const [searchTerm, setSearchTerm] = useState('');

  // TableCard paginación (real, dentro del TableCard; aquí solo control)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getDevices(1, 5000);
        setRawData(Array.isArray(res) ? res : (res?.items || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Modo "Kiwi"
  const isKiwi = useMemo(() => rawData.some((d) => d.ssid), [rawData]);

  // Dataset base para tablas/gráficas: SOLO filtros externos (no search, eso lo hace TableCard)
  const filteredByControls = useMemo(() => {
    let data = rawData;

    if (isKiwi) {
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model === selectedModel);
    } else {
      if (selectedOrg !== 'Todas') data = data.filter((d) => d.organization === selectedOrg);
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model === selectedModel);
    }

    // Drilldowns independientes
    if (drilldownModel) data = data.filter((d) => d.model === drilldownModel);
    if (drilldownHardware) data = data.filter((d) => (d.hardware_version || 'Desconocido') === drilldownHardware);

    return data;
  }, [rawData, selectedModel, selectedOrg, drilldownModel, drilldownHardware, isKiwi]);

  // Reset de página al cambiar filtros externos / búsqueda / pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModel, selectedOrg, drilldownModel, drilldownHardware, rowsPerPage, searchTerm]);

  // IMPORTANTE:
  // TableCard filtra/ordena/pagina internamente, por tanto aquí NO recortamos.
  // totalItems/totalPages deben ser del dataset completo que le pasamos.
  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // KPIs
  const onlineDevices = useMemo(
    () => filteredByControls.filter((d) => d.status_clean === 'Terminado').length,
    [filteredByControls]
  );
  const offlineDevices = totalItems - onlineDevices;
  const onlinePct = totalItems > 0 ? ((onlineDevices / totalItems) * 100).toFixed(1) : '0.0';

  // --- Charts: Modelo ---
  const modelStats = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      const m = curr.model || 'Desconocido';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredByControls]);

  const barChartData = useMemo(
    () => ({
      labels: modelStats.map((d) => d.name),
      datasets: [
        {
          label: 'Dispositivos',
          data: modelStats.map((d) => d.value),
          backgroundColor: modelStats.map((_, i) => getConsistentColor(i)),
          borderRadius: 4,
        },
      ],
    }),
    [modelStats]
  );

  const handleBarClickModel = (event) => {
    const chart = barChartModelRef.current;
    if (!chart) return;

    const element = getElementAtEvent(chart, event);
    if (element.length > 0) {
      const { index } = element[0];
      const modelName = barChartData.labels[index];
      setDrilldownModel(modelName);
      setDrilldownHardware(null); // para evitar cruces raros
    }
  };

  // --- Charts: Hardware ---
  const hardwareStats = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      const k = curr.hardware_version || 'Desconocido';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredByControls]);

  const barChart2Data = useMemo(
    () => ({
      labels: hardwareStats.map((d) => d.name),
      datasets: [
        {
          label: 'Dispositivos',
          data: hardwareStats.map((d) => d.value),
          backgroundColor: hardwareStats.map((_, i) => getConsistentColor(i)),
          borderRadius: 4,
        },
      ],
    }),
    [hardwareStats]
  );

  const handleBarClickHw = (event) => {
    const chart = barChartHwRef.current;
    if (!chart) return;

    const element = getElementAtEvent(chart, event);
    if (element.length > 0) {
      const { index } = element[0];
      const hw = barChart2Data.labels[index];
      setDrilldownHardware(hw);
      setDrilldownModel(null); // para evitar cruces raros
    }
  };

  // --- Pie: Estado ---
  const statusData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      const k = curr.status_clean || 'Desconocido';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const statusChartData = useMemo(
    () => ({
      labels: statusData.map((d) => d.name),
      datasets: [
        {
          data: statusData.map((d) => d.value),
          backgroundColor: statusData.map((d) => (d.name === 'Terminado' ? '#00CC96' : '#EF553B')),
          borderWidth: 1,
        },
      ],
    }),
    [statusData]
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { beginAtZero: true, ticks: { precision: 0 } } },
    }),
    []
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
    }),
    []
  );

  const uniqueModels = useMemo(
    () => [...new Set(rawData.map((d) => d.model))].filter(Boolean).sort(),
    [rawData]
  );
  const uniqueOrgs = useMemo(
    () => [...new Set(rawData.map((d) => d.organization))].filter(Boolean).sort(),
    [rawData]
  );

  const renderLegend = (data, title) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full w-full overflow-hidden flex flex-col">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">{title}</h4>
      <div className="overflow-y-auto flex-grow pr-2">
        {data.map((item, idx) => (
          <div
            key={`${title}-${item.name}-${idx}`}
            className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-100 transition-colors text-sm"
          >
            <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: getConsistentColor(idx) }} />
            <span className="flex-grow text-gray-700 font-medium truncate mr-2" title={item.name}>
              {item.name}
            </span>
            <span className="font-bold text-blue-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-none animate-fade-in pb-10">
      {/* 1. HEADER Y FILTROS EXTERNOS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">🏭 Inventario de Dispositivos</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {!isKiwi && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
                value={selectedOrg}
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  setDrilldownModel(null);
                  setDrilldownHardware(null);
                }}
              >
                <option value="Todas">Todas</option>
                {uniqueOrgs.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">📦 Modelo</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setDrilldownModel(null);
                setDrilldownHardware(null);
              }}
            >
              <option value="Todos">Todos</option>
              {uniqueModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {(drilldownModel || drilldownHardware) && (
            <div className="flex items-end w-full">
              <button
                onClick={() => {
                  setDrilldownModel(null);
                  setDrilldownHardware(null);
                }}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar filtro activo: {drilldownModel || drilldownHardware} ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Dispositivos filtrados</span>
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalItems}</span>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Terminados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-green-700">{onlineDevices}</span>
            <span className="text-sm text-green-600 font-medium">({onlinePct}%)</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-red-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">No terminados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-red-700">{offlineDevices}</span>
            <span className="text-sm text-red-600 font-medium">
              ({totalItems > 0 ? (100 - Number(onlinePct)).toFixed(1) : '0.0'}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRAS + LISTA (Modelo + Hardware) */}
      <div className="grid grid-cols-12 gap-6 w-full">
        {/* MODELO */}
        <div className="col-span-12 lg:col-span-9 bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Distribución por Modelo</h3>
          <div className="h-96 w-full flex-grow relative">
            <Bar ref={barChartModelRef} data={barChartData} options={barOptions} onClick={handleBarClickModel} />
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">Haz clic en las barras para filtrar</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[400px]">
          {renderLegend(modelStats, 'Modelos visibles')}
        </div>

        {/* HARDWARE */}
        <div className="col-span-12 lg:col-span-9 bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Distribución por Hardware</h3>
          <div className="h-96 w-full flex-grow relative">
            <Bar ref={barChartHwRef} data={barChart2Data} options={barOptions} onClick={handleBarClickHw} />
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">Haz clic en las barras para filtrar</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[400px]">
          {renderLegend(hardwareStats, 'Hardware visibles')}
        </div>
      </div>

      {/* 4. PIE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Estado de Dispositivos</h3>
          <div className="h-72 w-full relative">
            <Pie data={statusChartData} options={pieOptions} />
          </div>
        </div>
      </div>

      {/* 5. TABLA (TableCard nuevo) */}
      <TableCard
        title="Listado de dispositivos"
        data={filteredByControls} // ✅ dataset completo; TableCard hace search + filtros + paginación
        columns={[
          { header: 'ID / UUID', accessor: 'uuid', render: (r) => <span className="font-mono text-xs text-gray-600">{r.uuid}</span> },
          { header: 'Nombre', accessor: 'name', render: (r) => <span className="font-semibold text-gray-700">{r.name || '-'}</span> },
          { header: 'Modelo', accessor: 'model' },
          { header: 'Organización', accessor: 'organization' },
          {
            header: 'Estado Dispositivo',
            accessor: 'status_clean',
            render: (row) => (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  row.status_clean === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {row.status_clean || 'Desconocido'}
              </span>
            ),
          },
          // Si estás en modo Kiwi, puedes mostrar ssid sin romper el resto
          ...(isKiwi ? [{ header: 'SSID', accessor: 'ssid' }] : []),
          // Hardware para que también sea filtrable desde columna
          { header: 'Hardware', accessor: 'hardware_version', render: (r) => r.hardware_version || 'Desconocido' },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Buscar por UUID, Nombre, Modelo..."
        searchableKeys={['uuid', 'name', 'ssid', 'model', 'organization', 'status_clean', 'hardware_version']}
        pageSize={rowsPerPage}
        setPageSize={setRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default DevicesView;
