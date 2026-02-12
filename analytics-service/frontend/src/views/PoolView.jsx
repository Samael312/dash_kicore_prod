import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api'; // Asegúrate de que esta ruta sea correcta
import { Layers, Activity, Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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

// Registro de ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler);

// --- UTILIDADES DE COLOR Y ESTADO (Unificadas) ---

// Devuelve configuración de color basada en el porcentaje
const getStatusConfig = (percent) => {
  // CRÍTICO (> 90%)
  if (percent > 90) return { hex: '#ba0c0c', tailwind: 'text-red-600 font-extrabold', label: 'Crítico' };
  
  // ADVERTENCIA (75% - 90%)
  if (percent > 65) return { hex: '#f72424', tailwind: 'text-red-500 font-bold', label: 'Alto' };
  
  // PRECAUCIÓN (50% - 75%)
  if (percent > 50) return { hex: '#f97316', tailwind: 'text-orange-600 font-bold', label: 'Medio' };

   if (percent === 0) return { hex: '#eab308', tailwind: 'text-yellow-600 font-medium', label: 'Medio' };
  
  // NORMAL (< 50%)
  return { hex: '#0dbb0e', tailwind: 'text-green-600', label: 'Normal' };
};

// Wrapper para compatibilidad con las gráficas antiguas que solo esperan HEX
const getBarColor = (percent) => getStatusConfig(percent).hex;

// Función auxiliar para procesar datos de SIM (Extraída para evitar recreación)
const processSimData = (s) => {
  const val = Number(s.cons_month_mb) || 0;
  let planName = (s.rate_plan || '').toLowerCase();
  
  // 1. Limpieza
  planName = planName.replace(/m2m/g, '').replace(/b2b/g, '');

  // 2. Detección de límite
  let limit = 0;
  const matchGB = planName.match(/\b(\d+)\s*gb/);
  
  if (matchGB) {
    limit = parseInt(matchGB[1]) * 1024;
  } else {
    const matchMB = planName.match(/\b(\d+)\s*mb/);
    if (matchMB) {
      limit = parseInt(matchMB[1]);
    } else {
      const matchNum = planName.match(/\b(\d{2,})\b/); 
      if (matchNum) limit = parseInt(matchNum[1]);
    }
  }

  // 3. Lógica de colores y porcentajes
  let percent = 0;
  let status = { tailwind: 'text-gray-600', hex: '#9ca3af' };

  if (limit > 0) {
    percent = (val / limit) * 100;
    status = getStatusConfig(percent);
  }

  return { 
    ...s, 
    val, 
    limit, 
    percent, 
    colorClass: status.tailwind, // Clase de texto para la lista
    barColor: status.hex         // Color hex por si se quisiera usar en barras mini
  };
};

// --- COMPONENTE ORG LEGEND ---
const OrgLegend = ({ orgRows, expandedOrg, setExpandedOrg }) => {
  const [filterText, setFilterText] = useState('');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-[600px] overflow-hidden flex flex-col">
      <div className="flex flex-col gap-2 mb-2 pb-2 border-b">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-blue-700">Organizaciones</h4>
          <span className="text-[11px] text-gray-400">{orgRows.length}</span>
        </div>
        
        {/* INPUT DE BÚSQUEDA */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filtrar por ICC o Nombre..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          <Search size={12} className="absolute left-2 top-1.5 text-gray-400" />
        </div>
      </div>

      <div className="overflow-y-auto pr-1">
        {orgRows.map((row) => {
          const open = String(expandedOrg) === String(row.commercialGroup);
          
          // Procesamos las SIMs
          const processedSims = row.sims.map(processSimData);

          // Filtramos
          const filteredSims = processedSims.filter(s => {
            if (!filterText) return true;
            const term = filterText.toLowerCase();
            return (
              (s.icc || '').toLowerCase().includes(term) ||
              (s.label || '').toLowerCase().includes(term)
            );
          });

          // Ordenar por consumo descendente
          const sortedSims = filteredSims.sort((a, b) => b.val - a.val);

          // Si hay filtro activo y no hay resultados en este grupo, no renderizamos
          if (filterText && sortedSims.length === 0) return null;

          return (
            <div key={row.commercialGroup} className="border border-gray-100 rounded mb-2 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedOrg(open ? null : row.commercialGroup)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  open ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                title={row.commercialGroup}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {open ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-xs font-bold text-gray-700 truncate">{row.commercialGroup}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                    {filterText ? sortedSims.length : row.simsCount} SIMs
                  </span>
                </div>
              </button>

              {open && (
                <div className="bg-white border-t border-gray-100 px-3 py-2">
                  {sortedSims.length === 0 ? (
                    <div className="text-xs text-gray-400 py-1">Sin SIMs asociadas</div>
                  ) : (
                    <ul className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                      {sortedSims.map((s) => (
                        <li key={s._key} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                          <span className="truncate text-gray-700" title={s.label}>
                            {s.label}
                          </span>
                          
                          {/* Renderizado del valor calculado */}
                          <div className="flex flex-col text-right">
                            <span className={`${s.colorClass} tabular-nums`}>
                              {s.val.toFixed(2)} MB
                            </span>
                            {s.limit > 0 && (
                              <span className="text-[9px] text-gray-400">
                                {Math.round(s.percent)}% de {s.limit < 1024 ? s.limit + 'MB' : (s.limit/1024) + 'GB'}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------

const PoolView = () => {
  const [rawPools, setRawPools] = useState([]);
  const [chartLimit, setChartLimit] = useState(10);
  const [rawM2M, setRawM2M] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtro externo
  const [selectedOrg, setSelectedOrg] = useState('ALL');

  // Drilldown desde barras
  const [drillOrganization, setDrillOrganization] = useState(null);

  // Leyenda lateral
  const [expandedOrg, setExpandedOrg] = useState(null);

  // TableCard
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Histórico
  const [timeRange, setTimeRange] = useState('semanal');
  const [historyData, setHistoryData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [poolsRes, m2mRes] = await Promise.all([api.getPool(1, 5000), api.getM2M(1, 5000)]);
        setRawPools(Array.isArray(poolsRes) ? poolsRes : poolsRes?.items || []);
        setRawM2M(Array.isArray(m2mRes) ? m2mRes : m2mRes?.items || []);
      } catch (e) {
        console.error('Error fetching pools/m2m:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
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

  const m2mWithPoolId = useMemo(() => {
    return (rawM2M || []).map((sim, idx) => {
      const commercialGroupID = sim.commercialGroupID ?? sim.commercialGroupId ?? sim.commercial_group_id ?? null;
      return {
        ...sim,
        commercialGroupID,
        pool_id: commercialGroupID != null ? String(commercialGroupID) : null,
        _key: sim.uuid || sim.icc || `${idx}`,
      };
    });
  }, [rawM2M]);

  const uniqueOrgs = useMemo(() => {
    const orgs = [...new Set(rawPools.map((p) => p.commercialGroup))];
    return orgs.filter(Boolean).sort();
  }, [rawPools]);

  const filteredByOrg = useMemo(() => {
    if (selectedOrg === 'ALL') return rawPools;
    return rawPools.filter((p) => String(p.commercialGroup) === String(selectedOrg));
  }, [rawPools, selectedOrg]);

  // Enriquecer pools con status_label usando la configuración unificada
  const poolsWithLabels = useMemo(() => {
    return filteredByOrg.map((r) => {
      const p = Number(r.usage_percent) || 0;
      const config = getStatusConfig(p);
      return { ...r, status_label: config.label };
    });
  }, [filteredByOrg]);

  const filteredByControls = useMemo(() => {
    let data = poolsWithLabels;
    
    // 1. Filtrar por Drilldown de gráfica
    if (drillOrganization) {
      data = data.filter((p) => String(p.commercialGroup) === String(drillOrganization));
    }

    // 2. Filtrar por Búsqueda de Texto (Tabla)
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        data = data.filter(p => 
            String(p.pool_id || '').toLowerCase().includes(lowerTerm) ||
            String(p.commercialGroup || '').toLowerCase().includes(lowerTerm) ||
            String(p.status_label || '').toLowerCase().includes(lowerTerm)
        );
    }

    return data;
  }, [poolsWithLabels, drillOrganization, searchTerm]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrg, drillOrganization, rowsPerPage, searchTerm]);

  // --- LÓGICA DE PAGINACIÓN PARA LA TABLA ---
  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredByControls.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredByControls, currentPage, rowsPerPage]);

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

  const chartData = useMemo(() => {
    return poolsWithLabels
      .map((item) => ({
        pool_id: item.pool_id,
        name: String(item.commercialGroup ?? 'N/A'),
        commercialGroup: item.commercialGroup || 'N/A',
        Consumo: Number(((Number(item.bytes_consumed) || 0) / 1024 ** 3).toFixed(2)),
        Limite: Number(((Number(item.bytes_limit) || 0) / 1024 ** 3).toFixed(2)),
        percent: Number(item.usage_percent) || 0,
      }))
      .sort((a, b) => b.Consumo - a.Consumo)
      .slice(0, chartLimit);
  }, [poolsWithLabels, chartLimit]);

  const tooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
      <div className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs z-50">
        <div className="font-bold text-blue-700 mb-1">{row.commercialGroup}</div>
        <div className="text-gray-500">Pool: <span className="font-mono">{row.pool_id}</span></div>
        <div className="mt-1 space-y-0.5">
          {payload.map((p, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-gray-600">{p.name}</span>
              <span className="font-bold text-gray-800">{p.value} GB</span>
            </div>
          ))}
          <div className="pt-1 border-t mt-1 text-gray-400 text-[10px]">
            Uso: {row.percent.toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  const handleBarClick = (payload) => {
    const org = payload?.commercialGroup;
    if (!org) return;
    setDrillOrganization((prev) => (String(prev) === String(org) ? null : org));
    setExpandedOrg((prev) => (String(prev) === String(org) ? prev : org)); 
  };

  const hasActiveFilter = Boolean(drillOrganization);

  const orgLegendRows = useMemo(() => {
    const poolIdToOrg = new Map();
    (rawPools || []).forEach((p) => {
      const pid = p.pool_id != null ? String(p.pool_id) : null;
      if (!pid) return;
      poolIdToOrg.set(pid, p.commercialGroup || 'N/A');
    });

    const simsByOrg = new Map();
    m2mWithPoolId.forEach((sim) => {
      const pid = sim.pool_id != null ? String(sim.pool_id) : null;
      if (!pid) return;
      const orgName = poolIdToOrg.get(pid) || sim.organization || sim.commercialGroup || 'N/A';

      if (!simsByOrg.has(orgName)) simsByOrg.set(orgName, []);
      simsByOrg.get(orgName).push({
        _key: sim._key,
        icc: sim.icc,
        label: sim.name || sim.sim_name || sim.icc || 'SIM',
        cons_month_mb: sim.cons_month_mb,
        rate_plan: sim.rate_plan,
      });
    });

    const allowOrg = (orgName) => {
      if (selectedOrg !== 'ALL' && String(orgName) !== String(selectedOrg)) return false;
      if (drillOrganization && String(orgName) !== String(drillOrganization)) return false;
      return true;
    };

    return [...simsByOrg.entries()]
      .filter(([orgName]) => allowOrg(orgName))
      .map(([orgName, sims]) => ({
        commercialGroup: orgName,
        simsCount: sims.length,
        sims: sims, 
      }))
      .sort((a, b) => b.simsCount - a.simsCount);
  }, [rawPools, m2mWithPoolId, selectedOrg, drillOrganization]);

  // Histórico (mock)
  useEffect(() => {
    if (loading) return;
    // Usamos filteredByControls para que la gráfica de tendencia reaccione a los filtros
    const currentTotalGB = filteredByControls.reduce((acc, item) => acc + (Number(item.bytes_consumed) || 0), 0) / 1024 ** 3;

    let labels = [];
    let dataPoints = [];

    // Mock data lógico basado en el total actual
    if (timeRange === 'mensual') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      dataPoints = labels.map((_, i) => Number((currentTotalGB * (0.5 + (Math.random() * 0.5))).toFixed(2)));
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      dataPoints = labels.map((_, i) => Number((currentTotalGB * (0.8 + (Math.random() * 0.2))).toFixed(2)));
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
  }, [filteredByControls, timeRange, loading]); // Dependencia correcta

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
              Organización: {drillOrganization}
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
                setDrillOrganization(null);
                setExpandedOrg(null);
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
              onClick={() => {
                setDrillOrganization(null);
                setExpandedOrg(null);
              }}
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
          <p className="text-xs text-orange-600 mt-1">Espacio libre: {formatBytes(Math.max(0, stats.limit - stats.consumed))}</p>
        </div>
      </div>

      <SelectDash
        storageKey="PoolView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'Consumo vs Límite',
            title: 'Gráfica Consumo vs Límite',
            defaultMode: 'show',
            render: () => (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* CHART */}
                <div className="lg:col-span-9 bg-white p-6 rounded-lg shadow-md h-[600px]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-700">
                        Consumo vs Límite (Top {chartLimit})
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-500 font-medium">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0dbb0e]"></span>
                          <span>Normal (&lt;50%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
                          <span>Medio (50-75%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f72424]"></span>
                          <span>Alto (75-90%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ba0c0c]"></span>
                          <span>Crítico (&gt;90%)</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Clic en una barra para filtrar por Organización
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Mostrar:</span>
                      <select
                        value={chartLimit}
                        onChange={(e) => setChartLimit(Number(e.target.value))}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 bg-white text-gray-700"
                      >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                      </select>
                    </div>
                  </div>
                  
                  
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <defs>
                      <linearGradient id="arcoiris" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ba0c0c" stopOpacity={1}/>
                        <stop offset="25%" stopColor="#f72424" stopOpacity={1}/>
                        <stop offset="50%" stopColor="#f97316" stopOpacity={1}/>
                        <stop offset="75%" stopColor="#eab308" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0dbb0e" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip content={tooltipContent} />
                      <Legend verticalAlign="top" height={36} />

                      <Bar dataKey="Consumo" name="Consumo (GB)" fill="url(#arcoiris)" radius={[4, 4, 0, 0]} onClick={handleBarClick}>
                        {chartData.map((entry, index) => {
                          const isSelected = drillOrganization && String(drillOrganization) === String(entry.commercialGroup);
                          // Usar helper para color
                          const base = getBarColor(entry.percent);
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

                      <Bar dataKey="Limite" name="Límite (GB)" fill="#3e4143" radius={[4, 4, 0, 0]} onClick={handleBarClick}>
                        {chartData.map((entry, index) => {
                          const isSelected = drillOrganization && String(drillOrganization) === String(entry.commercialGroup);
                          return (
                            <Cell
                              key={`l-${index}`}
                              cursor="pointer"
                              fill="#3e4143"
                              opacity={isSelected ? 1 : hasActiveFilter ? 0.35 : 1}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* LEGEND / SIMS */}
                <div className="lg:col-span-3 ">
                  <OrgLegend orgRows={orgLegendRows} expandedOrg={expandedOrg} setExpandedOrg={setExpandedOrg} />
                </div>
              </div>
            ),
          },
          {
            id: 'Tendencia',
            title: 'Tendencia de Consumo',
            defaultMode: 'show',
            render: () => (
              <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" /> Tendencia de Consumo
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
        data={filteredByControls} 
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
            render: (r) => {
                const percent = r.usage_percent || 0;
                // Obtenemos el color consistente con la gráfica
                const colorHex = getBarColor(percent); 
                return (
                    <div className="w-32">
                        <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                            <span>{formatBytes(r.bytes_consumed)}</span>
                            <span>{formatBytes(r.bytes_limit)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${Math.min(percent, 100)}%`,
                                    backgroundColor: colorHex 
                                }}
                            />
                        </div>
                    </div>
                );
            },
          },
          {
            header: 'Estado',
            accessor: 'status_label',
            render: (r) => {
              const p = r.usage_percent || 0;
              const label = r.status_label || 'Normal';
              let color = 'bg-green-100 text-green-800';
              if (label === 'Crítico') color = 'bg-red-100 text-red-800';
              else if (label === 'Alto') color = 'bg-orange-100 text-orange-800';
              else if (label === 'Medio') color = 'bg-yellow-100 text-yellow-800';
              
              return (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>
                  {label} ({p.toFixed(1)}%)
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