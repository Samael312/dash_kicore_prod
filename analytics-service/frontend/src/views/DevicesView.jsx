// DevicesView.jsx (con DashboardSectionManager integrado)
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
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// PieChartCard usa Pie internamente y requiere ArcElement registrado
ChartJS.register(CategoryScale, LinearScale, ArcElement, Title, Tooltip, Legend);

const DevicesView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros externos
  const [selectedModel, setSelectedModel] = useState('Todos');
  const [selectedOrg, setSelectedOrg] = useState('Todas');
  const [drilldownModel, setDrilldownModel] = useState(null);
  const [drilldownHardware, setDrilldownHardware] = useState(null);
  const [drilldownStatus, setDrilldownStatus] = useState(null);

  // TableCard toolbar
  const [searchTerm, setSearchTerm] = useState('');

  // TableCard paginación (control externo)
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

  // Dataset base: SOLO filtros externos (TableCard hace search/filtros/paginación internos)
  const filteredByControls = useMemo(() => {
    let data = rawData;

    if (isKiwi) {
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model === selectedModel);
    } else {
      if (selectedOrg !== 'Todas') data = data.filter((d) => d.organization === selectedOrg);
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model === selectedModel);
    }

    if (drilldownModel) data = data.filter((d) => d.model === drilldownModel);
    if (drilldownHardware) data = data.filter((d) => (d.hardware_version || 'Desconocido') === drilldownHardware);

    if (drilldownStatus) {
      data = data.filter((d) => (d.status_clean || 'Desconocido') === drilldownStatus);
    }

    return data;
  }, [rawData, selectedModel, selectedOrg, drilldownModel, drilldownHardware, drilldownStatus, isKiwi]);

  // Reset de página al cambiar filtros externos / búsqueda / pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModel, selectedOrg, drilldownModel, drilldownHardware, drilldownStatus, rowsPerPage, searchTerm]);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // KPIs
  const onlineDevices = useMemo(
    () => filteredByControls.filter((d) => d.status_clean === 'Terminado').length,
    [filteredByControls]
  );
  const offlineDevices = totalItems - onlineDevices;
  const onlinePct = totalItems > 0 ? ((onlineDevices / totalItems) * 100).toFixed(1) : '0.0';

  // --- Stats: Modelo ---
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

  // --- Stats: Hardware ---
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

  // --- Stats: Estado (para PieChartCard) ---
  const statusData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      const k = curr.status_clean || 'Desconocido';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const uniqueModels = useMemo(
    () => [...new Set(rawData.map((d) => d.model))].filter(Boolean).sort(),
    [rawData]
  );
  const uniqueOrgs = useMemo(
    () => [...new Set(rawData.map((d) => d.organization))].filter(Boolean).sort(),
    [rawData]
  );

  const hasActiveFilter = Boolean(drilldownModel || drilldownHardware || drilldownStatus);

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
                  setDrilldownStatus(null);
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
                setDrilldownStatus(null);
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

          {hasActiveFilter && (
            <div className="flex items-end w-full">
              <button
                onClick={() => {
                  setDrilldownModel(null);
                  setDrilldownHardware(null);
                  setDrilldownStatus(null);
                }}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar filtro activo: {drilldownModel || drilldownHardware || drilldownStatus} ✕
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

      {/* 3. SECCIONES CONTROLADAS (ocultar/minimizar/mostrar + selector) */}
      <SelectDash
        storageKey="devicesView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'bar-model',
            title: 'Distribución por Modelo',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Modelo"
                legendTitle="Modelos visibles"
                data={modelStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-96"
                indexAxis="x"
                getColor={(i) => getConsistentColor(i)}
                selectedLabel={drilldownModel}
                onBarClick={(label) => {
                  setDrilldownModel(label);
                  setDrilldownHardware(null);
                  setDrilldownStatus(null);
                }}
              />
            ),
          },
          {
            id: 'bar-hardware',
            title: 'Distribución por Hardware',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Hardware"
                legendTitle="Hardware visibles"
                data={hardwareStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-96"
                indexAxis="x"
                getColor={(i) => getConsistentColor(i)}
                selectedLabel={drilldownHardware}
                onBarClick={(label) => {
                  setDrilldownHardware(label);
                  setDrilldownModel(null);
                  setDrilldownStatus(null);
                }}
              />
            ),
          },
          {
            id: 'pie-status',
            title: 'Estado de Dispositivos',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Dispositivos"
                legendTitle="Estados visibles"
                data={statusData}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => (row.__label === 'Terminado' ? '#00CC96' : '#EF553B')}
                onSliceClick={(label) => {
                  setDrilldownStatus(label);
                  setDrilldownModel(null);
                  setDrilldownHardware(null);
                }}
              />
            ),
          },
        ]}
      />

      {/* 4. TABLA */}
      <TableCard
        title="Listado de dispositivos"
        data={filteredByControls}
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
          ...(isKiwi ? [{ header: 'SSID', accessor: 'ssid' }] : []),
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
