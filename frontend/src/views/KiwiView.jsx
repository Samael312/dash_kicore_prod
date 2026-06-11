// KiwiView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';

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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// OBJETO DE CACHÉ EN MEMORIA (Persiste entre cambios de pestañas)
const kiwiCache = {
  data: null
};

const mapKiwi = (d) => ({
  ...d,
  uuid: d.uuid || '',
  ssid: d.ssid || 'Desconocido',
  model: d.model || 'Sin Terminar',
  status_clean: d.status_clean || 'Desconocido',
  version_uuid: d.version_uuid || '—',
});

const KiwiView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Filtros Externos y Paginación ---
  const [selectedSoftware, setSelectedSoftware] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- Drilldowns desde Gráficos ---
  const [drilldownSoftware, setDrilldownSoftware] = useState(null);
  const [drilldownStatus, setDrilldownStatus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Si ya tenemos los datos en la caché local, los cargamos al instante sin llamar a la API
      if (kiwiCache.data) {
        setRawData(kiwiCache.data);
        return;
      }

      setLoading(true);
      try {
        const res = await api.getKiwi(1, 5000);
        const items = Array.isArray(res) ? res : (res?.items || []);
        const mappedItems = items.map(mapKiwi);
        
        // Guardamos en la caché global del archivo
        kiwiCache.data = mappedItems;
        setRawData(mappedItems);
      } catch (error) {
        console.error('Error cargando Kiwi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Solo se ejecuta al montar el componente

  // --- FILTRADO LOCAL (Dropdown + Drilldowns externos al TableCard) ---
  const filteredByControls = useMemo(() => {
    let data = rawData;

    // Dropdown de Software
    if (selectedSoftware !== 'Todos') {
      data = data.filter((d) => d.model === selectedSoftware);
    }

    // Drilldown software (BarChart)
    if (drilldownSoftware) {
      data = data.filter((d) => d.model === drilldownSoftware);
    }

    // Drilldown status (PieChart)
    if (drilldownStatus) {
      data = data.filter((d) => d.status_clean === drilldownStatus);
    }

    return data;
  }, [rawData, selectedSoftware, drilldownSoftware, drilldownStatus]);

  // --- Totales y Cálculos para KPIs / Paginación ---
  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  const onlineDevices = useMemo(
    () => filteredByControls.filter((d) => d.status_clean === 'Terminado').length,
    [filteredByControls]
  );
  const onlinePct = totalItems > 0 ? ((onlineDevices / totalItems) * 100).toFixed(1) : '0.0';

  // --- STATS PARA CHARTS ---
  const softwareStats = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.model] = (acc[curr.model] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredByControls]);

  const statusStats = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.status_clean] = (acc[curr.status_clean] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const uniqueSoftware = useMemo(
    () => [...new Set(rawData.map((d) => d.model))].sort(),
    [rawData]
  );

  const hasActiveFilter = Boolean(
    (selectedSoftware && selectedSoftware !== 'Todos') ||
      drilldownSoftware ||
      drilldownStatus ||
      searchTerm.trim()
  );

  const clearAllFilters = () => {
    setSelectedSoftware('Todos');
    setSearchTerm('');
    setDrilldownSoftware(null);
    setDrilldownStatus(null);
    setCurrentPage(1);
  };

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
                setCurrentPage(1);
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
              onClick={clearAllFilters}
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
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalItems}</span>
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

      {/* 3. SECCIONES VISUALES */}
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
                  setCurrentPage(1);
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
                data={statusStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-80"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => ((row?.__label || row?.name) === 'Terminado' ? '#10b981' : '#ef4444')}
                onSliceClick={(label) => {
                  setDrilldownStatus(label);
                  setDrilldownSoftware(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
        ]}
      />

      {/* 4. TABLA DE DETALLES INTEGRADA */}
      <TableCard
        title="Listado de Dispositivos Kiwi"
        data={filteredByControls}
        columns={[
          { 
            header: 'UUID', 
            accessor: 'uuid', 
            render: (row) => <span className="font-mono text-xs text-gray-600">{row.uuid}</span> 
          },
          { 
            header: 'SSID', 
            accessor: 'ssid', 
            render: (row) => <span className="font-bold text-gray-800">{row.ssid}</span> 
          },
          { 
            header: 'Software / Modelo', 
            accessor: 'model' 
          },
          {
            header: 'Estado',
            accessor: 'status_clean',
            render: (row) => (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  row.status_clean === 'Terminado' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {row.status_clean}
              </span>
            ),
          },
          {
            header: 'Versión ID',
            accessor: 'version_uuid',
            render: (row) => <span className="font-mono text-xs text-gray-400">{row.version_uuid}</span>,
          },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar por UUID, SSID, Software..."
        searchableKeys={['uuid', 'ssid', 'model', 'status_clean']}
        pageSize={rowsPerPage}
        setPageSize={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default KiwiView;