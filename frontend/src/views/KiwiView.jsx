// KiwiView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import KpiCard from '../components/KpiCard'; 

import { getConsistentColor } from '../utils/colors';
import { 
  Loader2, 
  Layers, 
  CheckCircle2, 
  Cpu, 
  RotateCcw 
} from 'lucide-react';

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

  // --- Drilldowns desde Gráficos o KPIs ---
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

    // Drilldown status (PieChart o KPIs)
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

  // Evalúa si la vista ha salido de su estado base
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
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center w-full gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">🥝 Dispositivos Kiwi</h2>
          <p className="text-sm text-gray-500">Gestión de versiones y conectividad</p>
        </div>

        <div className="flex items-end gap-3 w-full md:w-auto">
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

          {/* El botón de limpiar ahora sigue un comportamiento puramente condicional */}
          {hasActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm font-bold border border-red-200 shadow-sm transition-all duration-150 animate-fade-in whitespace-nowrap h-[42px]"
            >
              <RotateCcw size={15} />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* 2. NUEVOS KPIS REUTILIZABLES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
        <KpiCard
          title="Dispositivos Filtrados"
          value={totalItems}
          color="blue"
          icon={<Layers size={20} />}
          active={selectedSoftware === 'Todos' && !drilldownSoftware && !drilldownStatus}
          onClick={() => {
            setSelectedSoftware('Todos');
            setDrilldownSoftware(null);
            setDrilldownStatus(null);
            setCurrentPage(1);
          }}
        />

        <KpiCard
          title="Terminados (En Producción)"
          value={onlineDevices}
          sub={`(${onlinePct}%)`}
          color="green"
          icon={<CheckCircle2 size={20} />}
          active={drilldownStatus === 'Terminado'}
          onClick={() => {
            // Toggle interactivo del KPI de estado
            setDrilldownStatus(drilldownStatus === 'Terminado' ? null : 'Terminado');
            setDrilldownSoftware(null);
            setCurrentPage(1);
          }}
        />

        <KpiCard
          title="Sin Terminar (En Desarrollo)"
          value={totalItems - onlineDevices}
          sub={`(${(100 - onlinePct).toFixed(1)}%)`}
          color="red"
          icon={<Layers size={20} />}
          active={drilldownStatus === 'Sin Terminar'}
          onClick={() => {
            setDrilldownStatus(drilldownStatus === 'Sin Terminar' ? null : 'Sin Terminar');
            setDrilldownSoftware(null);
            setCurrentPage(1);
          }}
        />

        <KpiCard
          title="Variedad de Software"
          value={uniqueSoftware.length}
          color="purple"
          icon={<Cpu size={20} />}
          // Este KPI muestra el total absoluto de variantes, se mantiene informativo
          active={selectedSoftware !== 'Todos' || !!drilldownSoftware}
          onClick={() => {
            if (selectedSoftware !== 'Todos' || drilldownSoftware) {
              setSelectedSoftware('Todos');
              setDrilldownSoftware(null);
              setCurrentPage(1);
            }
          }}
        />
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