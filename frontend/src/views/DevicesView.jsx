// DevicesView.jsx
import React, { useMemo, useState } from 'react';
import useCachedFetch from '../hooks/useCachedFetch';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import KpiCard from '../components/KpiCard';
import { getConsistentColor, getOrgColor } from '../utils/colors';
import { Loader2, Cpu, CheckCircle, XCircle } from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, ArcElement, Title, Tooltip, Legend);

const mapDevice = (d) => ({
  ...d,
  name:         d.comercial_info?.name  || d.name         || '',
  model_name:   d.comercial_info?.model || d.model_name   || d.model || '',
  organization: d.organization          || d.final_client  || '',
  status_clean: d.comercial_info?.state || d.state         || d.status_clean || 'Desconocido',
});

const DevicesView = () => {
  const { data: fetchRes, loading } = useCachedFetch(
    'devices',
    () => api.getDevices(1, 5000)
  );

  const rawData = useMemo(() => {
    const items = Array.isArray(fetchRes) ? fetchRes : (fetchRes?.items || []);
    return items.map(mapDevice);
  }, [fetchRes]);

  const [selectedModel,     setSelectedModel]     = useState('Todos');
  const [selectedOrg,       setSelectedOrg]       = useState('Todas');
  const [drilldownModel,    setDrilldownModel]    = useState(null);
  const [drilldownHardware, setDrilldownHardware] = useState(null);
  const [drilldownStatus,   setDrilldownStatus]   = useState(null);
  const [drilldownOrg,      setDrilldownOrg]      = useState(null);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [currentPage,       setCurrentPage]       = useState(1);
  const [rowsPerPage,       setRowsPerPage]       = useState(10);

  const isKiwi = useMemo(() => rawData.some((d) => d.ssid), [rawData]);

  const uniqueModels = useMemo(() => [...new Set(rawData.map((d) => d.model_name))].filter(Boolean).sort(), [rawData]);
  const uniqueOrgs   = useMemo(() => [...new Set(rawData.map((d) => d.organization))].filter(Boolean).sort(), [rawData]);

  const activeDrilldown = drilldownModel || drilldownHardware || drilldownStatus || drilldownOrg;

  const clearAllDrilldowns = () => {
    setDrilldownModel(null);
    setDrilldownHardware(null);
    setDrilldownStatus(null);
    setDrilldownOrg(null);
    setCurrentPage(1);
  };

  // 1. Filtrado base por selectores globales (Dropdowns) para mantener estables las métricas de los KPIs
  const filteredByDropdowns = useMemo(() => {
    let data = rawData;
    if (isKiwi) {
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model_name === selectedModel);
    } else {
      if (selectedOrg   !== 'Todas') data = data.filter((d) => d.organization === selectedOrg);
      if (selectedModel !== 'Todos') data = data.filter((d) => d.model_name   === selectedModel);
    }
    return data;
  }, [rawData, selectedModel, selectedOrg, isKiwi]);

  // 2. Cálculo de métricas globales del KPI basadas en la selección de los selectores
  const kpiMetrics = useMemo(() => {
    const total = filteredByDropdowns.length;
    const online = filteredByDropdowns.filter((d) => d.status_clean === 'Terminado').length;
    const offline = total - online;
    const onlinePct = total > 0 ? ((online / total) * 100).toFixed(1) : '0.0';
    const offlinePct = total > 0 ? (100 - Number(onlinePct)).toFixed(1) : '0.0';

    return { total, online, offline, onlinePct, offlinePct };
  }, [filteredByDropdowns]);

  // 3. Filtrado final aplicando Gráficos, KPIs interactivas Y el Buscador en tiempo real
  const filteredByControls = useMemo(() => {
    let data = filteredByDropdowns;

    if (drilldownModel)    data = data.filter((d) => d.model_name === drilldownModel);
    if (drilldownHardware) data = data.filter((d) => (d.hardware_version || 'Desconocido') === drilldownHardware);
    if (drilldownOrg)      data = data.filter((d) => d.organization === drilldownOrg);
    
    if (drilldownStatus) {
      if (drilldownStatus === 'No terminado') {
        data = data.filter((d) => d.status_clean !== 'Terminado');
      } else {
        data = data.filter((d) => (d.status_clean || 'Desconocido') === drilldownStatus);
      }
    }

    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      data = data.filter((d) =>
        ['uuid', 'name', 'model_name', 'organization', 'status_clean', 'hardware_version', 'ssid'].some((key) =>
          String(d[key] || '').toLowerCase().includes(lowSearch)
        )
      );
    }

    return data;
  }, [filteredByDropdowns, drilldownModel, drilldownHardware, drilldownStatus, drilldownOrg, searchTerm]);

  // Variables de paginación sincronizadas con el dataset final filtrado
  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // Estadísticas para las gráficas
  const modelStats    = useMemo(() => { const c = filteredByControls.reduce((a, d) => { const m = d.model_name || 'Desconocido'; a[m] = (a[m] || 0) + 1; return a; }, {}); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredByControls]);
  const hardwareStats = useMemo(() => { const c = filteredByControls.reduce((a, d) => { const k = d.hardware_version || 'Desconocido'; a[k] = (a[k] || 0) + 1; return a; }, {}); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredByControls]);
  const statusData    = useMemo(() => { const c = filteredByControls.reduce((a, d) => { const k = d.status_clean || 'Desconocido'; a[k] = (a[k] || 0) + 1; return a; }, {}); return Object.entries(c).map(([name, value]) => ({ name, value })); }, [filteredByControls]);
  const orgStats      = useMemo(() => { const c = filteredByControls.reduce((a, d) => { const o = d.organization || 'SIN ASIGNAR'; a[o] = (a[o] || 0) + 1; return a; }, {}); return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); }, [filteredByControls]);

  // Manejador de toggles interactivos para los KPIs
  const handleStatusToggle = (status) => {
    setDrilldownStatus(drilldownStatus === status ? null : status);
    setDrilldownModel(null);
    setDrilldownHardware(null);
    setDrilldownOrg(null);
    setCurrentPage(1);
  };

  if (loading && rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-none animate-fade-in pb-10">

      {/* HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">🏭 Inventario de Dispositivos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {!isKiwi && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
                value={selectedOrg}
                onChange={(e) => { setSelectedOrg(e.target.value); clearAllDrilldowns(); }}
              >
                <option value="Todas">Todas</option>
                {uniqueOrgs.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">📦 Modelo</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedModel}
              onChange={(e) => { setSelectedModel(e.target.value); clearAllDrilldowns(); }}
            >
              <option value="Todos">Todos</option>
              {uniqueModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {activeDrilldown && (
            <div className="flex items-end w-full">
              <button
                onClick={clearAllDrilldowns}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar filtro: {activeDrilldown} ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Dispositivos filtrados"
          value={totalItems}
          icon={<Cpu />}
          color="blue"
          sub={`${totalItems} de ${rawData.length} totales`}
        />
        <KpiCard
          title="Terminados"
          value={kpiMetrics.online}
          icon={<CheckCircle />}
          color="green"
          sub={`${kpiMetrics.onlinePct}% del total`}
          onClick={() => handleStatusToggle('Terminado')}
          active={drilldownStatus === 'Terminado'}
        />
        <KpiCard
          title="No terminados"
          value={kpiMetrics.offline}
          icon={<XCircle />}
          color="red"
          sub={`${kpiMetrics.offlinePct}% del total`}
          onClick={() => handleStatusToggle('No terminado')}
          active={drilldownStatus === 'No terminado'}
        />
      </div>

      {/* VISUALIZACIONES */}
      <SelectDash
        storageKey="devicesView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'bar-org', title: 'Distribución por Organización', defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Organización" legendTitle="Organizaciones visibles"
                data={orgStats} labelKey="name" valueKey="value" heightClass="h-96" indexAxis="x"
                getColor={(i, row) => { const c = getOrgColor(row?.name); return c !== '#94a3b8' ? c : getConsistentColor(i); }}
                selectedLabel={drilldownOrg}
                onBarClick={(label) => { setDrilldownOrg(drilldownOrg === label ? null : label); setDrilldownModel(null); setDrilldownHardware(null); setDrilldownStatus(null); setCurrentPage(1); }}
              />
            ),
          },
          {
            id: 'bar-model', title: 'Distribución por Modelo', defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Modelo" legendTitle="Modelos visibles"
                data={modelStats} labelKey="name" valueKey="value" heightClass="h-96" indexAxis="x"
                getColor={(i) => getConsistentColor(i)} selectedLabel={drilldownModel}
                onBarClick={(label) => { setDrilldownModel(drilldownModel === label ? null : label); setDrilldownHardware(null); setDrilldownStatus(null); setDrilldownOrg(null); setCurrentPage(1); }}
              />
            ),
          },
          {
            id: 'bar-hardware', title: 'Distribución por Hardware', defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Hardware" legendTitle="Hardware visibles"
                data={hardwareStats} labelKey="name" valueKey="value" heightClass="h-96" indexAxis="x"
                getColor={(i) => getConsistentColor(i)} selectedLabel={drilldownHardware}
                onBarClick={(label) => { setDrilldownHardware(drilldownHardware === label ? null : label); setDrilldownModel(null); setDrilldownStatus(null); setDrilldownOrg(null); setCurrentPage(1); }}
              />
            ),
          },
          {
            id: 'pie-status', title: 'Estado de Dispositivos', defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Dispositivos" legendTitle="Estados visibles"
                data={statusData} labelKey="name" valueKey="value" heightClass="h-72"
                selectedLabel={drilldownStatus} getColor={(i) => getConsistentColor(i)}
                onSliceClick={(label) => { setDrilldownStatus(drilldownStatus === label ? null : label); setDrilldownModel(null); setDrilldownHardware(null); setDrilldownOrg(null); setCurrentPage(1); }}
              />
            ),
          },
        ]}
      />

      {/* TABLA */}
      <TableCard
        title="Listado de dispositivos"
        data={filteredByControls}
        columns={[
          { header: 'ID / UUID', accessor: 'uuid', render: (r) => <span className="font-mono text-xs text-gray-600">{r.uuid}</span> },
          { header: 'Nombre', accessor: 'name', render: (r) => <span className="font-semibold text-gray-700">{r.name || '-'}</span> },
          { header: 'Modelo', accessor: 'model_name' },
          {
            header: 'Organización', accessor: 'organization',
            render: (r) => { const color = getOrgColor(r.organization); return (<span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide whitespace-nowrap" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}>{r.organization || 'SIN ASIGNAR'}</span>); },
          },
          {
            header: 'Estado', accessor: 'status_clean',
            render: (row) => (<span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${row.status_clean === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status_clean || 'Desconocido'}</span>),
          },
          ...(isKiwi ? [{ header: 'SSID', accessor: 'ssid' }] : []),
          { header: 'Hardware', accessor: 'hardware_version', render: (r) => r.hardware_version || 'Desconocido' },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar por UUID, Nombre, Modelo..."
        searchableKeys={['uuid', 'name', 'model_name', 'organization', 'status_clean', 'hardware_version', 'ssid']}
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

export default DevicesView;