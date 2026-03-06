import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Layers, Activity, Search, Loader2, ChevronRight, Copy } from 'lucide-react';
import TableCard from '../components/TableCard';
import SelectDash from '../components/SelectDash';
import { getOrgColor } from '../utils/colors';

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
  ResponsiveContainer,
} from 'recharts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler);

// --- UTILIDADES DE COLOR Y ESTADO ---

const getStatusConfig = (percent) => {
  if (percent === 0) {
    return { hex: '#eab308', tailwind: 'text-yellow-600 font-medium', label: 'Sin Consumo' };
  }
  if (percent >= 90) {
    return { hex: '#ba0c0c', tailwind: 'text-red-700 font-extrabold', label: 'Crítico' };
  }
  if (percent >= 65) {
    return { hex: '#f72424', tailwind: 'text-red-500 font-bold', label: 'Alto' };
  }
  if (percent >= 40) {
    return { hex: '#f97316', tailwind: 'text-orange-600 font-bold', label: 'Medio' };
  }
  return { hex: '#0dbb0e', tailwind: 'text-green-600 font-semibold', label: 'Normal' };
};

const getBarColor = (percent) => getStatusConfig(percent).hex;

const processSimData = (s) => {
  const val = Number(s.cons_month_mb) || 0;
  let planName = (s.rate_plan || '').toLowerCase();
  planName = planName.replace(/m2m/g, '').replace(/b2b/g, '');

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

  let percent = 0;
  let status = { tailwind: 'text-gray-600', hex: '#9ca3af' };
  if (limit > 0) {
    percent = (val / limit) * 100;
    status = getStatusConfig(percent);
  }

  return { ...s, val, limit, percent, colorClass: status.tailwind, barColor: status.hex };
};

// --- TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const { hex, label } = getStatusConfig(row.percent);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-xs min-w-[190px]">
      <div className="font-bold text-gray-800 mb-2 border-b pb-1.5 truncate">{row.commercialGroup}</div>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-6 items-center">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill || p.color }} />
              <span className="text-gray-500">{p.name}</span>
            </div>
            <span className="font-bold text-gray-800 tabular-nums">{p.value} GB</span>
          </div>
        ))}
        <div className="pt-1.5 border-t flex items-center justify-between">
          <span className="text-gray-400">Uso</span>
          <span className="font-extrabold tabular-nums" style={{ color: hex }}>
            {row.percent.toFixed(1)}% — {label}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- LEYENDA DE ESTADOS ---
const STATUS_LEGEND = [
  { color: '#0dbb0e', label: 'Normal',      range: '< 40%' },
  { color: '#f97316', label: 'Medio',       range: '40–64%' },
  { color: '#f72424', label: 'Alto',        range: '65–89%' },
  { color: '#ba0c0c', label: 'Crítico',     range: '≥ 90%' },
  { color: '#eab308', label: 'Sin consumo', range: '0%' },
];

// --- HELPER: copiar al portapapeles ---
const copyToClipboard = (e, text) => {
  e.stopPropagation();
  navigator.clipboard.writeText(text);
};

