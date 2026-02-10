// PoolView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Layers, Activity, Search, Loader2 } from 'lucide-react';

import TableCard from '../components/TableCard';
import SelectDash from '../components/SelectDash';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from 'chart.js';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler);

const PoolView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtro externo
  const [selectedOrg, setSelectedOrg] = useState('ALL');

  // ✅ Drilldown: organización seleccionada desde barras
  const [drillOrg, setDrillOrg] = useState(null);

  // TableCard (toolbar + paginación externa)
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Histórico
  const [timeRange, setTimeRange] = useState('semanal');
  const [historyData, setHistoryData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getPool(1, 5000);
        setRawData(Array.isArray(res) ? res : res?.items || []);
      } catch (error) {
        console.error('Error fetching pools:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatBytes = (bytes, decimals = 2) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const uniqueOrgs = useMemo(() => {
    const orgs = [...new Set(rawData.map((item) => item.commercialGroup))];
    return orgs.filter(Boolean).sort();
  }, [rawData]);

  // 1) Filtro externo por organización (select)
  const filteredByOrg = useMemo(() => {
    if (selectedOrg === 'ALL') return rawData;
    return rawData.filter((item) => item.commercialGroup === selectedOrg);
  }, [rawData, selectedOrg]);

  // 2) Enriquecer con status_label (para TableCard)
  const dataWithLabels = useMemo(() => {
    return filteredByOrg.map((r) => {
      const p = Number(r.usage_percent) || 0;
      let status_label = 'Normal';
      if (p > 90) status_label = 'Crítico';
      else if (p > 75) status_label = 'Alto';
      return { ...r, status_label };
    });
  }, [filteredByOrg]);

  // 3) ✅ Drilldown por organización (desde barras) -> dataset FINAL
  const filteredByControls = useMemo(() => {
    let data = dataWithLabels;
    if (drillOrg) data = data.filter((r) => String(r.commercialGroup) === String(drillOrg));
    return data;
  }, [dataWithLabels, drillOrg]);

  // Reset de página al cambiar filtros/inputs
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrg, drillOrg, rowsPerPage, searchTerm]);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // KPIs (sobre dataset FINAL)
  const stats = useMemo(() => {
    return filteredByControls.reduce(
      (acc, curr) => ({
        totalSims: acc.totalSims + (Number(curr.sims_total) || 0),
        activeSims: acc.activeSims + (Number(curr.sims_active) || 0),
        consumed: acc.consumed + (Number(curr.bytes_consumed) || 0),
        limit: acc.limit + (Number(curr.bytes_limit) || 0),
      }),
      { totalSims: 0, activeSims: 0, consumed: 0, limit: 0 }
    );
  }, [filteredByControls]);

  // ✅ chartData agregado por commercialGroup (Top 20 por consumo)
  const chartData = useMemo(() => {
    const map = new Map();

    for (const item of dataWithLabels) {
      const org = item.commercialGroup || 'N/A';
      const consumed = Number(item.bytes_consumed) || 0;
      const limit = Number(item.bytes_limit) || 0;
      const percent = Number(item.usage_percent) || 0;

      const prev = map.get(org) || { org, bytes_consumed: 0, bytes_limit: 0, percentMax: 0 };
      prev.bytes_consumed += consumed;
      prev.bytes_limit += limit;
      prev.percentMax = Math.max(prev.percentMax, percent); // para colorear si algún pool está crítico
      map.set(org, prev);
    }

    return Array.from(map.values())
      .map((x) => ({
        org: x.org,
        Consumo: Number((x.bytes_consumed / 1024 ** 3).toFixed(2)),
        Limite: Number((x.bytes_limit / 1024 ** 3).toFixed(2)),
        percentMax: x.percentMax,
      }))
      .sort((a, b) => b.Consumo - a.Consumo)
      .slice(0, 20);
  }, [dataWithLabels]);

  // ✅ Click en barras (Recharts) -> filtro por organización
  const handleBarClick = (payload) => {
    const org = payload?.org;
    if (!org) return;
    setDrillOrg((prev) => (String(prev) === String(org) ? null : org));
  };

  const hasActiveFilter = Boolean(drillOrg);

  // Histórico (mock) basado en dataset FINAL
  useEffect(() => {
    if (loading) return;

    const currentTotalGB =
      filteredByControls.reduce((acc, item) => acc + (Number(item.bytes_consumed) || 0), 0) / 1024 ** 3;

    let labels = [];
    let dataPoints = [];

    if (timeRange === 'mensual') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      dataPoints = labels.map((_, i) => Number((currentTotalGB * (0.5 + 0.1 * i)).toFixed(2)));
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      dataPoints = labels.map((_, i) => Number((currentTotalGB * (0.8 + 0.05 * i)).toFixed(2)));
    }

    setHistoryData({
      labels,
      datasets: [
        {
          label: 'Consumo Global (GB)',
          data: dataPoints,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
        },
      ],
    });
  }, [filteredByControls, timeRange, loading]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: { y: { beginAtZero: true } },
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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen font-sans">
      {/* CONTROLES */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-700">Monitor de Pools de Datos</h2>
          {hasActiveFilter && (
            <span className="ml-2 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded">
              Org: {drillOrg}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Search size={18} className="text-gray-400" />
            <select
              value={selectedOrg}
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setDrillOrg(null);
              }}
              className="block w-full md:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="ALL">Todas las Organizaciones</option>
              {uniqueOrgs.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => setDrillOrg(null)}
              className="px-3 py-2 text-xs font-bold bg-red-100 text-red-700 border border-red-200 rounded hover:bg-red-200 transition-colors"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">SIMs Totales</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalSims}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">SIMs Activas</p>
          <p className="text-2xl font-bold text-gray-800">{stats.activeSims}</p>
          <p className="text-xs text-green-600 mt-1">
            {stats.totalSims > 0 ? ((stats.activeSims / stats.totalSims) * 100).toFixed(1) : 0}% Activación
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 font-medium">Datos Consumidos (Global)</p>
          <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.consumed)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 font-medium">Límite Contratado</p>
          <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.limit)}</p>
          <p className="text-xs text-orange-600 mt-1">
            Espacio libre: {formatBytes(Math.max(0, stats.limit - stats.consumed))}
          </p>
        </div>
      </div>

      {/* SECCIONES */}
      <SelectDash
        storageKey="PoolView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'ConsumoVsLimite',
            title: 'Gráfica Consumo vs Límite',
            defaultMode: 'show',
            render: () => (
              <div className="bg-white p-6 rounded-lg shadow-sm h-[500px]">
                <h3 className="text-lg font-bold text-gray-700 mb-2">Consumo vs Límite (Top 20 Orgs - GB)</h3>
                <p className="text-xs text-gray-400 mb-4">Clic en una barra para filtrar KPIs + Tabla por organización</p>

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="org" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    {/* Tooltip: label = ORGANIZACIÓN */}
                    <Tooltip
                      labelFormatter={(label) => `Organización: ${label}`}
                      formatter={(value, name) => [`${value} GB`, name]}
                      labelStyle={{ color: '#6366f1', fontWeight: 700 }}
                    />
                    <Legend verticalAlign="top" height={36} />

                    <Bar dataKey="Consumo" name="Consumo (GB)" radius={[4, 4, 0, 0]} onClick={handleBarClick}>
                      {chartData.map((entry, index) => {
                        const isSelected = drillOrg && String(drillOrg) === String(entry.org);
                        const base = entry.percentMax > 90 ? '#ef4444' : '#6366f1';
                        return (
                          <Cell
                            key={`c-${index}`}
                            cursor="pointer"
                            fill={base}
                            opacity={isSelected ? 1 : hasActiveFilter ? 0.35 : 1}
                          />
                        );
                      })}
                    </Bar>

                    <Bar dataKey="Limite" name="Límite (GB)" radius={[4, 4, 0, 0]} onClick={handleBarClick}>
                      {chartData.map((entry, index) => {
                        const isSelected = drillOrg && String(drillOrg) === String(entry.org);
                        return (
                          <Cell
                            key={`l-${index}`}
                            cursor="pointer"
                            fill="#6a6e73"
                            opacity={isSelected ? 1 : hasActiveFilter ? 0.35 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ),
          },
          {
            id: 'Tendencia',
            title: 'Tendencia de Consumo (Mock)',
            defaultMode: 'show',
            render: () => (
              <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" /> Tendencia de Consumo (Mock)
                  </h3>
                  <div className="flex bg-gray-100 rounded p-1">
                    <button
                      onClick={() => setTimeRange('semanal')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        timeRange === 'semanal' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Semanal
                    </button>
                    <button
                      onClick={() => setTimeRange('mensual')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        timeRange === 'mensual' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Mensual
                    </button>
                  </div>
                </div>
                <div className="flex-grow w-full relative">
                  <Line options={lineOptions} data={historyData} />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* TABLA */}
      <TableCard
        title="Pools"
        data={filteredByControls} // ✅ filtrada por organización
        columns={[
          { header: 'Pool ID', accessor: 'pool_id', render: (r) => <span className="font-mono font-bold text-blue-700 text-xs">{r.pool_id}</span> },
          { header: 'Organización', accessor: 'commercialGroup', render: (r) => <span className="text-gray-600 font-medium">{r.commercialGroup}</span> },
          {
            header: 'SIMs Activas',
            accessor: 'sims_active',
            render: (r) => (
              <div>
                <span className="font-bold text-green-700">{r.sims_active}</span>
                <span className="text-gray-400 text-xs mx-1">/</span>
                <span className="text-gray-500 text-xs">{r.sims_total}</span>
              </div>
            ),
          },
          {
            header: 'Consumo',
            accessor: 'bytes_consumed',
            render: (r) => (
              <div className="w-32">
                <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                  <span>{formatBytes(r.bytes_consumed)}</span>
                  <span>{formatBytes(r.bytes_limit)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (r.usage_percent || 0) > 90 ? 'bg-red-500' : (r.usage_percent || 0) > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(r.usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>
            ),
          },
          {
            header: 'Estado',
            accessor: 'status_label',
            render: (r) => {
              const p = r.usage_percent || 0;
              const label = r.status_label || 'Normal';
              let color = 'bg-green-100 text-green-800';
              if (label === 'Crítico') color = 'bg-red-100 text-red-800';
              else if (label === 'Alto') color = 'bg-yellow-100 text-yellow-800';
              return (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>
                  {label} ({p}%)
                </span>
              );
            },
          },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Buscar Pool ID, Grupo o Estado..."
        searchableKeys={['pool_id', 'commercialGroup', 'status_label']}
        pageSize={rowsPerPage}
        setPageSize={setRowsPerPage}
        rowsPerPageOptions={[5, 10, 20]}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default PoolView;
