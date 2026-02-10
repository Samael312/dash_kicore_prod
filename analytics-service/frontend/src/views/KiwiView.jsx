

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';

import { getConsistentColor } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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

// BarChartCard usa Bar internamente => BarElement
// PieChartCard usa Pie internamente => ArcElement
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const KiwiView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- filtros / paginación ---
  const [selectedSoftware, setSelectedSoftware] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ✅ drilldowns desde charts
  const [drilldownSoftware, setDrilldownSoftware] = useState(null);
  const [drilldownStatus, setDrilldownStatus] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getKiwi(1, 5000);
        setRawData(res || []);
      } catch (error) {
        console.error('Error cargando Kiwi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // --- FILTRADO (dropdown + search + drilldowns) ---
  const filteredData = useMemo(() => {
    let data = Array.isArray(rawData) ? rawData : [];

    // Dropdown
    if (selectedSoftware !== 'Todos') {
      data = data.filter((d) => d.model === selectedSoftware);
    }

    // Drilldown software (BarChart)
    if (drilldownSoftware) {
      data = data.filter((d) => (d.model || 'Sin Terminar') === drilldownSoftware);
    }

    // Drilldown status (PieChart)
    if (drilldownStatus) {
      data = data.filter((d) => (d.status_clean || 'Desconocido') === drilldownStatus);
    }

    // Search
    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (d) =>
          (d.uuid && d.uuid.toLowerCase().includes(lower)) ||
          (d.ssid && d.ssid.toLowerCase().includes(lower)) ||
          (d.model && d.model.toLowerCase().includes(lower))
      );
    }

    return data;
  }, [rawData, selectedSoftware, drilldownSoftware, drilldownStatus, searchTerm]);

  // Reset page
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSoftware, searchTerm, rowsPerPage, drilldownSoftware, drilldownStatus]);

  // --- PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- KPIs ---
  const totalDevices = totalItems;
  const onlineDevices = useMemo(
    () => filteredData.filter((d) => d.status_clean === 'Terminado').length,
    [filteredData]
  );
  const onlinePct = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(1) : '0.0';

  // --- STATS PARA CHARTS ---
  const softwareStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const m = curr.model || 'Sin Terminar';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const statusStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const s = curr.status_clean || 'Desconocido';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const uniqueSoftware = useMemo(
    () => [...new Set((Array.isArray(rawData) ? rawData : []).map((d) => d.model).filter(Boolean))].sort(),
    [rawData]
  );

  const hasActiveFilter = Boolean(
    (selectedSoftware && selectedSoftware !== 'Todos') ||
      drilldownSoftware ||
      drilldownStatus ||
      searchTerm.trim()
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
      {/* 1. HEADER & FILTROS SUPERIORES */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center w-full gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">🥝 Dispositivos Kiwi</h2>
          <p className="text-sm text-gray-500">Gestión de versiones y conectividad</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-72">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Filtrar por Software</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedSoftware}
              onChange={(e) => {
                setSelectedSoftware(e.target.value);
                setDrilldownSoftware(null);
                setDrilldownStatus(null);
              }}
            >
              <option value="Todos">Todos los Softwares</option>
              {uniqueSoftware.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSelectedSoftware('Todos');
                setSearchTerm('');
                setDrilldownSoftware(null);
                setDrilldownStatus(null);
              }}
              className="mt-6 md:mt-0 px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
            >
              Limpiar filtros ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Dispositivos Filtrados</span>
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalDevices}</span>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Terminados (En Producción)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-green-700">{onlineDevices}</span>
            <span className="text-sm text-green-600 font-medium">({onlinePct}%)</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Variedad de Software</span>
          <span className="text-4xl font-bold text-purple-900 mt-2">{uniqueSoftware.length}</span>
        </div>
      </div>

      {/* ✅ 3. SECCIONES (ocultar/minimizar/selector) */}
      <SelectDash
        storageKey="kiwiView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'software-bar',
            title: 'Distribución por Versión',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Versión"
                subtitle="Click en barras o leyenda para filtrar"
                legendTitle="Versiones detectadas"
                data={softwareStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-96"
                indexAxis="x"
                maxBars={80}
                getColor={(i) => getConsistentColor(i)}
                selectedLabel={drilldownSoftware}
                onBarClick={(label) => {
                  setDrilldownSoftware(label);
                  setDrilldownStatus(null);
                }}
              />
            ),
          },
          {
            id: 'status-pie',
            title: 'Estado Actual',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado Actual"
                subtitle="Click en el pie o en la leyenda para filtrar"
                legendTitle="Estados visibles"
                data={statusStats} // [{name,value}]
                labelKey="name"
                valueKey="value"
                heightClass="h-80"
                selectedLabel={drilldownStatus}
                // colores simples: Terminado vs resto
                getColor={(i, row) => (row.__label === 'Terminado' ? '#10b981' : '#ef4444')}
                onSliceClick={(label) => {
                  setDrilldownStatus(label);
                  setDrilldownSoftware(null);
                }}
              />
            ),
          },
        ]}
      />

      {/* 4. TABLA DE DETALLES CON CONTROLES */}
      <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por UUID, SSID, Modelo..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar:</span>
            <select
              className="border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <TableCard
          title=""
          data={currentItems}
          columns={[
            { header: 'UUID', accessor: 'uuid', render: (row) => <span className="font-mono text-xs text-gray-600">{row.uuid}</span> },
            { header: 'SSID', accessor: 'ssid', render: (row) => <span className="font-bold text-gray-800">{row.ssid}</span> },
            { header: 'Software / Modelo', accessor: 'model' },
            {
              header: 'Estado',
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
            {
              header: 'Versión ID',
              accessor: 'version_uuid',
              render: (row) => <span className="font-mono text-xs text-gray-400">{row.version_uuid ? `${row.version_uuid.substring(0, 8)}...` : '-'}</span>,
            },
          ]}
          loading={loading}
          page={currentPage}
          setPage={setCurrentPage}
          limit={rowsPerPage}
          hasMore={false}
        />

        {/* Footer paginación */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> a{' '}
            <span className="font-bold">{Math.min(indexOfLastItem, totalItems)}</span> de{' '}
            <span className="font-bold">{totalItems}</span> resultados
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalItems === 0}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft size={16} className="mr-1" /> Anterior
            </button>

            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded border border-blue-200">
              {totalItems === 0 ? 0 : currentPage}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalItems === 0}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Siguiente <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KiwiView;
