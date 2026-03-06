// M2MView.jsx (actualizado "con lo nuevo" estilo DevicesView: TableCard filtra/pagina, tú solo aplicas filtros externos)
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import { getConsistentColor, COLORS } from '../utils/colors';
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

const M2MView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros externos
  const [selectedOrg, setSelectedOrg] = useState('Todas');

  // Drilldowns desde charts
  const [drilldownStatus, setDrilldownStatus] = useState(null);    // status_clean
  const [drilldownNetwork, setDrilldownNetwork] = useState(null);  // network_type
  const [drilldownCountry, setDrilldownCountry] = useState(null);  // country_code
  const [drilldownPlan, setDrilldownPlan] = useState(null);        // rate_plan
  const [drilldownTier, setDrilldownTier] = useState(null);        // usage_tier_daily / usage_tier_month

  // Tabs
  const [activeTab, setActiveTab] = useState('diario');

  // TableCard toolbar + paginación (control externo)
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getM2M(1, 5000);
        setRawData(Array.isArray(res) ? res : (res?.items || []));
      } catch (error) {
        console.error('Error cargando M2M:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const uniqueOrgs = useMemo(
    () => [...new Set(rawData.map((d) => d.organization))].filter(Boolean).sort(),
    [rawData]
  );

  const hasActiveFilter = Boolean(drilldownStatus || drilldownNetwork || drilldownCountry || drilldownPlan || drilldownTier);

  // Dataset base: SOLO filtros externos (TableCard hace search/paginación internos)
  const filteredByControls = useMemo(() => {
    let data = rawData;

    if (selectedOrg !== 'Todas') data = data.filter((d) => d.organization === selectedOrg);

    if (drilldownStatus) data = data.filter((d) => (d.status_clean || 'N/A') === drilldownStatus);
    if (drilldownNetwork) data = data.filter((d) => (d.network_type || 'N/A') === drilldownNetwork);
    if (drilldownCountry) data = data.filter((d) => (d.country_code || 'N/A') === drilldownCountry);
    if (drilldownPlan) data = data.filter((d) => (d.rate_plan || 'N/A') === drilldownPlan);

    if (drilldownTier) {
      const key = activeTab === 'diario' ? 'usage_tier_daily' : 'usage_tier_month';
      data = data.filter((d) => (d[key] || 'N/A') === drilldownTier);
    }

    return data;
  }, [rawData, selectedOrg, drilldownStatus, drilldownNetwork, drilldownCountry, drilldownPlan, drilldownTier, activeTab]);

  // Reset de página al cambiar filtros externos / búsqueda / pageSize
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedOrg,
    drilldownStatus,
    drilldownNetwork,
    drilldownCountry,
    drilldownPlan,
    drilldownTier,
    activeTab,
    rowsPerPage,
    searchTerm,
  ]);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // KPIs
  const totalSims = totalItems;
  const totalAlarms = useMemo(
    () => filteredByControls.reduce((sum, d) => sum + (Number(d.alarm_count) || 0), 0),
    [filteredByControls]
  );
  const simsWithAlerts = useMemo(
    () => filteredByControls.filter((d) => (Number(d.alarm_count) || 0) > 0).length,
    [filteredByControls]
  );

  // Helper stats
  const getGroupStats = (arr, field) => {
    const counts = arr.reduce((acc, curr) => {
      const k = curr?.[field] || 'N/A';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Charts también desde filteredByControls (como DevicesView)
  const statusStats = useMemo(() => getGroupStats(filteredByControls, 'status_clean'), [filteredByControls]);
  const networkStats = useMemo(() => getGroupStats(filteredByControls, 'network_type'), [filteredByControls]);
  const countryStats = useMemo(() => getGroupStats(filteredByControls, 'country_code'), [filteredByControls]);
  const planStats = useMemo(() => getGroupStats(filteredByControls, 'rate_plan'), [filteredByControls]);

  const tierField = activeTab === 'diario' ? 'usage_tier_daily' : 'usage_tier_month';
  const consumptionStats = useMemo(() => getGroupStats(filteredByControls, tierField), [filteredByControls, tierField]);

  const consumptionTotal = useMemo(() => {
    const key = activeTab === 'diario' ? 'cons_daily_mb' : 'cons_month_mb';
    return filteredByControls.reduce((s, d) => s + (Number(d[key]) || 0), 0);
  }, [filteredByControls, activeTab]);

  // Badge estado (tabla)
  const renderStatusBadge = (r) => {
    const v = r.status_clean || 'N/A';
    const isOk = v === 'Active' || v === 'Activo';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {v}
      </span>
    );
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
      {/* HEADER + filtros externos */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">📡 Gestión M2M</h2>
          <p className="text-sm text-gray-500">Inventario y análisis (M2M)</p>
        </div>

        <div className="flex items-end gap-3">
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedOrg}
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setDrilldownStatus(null);
                setDrilldownNetwork(null);
                setDrilldownCountry(null);
                setDrilldownPlan(null);
                setDrilldownTier(null);
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

          {hasActiveFilter && (
            <button
              onClick={() => {
                setDrilldownStatus(null);
                setDrilldownNetwork(null);
                setDrilldownCountry(null);
                setDrilldownPlan(null);
                setDrilldownTier(null);
              }}
              className="px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">SIMs filtradas</span>
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalSims}</span>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-red-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Alarmas totales</span>
          <span className="text-4xl font-bold text-red-700 mt-2">{totalAlarms}</span>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-orange-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">SIMs con alertas</span>
          <span className="text-4xl font-bold text-orange-700 mt-2">{simsWithAlerts}</span>
        </div>
      </div>

      {/* Secciones controladas (SelectDash) */}
      <SelectDash
        storageKey="m2mView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'pie-status',
            title: 'Estado',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="🟢 Estado"
                legendTitle="Estados visibles"
                data={statusStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => {
                  const k = row.__label;
                  if (k === 'Activo') return '#10B981';
                  if (k === 'Desactivado') return '#F59E0B';
                  if (k === 'Listo para activar') return '#4B5563';
                  if (k === 'Inactivo Nuevo') return '#3B82F6';
                  if (k === 'Prueba') return '#EF4444';
                  return '#9CA3AF';
                }}
                onSliceClick={(label) => {
                  setDrilldownStatus(label);
                  setDrilldownNetwork(null);
                  setDrilldownCountry(null);
                  setDrilldownPlan(null);
                  setDrilldownTier(null);
                }}
              />
            ),
          },
          {
            id: 'pie-network',
            title: 'Tipo de Red',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="📡 Tipo de Red"
                legendTitle="Redes visibles"
                data={networkStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownNetwork}
                getColor={(i) => COLORS[(i + 2) % COLORS.length]}
                onSliceClick={(label) => {
                  setDrilldownNetwork(label);
                  setDrilldownStatus(null);
                  setDrilldownCountry(null);
                  setDrilldownPlan(null);
                  setDrilldownTier(null);
                }}
              />
            ),
          },
          {
            id: 'bar-country',
            title: 'Distribución Geográfica',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="🌍 Distribución Geográfica"
                subtitle="Países visibles"
                data={countryStats}
                labelKey="name"
                valueKey="value"
                indexAxis='x'
                showLegend= {true}
                selectedLabel={drilldownCountry}
                getColor={(i) => getConsistentColor(i)}
                onBarClick={(label) => {
                  setDrilldownCountry(label);
                  setDrilldownStatus(null);
                  setDrilldownNetwork(null);
                  setDrilldownPlan(null);
                  setDrilldownTier(null);
                }}
              />
            ),
          },
          {
            id: 'pie-plan',
            title: 'Planes',
            defaultMode: 'min',
            render: () => (
              <PieChartCard
                title="💳 Planes"
                legendTitle="Planes visibles"
                data={planStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownPlan}
                getColor={(i) => getConsistentColor(i + 5)}
                onSliceClick={(label) => {
                  setDrilldownPlan(label);
                  setDrilldownStatus(null);
                  setDrilldownNetwork(null);
                  setDrilldownCountry(null);
                  setDrilldownTier(null);
                }}
              />
            ),
          },
          {
            id: 'bar-consumption',
            title: 'Análisis de Consumo',
            defaultMode: 'show',
            render: () => (
              <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
                <h3 className="text-xl font-bold text-blue-900 mb-4">📊 Análisis de Consumo</h3>

                <div className="flex space-x-4 border-b border-gray-200 mb-4 overflow-x-auto">
                  <button
                    className={`pb-2 px-4 whitespace-nowrap font-medium transition-colors ${
                      activeTab === 'diario' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'
                    }`}
                    onClick={() => {
                      setActiveTab('diario');
                      setDrilldownTier(null);
                    }}
                  >
                    📅 Diario
                  </button>
                  <button
                    className={`pb-2 px-4 whitespace-nowrap font-medium transition-colors ${
                      activeTab === 'mensual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'
                    }`}
                    onClick={() => {
                      setActiveTab('mensual');
                      setDrilldownTier(null);
                    }}
                  >
                    🗓️ Mensual
                  </button>
                </div>

                <div className="bg-blue-50 p-3 rounded text-blue-900 font-bold mb-4 inline-block border border-blue-100">
                  Tráfico Total: {(consumptionTotal / 1024).toFixed(2)} GB
                </div>

                <BarChartCard
                  title={`SIMs por tramo (${activeTab})`}
                  legendTitle="Tramos visibles"
                  data={consumptionStats}
                  labelKey="name"
                  valueKey="value"
                  heightClass="h-72"
                  indexAxis="x"
                  getColor={(i) => getConsistentColor(i)}
                  selectedLabel={drilldownTier}
                  onBarClick={(label) => {
                    setDrilldownTier(label);
                    setDrilldownStatus(null);
                    setDrilldownNetwork(null);
                    setDrilldownCountry(null);
                    setDrilldownPlan(null);
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* TABLA (TableCard filtra+pagina) */}
      <TableCard
        title="Listado M2M Completo"
        data={filteredByControls}
        columns={[
          { header: 'ICCID', accessor: 'icc', render: (r) => <span className="font-mono text-xs text-gray-600">{r.icc}</span> },
          { header: 'Estado', accessor: 'status_clean', render: (r) => renderStatusBadge(r) },
          { header: 'Org', accessor: 'organization' },
          { header: 'País', accessor: 'country_code' },
          { header: 'Plan', accessor: 'rate_plan' },
          {
            header: 'Mes (MB)', 
            accessor: 'cons_month_mb', 
            render: (r) => {

              const val = Number(r.cons_month_mb) || 0;
              
              let planName = (r.rate_plan || '').toLowerCase();
              planName = planName.replace(/m2m/g, '').replace(/b2b/g, '');

              let limit = 0;

              const matchGB = planName.match(/\b(\d+)\s*gb/);
              
              if (matchGB) {
                limit = parseInt(matchGB[1]) * 1024;
              } 
              // B) Detectar MB explícitos (ej: "500MB")
              else {
                const matchMB = planName.match(/\b(\d+)\s*mb/);
                if (matchMB) {
                  limit = parseInt(matchMB[1]);
                } 
                // C) Detectar número suelto al final o entre espacios (ej: "Plan 500")
                // \b(\d+)\b significa: un número que tiene espacios o signos de puntuación a los lados
                // Esto ignora "4G", "3G", etc.
                else {
                  const matchNum = planName.match(/\b(\d{2,})\b/); // Buscamos preferiblemente de 2 digitos o mas (para evitar un "1" o "2" suelto que no sea cuota)
                  if (matchNum) {
                    limit = parseInt(matchNum[1]);
                  }
                }
              }

              // 3. LOGICA DE COLORES
              let colorClass = 'text-gray-600'; 
              let percent = 0;

              if (limit > 0) {
                percent = (val / limit) * 100;
                if (percent >= 100) colorClass = 'text-red-700 font-extrabold';
                else if (percent >= 90) colorClass = 'text-red-500 font-bold';
                else if (percent >= 75) colorClass = 'text-orange-500 font-medium';
                else if (percent >   0) colorClass = 'text-green-500';
                else colorClass = 'text-yellow-600';
              }

              return (
                <div className="flex flex-col">
                  <span className={`${colorClass} tabular-nums`}>
                    {val.toFixed(2)}
                  </span>
                  {limit > 0 && (
                    <span className="text-[9px] text-gray-400">
                      {Math.round(percent)}% de {limit < 1024 ? limit + 'MB' : (limit/1024) + 'GB'}
                    </span>
                  )}
                </div>
              );
            },
          },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Buscar por ICCID, Estado, Plan..."
        searchableKeys={['icc', 'status_clean', 'organization', 'country_code', 'rate_plan', 'network_type']}
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

export default M2MView;