// --- COMPONENTE ORG LEGEND ---
const OrgLegend = ({ orgRows, expandedOrg, setExpandedOrg }) => {
  const [filterText, setFilterText] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [copied, setCopied] = useState(null);

  const handleCopy = (e, key) => {
    copyToClipboard(e, key);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl h-[620px] flex flex-col overflow-hidden"
      style={{ boxShadow: '0 4px 24px 0 rgba(59,130,246,0.07)' }}
    >
      {/* Cabecera */}
      <div
        className="px-5 py-4 border-b border-gray-100 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, #f8fafc 100%)' }}
      >
        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
          <span className="bg-blue-100 rounded-lg p-1.5 flex items-center justify-center">
            <Layers size={14} className="text-blue-500" />
          </span>
          Organizaciones
          <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full normal-case tracking-normal">
            {orgRows.length}
          </span>
        </h4>

        {/* Buscador */}
        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Filtrar por ICC o nombre..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-blue-100 rounded-lg bg-white focus:outline-none focus:border-blue-400 placeholder-gray-300"
          />
          <Search size={12} className="absolute left-2 top-2 text-blue-300" />
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-grow p-2.5 space-y-1">
        {orgRows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="bg-gray-50 rounded-full p-4">
              <Search size={24} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">Sin organizaciones<br />que mostrar</p>
          </div>
        ) : (
          orgRows.map((row) => {
            const open = String(expandedOrg) === String(row.commercialGroup);
            const processedSims = row.sims.map(processSimData);
            const filteredSims = processedSims.filter((s) => {
              if (!filterText) return true;
              const term = filterText.toLowerCase();
              return (s.icc || '').toLowerCase().includes(term) || (s.label || '').toLowerCase().includes(term);
            });
            const sortedSims = filteredSims.sort((a, b) => b.val - a.val);
            if (filterText && sortedSims.length === 0) return null;

            return (
              <div
                key={row.commercialGroup}
                className="border border-gray-100 rounded-lg bg-white overflow-hidden transition-all hover:border-blue-100"
                style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)' }}
              >
                {/* Fila org */}
                <div
                  onClick={() => setExpandedOrg(open ? null : row.commercialGroup)}
                  className={`flex items-center justify-between py-2.5 px-3 cursor-pointer transition-colors ${
                    open ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                  title={row.commercialGroup}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
                      <ChevronRight size={13} className={open ? 'text-blue-500' : 'text-gray-300'} />
                    </span>
                    <span className={`text-xs font-semibold truncate ${open ? 'text-blue-700' : 'text-gray-600'}`}>
                      {row.commercialGroup}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    open ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {filterText ? sortedSims.length : row.simsCount} SIMs
                  </span>
                </div>

                {/* SIMs desplegadas */}
                {open && (
                  <div className="bg-gradient-to-b from-blue-50/60 to-white border-t border-blue-100 p-2 space-y-0.5">
                    {sortedSims.length === 0 ? (
                      <div className="text-xs text-gray-400 py-1 px-1">Sin SIMs asociadas</div>
                    ) : (
                      <ul className="max-h-[300px] overflow-y-auto pr-0.5 space-y-0.5">
                        {sortedSims.map((s) => {
                          const keyOpen = expandedKey === s._key;
                          return (
                            <li
                              key={s.final_client}
                              className="flex flex-col text-xs rounded-md px-2 py-1.5 bg-white border border-gray-50 hover:border-blue-100 transition-colors"
                              style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedKey(keyOpen ? null : s._key)}
                                  className="truncate text-left text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  title="Ver ICC"
                                >
                                  {s.final_client || '-'}
                                </button>
                                <div className="flex flex-col text-right flex-shrink-0">
                                  <span className={`${s.colorClass} tabular-nums`}>{s.val.toFixed(2)} MB</span>
                                  {s.limit > 0 && (
                                    <span className="text-[9px] text-gray-400">
                                      {Math.round(s.percent)}% de {s.limit < 1024 ? s.limit + 'MB' : s.limit / 1024 + 'GB'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ICC desplegable con botón copiar */}
                              {keyOpen && (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="flex-1 font-mono text-[10px] text-blue-400 bg-blue-50 px-2 py-0.5 rounded-md select-all border border-blue-100 truncate">
                                    {s._key}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(e, s._key)}
                                    className={`p-1 rounded transition-colors flex-shrink-0 ${
                                      copied === s._key
                                        ? 'text-green-500 bg-green-50'
                                        : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                                    }`}
                                    title="Copiar ICC"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
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

  const [selectedOrg, setSelectedOrg] = useState('ALL');
  const [drillOrganization, setDrillOrganization] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  const poolsWithLabels = useMemo(() => {
    return filteredByOrg.map((r) => {
      const p = Number(r.usage_percent) || 0;
      const config = getStatusConfig(p);
      return { ...r, status_label: config.label };
    });
  }, [filteredByOrg]);

  const filteredByControls = useMemo(() => {
    let data = poolsWithLabels;
    if (drillOrganization) {
      data = data.filter((p) => String(p.commercialGroup) === String(drillOrganization));
    }
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          String(p.pool_id || '').toLowerCase().includes(lowerTerm) ||
          String(p.commercialGroup || '').toLowerCase().includes(lowerTerm) ||
          String(p.status_label || '').toLowerCase().includes(lowerTerm)
      );
    }
    return data;
  }, [poolsWithLabels, drillOrganization, searchTerm]);

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
      .map((item) => {
        const consumed = Number(item.bytes_consumed) || 0;
        const limitBytes = Number(item.bytes_limit) || 0;
        const percent = limitBytes > 0
          ? Math.min((consumed / limitBytes) * 100, 100)
          : Number(item.usage_percent) || 0;
        return {
          pool_id: item.pool_id,
          name: String(item.commercialGroup ?? 'N/A'),
          commercialGroup: item.commercialGroup || 'N/A',
          Consumo: Number((consumed / 1024 ** 3).toFixed(2)),
          Limite: Number((limitBytes / 1024 ** 3).toFixed(2)),
          percent,
        };
      })
      .sort((a, b) => {
        const pDiff = b.percent - a.percent;
        if (Math.abs(pDiff) > 0.001) return pDiff;
        return b.Consumo - a.Consumo;
      })
      .slice(0, chartLimit);
  }, [poolsWithLabels, chartLimit]);

  const handleBarClick = (payload) => {
    const org = payload?.commercialGroup;
    if (!org) return;
    setDrillOrganization((prev) => (String(prev) === String(org) ? null : org));
    setExpandedOrg((prev) => (String(prev) === String(org) ? prev : org));
    setCurrentPage(1);
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
        final_client: sim.final_client,
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
      .map(([orgName, sims]) => ({ commercialGroup: orgName, simsCount: sims.length, sims }))
      .sort((a, b) => b.simsCount - a.simsCount);
  }, [rawPools, m2mWithPoolId, selectedOrg, drillOrganization]);

  useEffect(() => {
    if (loading) return;
    const currentTotalGB =
      filteredByControls.reduce((acc, item) => acc + (Number(item.bytes_consumed) || 0), 0) / 1024 ** 3;

    let labels = [];
    let dataPoints = [];

    if (timeRange === 'mensual') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      dataPoints = labels.map(() => Number((currentTotalGB * (0.5 + Math.random() * 0.5)).toFixed(2)));
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      dataPoints = labels.map(() => Number((currentTotalGB * (0.8 + Math.random() * 0.2)).toFixed(2)));
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
                setCurrentPage(1);
              }}
              className="block w-full md:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="ALL">Todas las Organizaciones</option>
              {uniqueOrgs.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => { setDrillOrganization(null); setExpandedOrg(null); setCurrentPage(1); }}
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
                <div className="lg:col-span-9 bg-white p-6 rounded-lg shadow-md h-[620px] min-h-0 flex flex-col">
                  <div className="flex justify-between items-start mb-3 flex-shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-gray-800">
                        Consumo vs Límite
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          Top {chartLimit} · ordenado por % de uso
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Clic en una barra para filtrar por organización
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Mostrar:</span>
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

                  {/* Leyenda de estados */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 flex-shrink-0">
                    {STATUS_LEGEND.map(({ color, label, range }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-gray-500 font-medium">
                          {label} <span className="text-gray-400">({range})</span>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-[#3e4143]" />
                      <span className="text-[10px] text-gray-500 font-medium">Límite contratado</span>
                    </div>
                  </div>

                  {/* Gráfica */}
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 16, right: 16, left: 8, bottom: 72 }}
                        barCategoryGap="28%"
                        barGap={3}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={68}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v} GB`}
                          width={58}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />

                        {/* BARRA CONSUMO */}
                        <Bar
                          dataKey="Consumo"
                          name="Consumo (GB)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={44}
                          onClick={handleBarClick}
                          shape={(props) => {
                            const { x, y, width, height, index } = props;
                            if (index == null || !chartData[index] || width <= 0 || height <= 0) return null;
                            const entry = chartData[index];
                            const isSelected = drillOrganization && String(drillOrganization) === String(entry.commercialGroup);
                            const fill = getBarColor(entry.percent);
                            const opacity = isSelected ? 1 : hasActiveFilter ? 0.3 : 1;
                            return (
                              <g>
                                <rect
                                  x={x} y={y} width={width} height={height}
                                  fill={fill} opacity={opacity} rx={4} ry={4}
                                  cursor="pointer"
                                />
                                <text
                                  x={x + width / 2} y={y - 4}
                                  textAnchor="middle"
                                  fill={fill} fontSize={9} fontWeight="bold"
                                  opacity={opacity}
                                >
                                  {entry.percent.toFixed(0)}%
                                </text>
                              </g>
                            );
                          }}
                        />

                        {/* BARRA LÍMITE */}
                        <Bar
                          dataKey="Limite"
                          name="Límite (GB)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={44}
                          onClick={handleBarClick}
                          shape={(props) => {
                            const { x, y, width, height, index } = props;
                            if (index == null || !chartData[index] || width <= 0 || height <= 0) return null;
                            const entry = chartData[index];
                            const isSelected = drillOrganization && String(drillOrganization) === String(entry.commercialGroup);
                            const opacity = isSelected ? 1 : hasActiveFilter ? 0.3 : 1;
                            return (
                              <rect
                                x={x} y={y} width={width} height={height}
                                fill="#3e4143" opacity={opacity} rx={4} ry={4}
                                cursor="pointer"
                              />
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* LEGEND / SIMS */}
                <div className="lg:col-span-3">
                  <OrgLegend
                    orgRows={orgLegendRows}
                    expandedOrg={expandedOrg}
                    setExpandedOrg={setExpandedOrg}
                  />
                </div>
              </div>
            ),
          },
          {
            id: 'Tendencia',
            title: 'Tendencia de Consumo',
            defaultMode: 'hide',
            render: () => (
              <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" /> Tendencia de Consumo
                  </h3>
                  <div className="flex bg-gray-100 rounded p-1">
                    <button
                      onClick={() => setTimeRange('semanal')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'semanal' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Semanal
                    </button>
                    <button
                      onClick={() => setTimeRange('mensual')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'mensual' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
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
          {
            header: 'Organización',
            accessor: 'organization',
           render: (r) => {
                         const color = getOrgColor(r.organization);
                         const hasCorp = color !== '#94a3b8';
                         return (
                           <span
                             className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                             style={{
                               backgroundColor: `${color}18`,
                               color,
                               border: `1px solid ${color}40`,
                             }}
                           >
                             {r.organization || 'SIN ASIGNAR'}
                           </span>
                         );
                       },
          },
          {
            header: 'Nombre',
            accessor: 'commercialGroup',
            render: (r) => <span className="text-gray-600 font-medium">{r.commercialGroup}</span>,
          },
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
                      style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: colorHex }}
                    />
                  </div>
                </div>
              );
            },
          },
          {
            header: 'Estado',
            accessor: 'usage_percent',
            render: (r) => {
              const p = Number(r.usage_percent) || 0;
              const { label, tailwind } = getStatusConfig(p);
              return (
                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${tailwind}`}>
                  ({p.toFixed(1)}% {label})
                </span>
              );
            },
          },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar Pool ID, Grupo o Estado..."
        searchableKeys={['pool_id', 'commercialGroup', 'status_label']}
        pageSize={rowsPerPage}
        setPageSize={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
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