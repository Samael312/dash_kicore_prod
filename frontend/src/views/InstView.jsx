// InstallationsView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import { getConsistentColor } from '../utils/colors';
import { Loader2 } from 'lucide-react';

import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

// Formatea ISO 8601 a fecha legible: "01/02/2026 12:25"
const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return '—';
    return d.toLocaleString('es-ES', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return '—';
  }
};

// Normaliza cada instalación
const mapInstallation = (d) => ({
  ...d,
  uuid:             d.uuid        || '',
  name:             d.name        || 'Sin nombre',
  description:      d.description || 'Sin descripción',
  state_clean:      d.state === true ? 'Conectado' : 'Desconectado',
  enabled_clean:    d.enabled === true ? 'Habilitado' : 'Deshabilitado',
  last_change:      d.last_change      || null,
  first_connection: d.first_connection || null,
});

const InstallationsView = () => {
  const [rawData,     setRawData]     = useState([]);
  const [loading,     setLoading]     = useState(false);

  const [selectedEnabled,  setSelectedEnabled]  = useState('Todos');
  const [drilldownState,   setDrilldownState]   = useState(null);
  const [drilldownEnabled, setDrilldownEnabled] = useState(null);

  const [searchTerm,  setSearchTerm]  = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.getInst(1, 5000);
        const items = Array.isArray(res) ? res : (res?.items || []);
        setRawData(items.map(mapInstallation));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredByControls = useMemo(() => {
    let data = rawData;
    if (selectedEnabled !== 'Todos') data = data.filter((d) => d.enabled_clean === selectedEnabled);
    if (drilldownState)              data = data.filter((d) => d.state_clean   === drilldownState);
    if (drilldownEnabled)            data = data.filter((d) => d.enabled_clean === drilldownEnabled);
    return data;
  }, [rawData, selectedEnabled, drilldownState, drilldownEnabled]);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  const connected    = useMemo(() => filteredByControls.filter((d) => d.state_clean   === 'Conectado').length,    [filteredByControls]);
  const disconnected = useMemo(() => filteredByControls.filter((d) => d.state_clean   === 'Desconectado').length, [filteredByControls]);
  const enabled      = useMemo(() => filteredByControls.filter((d) => d.enabled_clean === 'Habilitado').length,   [filteredByControls]);

  const connectedPct = totalItems > 0 ? ((connected / totalItems) * 100).toFixed(1) : '0.0';

  const stateData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.state_clean] = (acc[curr.state_clean] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const enabledData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.enabled_clean] = (acc[curr.enabled_clean] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const activeDrilldown = drilldownState || drilldownEnabled;
  const hasActiveFilter = Boolean(activeDrilldown);

  const clearAllDrilldowns = () => {
    setDrilldownState(null);
    setDrilldownEnabled(null);
    setCurrentPage(1);
  };

  const getStateColor = (label) => {
    if (label === 'Conectado')    return '#00CC96';
    if (label === 'Desconectado') return '#EF553B';
    return '#94a3b8';
  };

  const getEnabledColor = (label) => {
    if (label === 'Habilitado')    return '#0086be';
    if (label === 'Deshabilitado') return '#f59e0b';
    return '#94a3b8';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Instalaciones...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-none animate-fade-in pb-10">

      {/* 1. HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">🔌 Inventario de Instalaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">⚡ Estado habilitación</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedEnabled}
              onChange={(e) => { setSelectedEnabled(e.target.value); clearAllDrilldowns(); }}
            >
              <option value="Todos">Todos</option>
              <option value="Habilitado">Habilitado</option>
              <option value="Deshabilitado">Deshabilitado</option>
            </select>
          </div>

          {hasActiveFilter && (
            <div className="flex items-end w-full">
              <button
                onClick={clearAllDrilldowns}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar filtro activo: {activeDrilldown} ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Total</span>
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalItems}</span>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Conectados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-green-700">{connected}</span>
            <span className="text-sm text-green-600 font-medium">({connectedPct}%)</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-red-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Desconectados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-red-700">{disconnected}</span>
            <span className="text-sm text-red-600 font-medium">
              ({totalItems > 0 ? ((disconnected / totalItems) * 100).toFixed(1) : '0.0'}%)
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-indigo-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Habilitados</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-indigo-700">{enabled}</span>
            <span className="text-sm text-indigo-600 font-medium">
              ({totalItems > 0 ? ((enabled / totalItems) * 100).toFixed(1) : '0.0'}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. VISUALIZACIONES */}
      <SelectDash
        storageKey="installationsView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'pie-state',
            title: 'Estado de Conexión',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Conexión"
                legendTitle="Estados visibles"
                data={stateData}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownState}
                getColor={(i, row) => getStateColor(row?.__label || row?.name)}
                onSliceClick={(label) => {
                  setDrilldownState(label);
                  setDrilldownEnabled(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
          {
            id: 'pie-enabled',
            title: 'Habilitación',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Habilitación"
                legendTitle="Estados visibles"
                data={enabledData}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownEnabled}
                getColor={(i, row) => getEnabledColor(row?.__label || row?.name)}
                onSliceClick={(label) => {
                  setDrilldownEnabled(label);
                  setDrilldownState(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
        ]}
      />

      {/* 4. TABLA */}
      <TableCard
        title="Listado de instalaciones"
        data={filteredByControls}
        columns={[
          {
            header: 'UUID',
            accessor: 'uuid',
            render: (r) => <span className="font-mono text-xs text-gray-600">{r.uuid}</span>,
          },
          {
            header: 'Nombre',
            accessor: 'name',
            render: (r) => <span className="font-semibold text-gray-700">{r.name}</span>,
          },
          {
            header: 'Descripción',
            accessor: 'description',
            render: (r) => <span className="text-gray-500 text-xs">{r.description || '-'}</span>,
          },
          {
            header: 'Conexión',
            accessor: 'state_clean',
            render: (r) => (
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: `${getStateColor(r.state_clean)}18`,
                  color: getStateColor(r.state_clean),
                  border: `1px solid ${getStateColor(r.state_clean)}40`,
                }}
              >
                {r.state_clean}
              </span>
            ),
          },
          {
            header: 'Habilitada',
            accessor: 'enabled_clean',
            render: (r) => (
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: `${getEnabledColor(r.enabled_clean)}18`,
                  color: getEnabledColor(r.enabled_clean),
                  border: `1px solid ${getEnabledColor(r.enabled_clean)}40`,
                }}
              >
                {r.enabled_clean}
              </span>
            ),
          },
          {
            header: 'Último cambio',
            accessor: 'last_change',
            render: (r) => (
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {formatDate(r.last_change)}
              </span>
            ),
          },
          {
            header: 'Primera conexión',
            accessor: 'first_connection',
            render: (r) => (
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {formatDate(r.first_connection)}
              </span>
            ),
          },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar por UUID, Nombre, Descripción..."
        searchableKeys={['uuid', 'name', 'description', 'state_clean', 'enabled_clean']}
        pageSize={rowsPerPage}
        setPageSize={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default InstallationsView;