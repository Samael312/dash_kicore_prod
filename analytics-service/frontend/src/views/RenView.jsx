// RenewalsDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';

import {
  AlertCircle, CheckCircle, Clock, Server, Loader2, Calendar,
  MousePointerClick, ChevronRight, ChevronDown, Monitor, Copy, Wifi, Box,
} from 'lucide-react';

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#6366F1', '#EC4899'];
const toUpper = (str) => (str || '').toString().trim().toUpperCase();

// --- DEVICE ITEM ---
const DeviceItem = ({ device }) => {
  const [showUuid, setShowUuid] = useState(false);
  const copyToClipboard = (e, text) => { e.stopPropagation(); navigator.clipboard.writeText(text); };

  return (
    <div className="flex flex-col border-l-2 border-blue-200 ml-1">
      <div onClick={() => setShowUuid(!showUuid)} className="flex items-center gap-2 pl-4 py-1.5 text-xs text-gray-600 hover:bg-blue-50 cursor-pointer transition-colors group">
        <Monitor size={12} className="text-gray-400" />
        <span className="truncate flex-grow">
          <span className="font-medium text-gray-700">{device.name || 'Sin Nombre'}</span>
          <span className="text-gray-400 ml-1 opacity-75">({device.model_name})</span>
          {device.organization && <span className="text-gray-300 ml-1 opacity-75 text-[10px]">· {device.organization}</span>}
        </span>
        {showUuid ? <ChevronDown size={12} className="text-blue-400" /> : <ChevronRight size={12} className="text-gray-300" />}
      </div>
      {showUuid && (
        <div className="pl-8 pr-2 pb-2 pt-1">
          <div className="bg-white border border-blue-100 rounded p-2 flex items-center justify-between shadow-sm">
            <code className="text-[10px] font-mono text-blue-600 break-all">{device.uuid}</code>
            <button onClick={(e) => copyToClipboard(e, device.uuid)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500">
              <Copy size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- KPI CARD ---
const KPICard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
    <div className={`p-4 rounded-full text-white shadow-sm ${color}`}>{React.cloneElement(icon, { size: 28 })}</div>
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value ?? 0}</p>
    </div>
  </div>
);

// --- LEGEND BOX ---
const LegendBox = ({ data, title, subtitle }) => {
  const [expandedDay, setExpandedDay] = useState(null);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-md h-full flex flex-col overflow-hidden max-h-[320px] lg:max-h-[380px]" style={{ boxShadow: '0 4px 24px 0 rgba(59,130,246,0.07)' }}>
      <div className="px-5 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, #f8fafc 100%)' }}>
        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
          <span className="bg-blue-100 rounded-lg p-1.5 flex items-center justify-center"><Calendar size={14} className="text-blue-500" /></span>
          {title || 'Vencimientos'}
        </h4>
        {subtitle && <p className="text-[11px] text-blue-400 mt-1.5 font-medium pl-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-y-auto flex-grow p-2.5 space-y-1">
        {!data || data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-sm p-4 text-center gap-3">
            <div className="bg-gray-50 rounded-full p-4"><MousePointerClick size={28} className="text-gray-300" /></div>
            <p className="text-xs text-gray-400 leading-relaxed">Selecciona un punto<br/>en el gráfico de línea</p>
          </div>
        ) : (
          data.map((dayGroup, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg bg-white overflow-hidden hover:border-blue-100" style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)' }}>
              <div onClick={() => setExpandedDay(expandedDay === dayGroup.date ? null : dayGroup.date)}
                className={`flex items-center justify-between py-2.5 px-3 cursor-pointer transition-colors ${expandedDay === dayGroup.date ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`transition-transform duration-200 ${expandedDay === dayGroup.date ? 'rotate-90' : ''}`}>
                    <ChevronRight size={13} className={expandedDay === dayGroup.date ? 'text-blue-500' : 'text-gray-300'} />
                  </span>
                  <span className={`text-xs font-semibold ${expandedDay === dayGroup.date ? 'text-blue-700' : 'text-gray-600'}`}>{dayGroup.date}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${expandedDay === dayGroup.date ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {dayGroup.count} disp.
                </span>
              </div>
              {expandedDay === dayGroup.date && (
                <div className="bg-gradient-to-b from-blue-50/60 to-white border-t border-blue-100 p-2 space-y-1">
                  {dayGroup.devices.map((device, dIdx) => <DeviceItem key={dIdx} device={device} />)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const RenewalsDashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedMonthData, setSelectedMonthData] = useState({ title: '', subtitle: '', data: [] });
  const [drilldownState, setDrilldownState] = useState(null);
  const [drilldownModel, setDrilldownModel] = useState(null);
  const [drilldownStatus, setDrilldownStatus] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.getRenewals(1, 5000);
        setRawData(Array.isArray(res) ? res : res?.items || []);
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (dateStr) => {
    if (!dateStr) return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">INDEFINIDO</span>;
    const diffDays = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center"><AlertCircle size={12} className="mr-1" /> VENCIDO ({Math.abs(diffDays)} días)</span>;
    if (diffDays <= 30) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center"><Clock size={12} className="mr-1" /> POR VENCER ({Math.abs(diffDays)} días)</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center"><CheckCircle size={12} className="mr-1" /> ACTIVO ({Math.abs(diffDays)} días)</span>;
  };

  const dataWithStatusLabel = useMemo(() => {
    const today = new Date();
    return (rawData || []).map((r) => {
      let status_label = 'ACTIVO';
      if (!r.date_to_renew) status_label = 'INDEFINIDO';
      else {
        const diffDays = Math.ceil((new Date(r.date_to_renew) - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) status_label = 'VENCIDO';
        else if (diffDays <= 30) status_label = 'POR VENCER';
      }
      return { ...r, status_label };
    });
  }, [rawData]);

  const dataByTab = useMemo(() => {
    if (activeTab === 'm2m')  return dataWithStatusLabel.filter((d) => Boolean(d.icc));
    if (activeTab === 'plan') return dataWithStatusLabel.filter((d) => !d.icc);
    return dataWithStatusLabel;
  }, [dataWithStatusLabel, activeTab]);

  const filteredByControls = useMemo(() => {
    let data = dataByTab;
    if (drilldownState)  data = data.filter((d) => toUpper(d.ki_subscription_state_label || d.ki_subscription_state || 'Sin Suscripción') === drilldownState);
    if (drilldownModel)  data = data.filter((d) => toUpper(d.model_name || 'Desconocido') === drilldownModel);
    if (drilldownStatus) data = data.filter((d) => toUpper(d.status_label || 'INDEFINIDO') === drilldownStatus);
    return data;
  }, [dataByTab, drilldownState, drilldownModel, drilldownStatus]);

  const processed = useMemo(() => {
    const source = filteredByControls;
    if (!source || source.length === 0) {
      return {
        kpis: { totalDevices: 0, expired: 0, expiringSoon: 0, active: 0 },
        stateStats: [], modelStats: [], statusStats: [],
        lineChartData: { labels: [], datasets: [{ label: 'Vencimientos', data: [], extraData: [] }] },
      };
    }

    const today = new Date();
    const stats = { totalDevices: 0, expired: 0, expiringSoon: 0, active: 0 };
    const stateCount = {}, modelCount = {}, statusCount = {}, renewalsTimeline = {};

    source.forEach((device) => {
      stats.totalDevices++;
      const state = device.ki_subscription_state_label || device.ki_subscription_state || 'Sin Suscripción';
      stateCount[state] = (stateCount[state] || 0) + 1;
      const model = toUpper(device.model_name || 'Desconocido');
      modelCount[model] = (modelCount[model] || 0) + 1;
      const status_label = toUpper(device.status_label || 'INDEFINIDO');
      statusCount[status_label] = (statusCount[status_label] || 0) + 1;

      if (device.date_to_renew) {
        const renewDate = new Date(device.date_to_renew);
        if (!isNaN(renewDate)) {
          const diffDays = Math.ceil((renewDate - today) / (1000 * 60 * 60 * 24));
          let color;
          if (diffDays < 0)        { stats.expired++;      color = '#dc2626'; }
          else if (diffDays <= 30) { stats.expiringSoon++; color = '#eab308'; }
          else                     { stats.active++;       color = '#16a34a'; }

          const monthKey = renewDate.toISOString().slice(0, 7);
          if (!renewalsTimeline[monthKey]) renewalsTimeline[monthKey] = { count: 0, items: [], colors: [] };
          renewalsTimeline[monthKey].count++;
          renewalsTimeline[monthKey].colors.push(color);
          renewalsTimeline[monthKey].items.push({
            date: device.date_to_renew,
            name: device.m2m_name || device.name || device.final_client || device.order_id || 'Sin Nombre',
            uuid: device.uuid,
            ki_subscription_name: device.ki_subscription_name || 'Sin Suscripción',
            model_name: device.model_name || 'Desconocido',
            organization: device.organization || null,
          });
        } else { stats.active++; }
      } else { stats.active++; }
    });

    const sortedMonths = Object.keys(renewalsTimeline).sort();
    const labels = sortedMonths;
    const data   = labels.map(m => renewalsTimeline[m].count);
    const backgroundColors = labels.map(m => {
      const colors = renewalsTimeline[m].colors || [];
      if (colors.includes('#dc2626')) return '#dc2626';
      if (colors.includes('#eab308')) return '#eab308';
      return '#16a34a';
    });
    const extraData = labels.map(m => renewalsTimeline[m].items || []);

    return {
      kpis: stats,
      stateStats:  Object.entries(stateCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      modelStats:  Object.entries(modelCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      statusStats: Object.entries(statusCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      lineChartData: { labels, datasets: [{ label: 'Vencimientos', data, backgroundColor: backgroundColors, borderColor: backgroundColors, extraData, tension: 0.3 }] },
    };
  }, [filteredByControls]);

  const handleSelection = (index) => {
    const lc = processed.lineChartData;
    if (!lc?.labels?.[index]) return;
    const monthLabel = lc.labels[index];
    const itemsArray = lc.datasets?.[0]?.extraData?.[index] || [];
    const groups = {};
    itemsArray.forEach((item) => {
      if (!groups[item.date]) groups[item.date] = { date: item.date, count: 0, devices: [] };
      groups[item.date].count++;
      groups[item.date].devices.push(item);
    });
    setSelectedMonthData({
      title: `Vencimientos: ${monthLabel}`,
      subtitle: `${itemsArray.length} dispositivos`,
      data: Object.values(groups).sort((a, b) => a.date.localeCompare(b.date)),
    });
  };

  useEffect(() => {
    const labels = processed?.lineChartData?.labels || [];
    if (labels.length > 0) handleSelection(labels.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processed.lineChartData.labels?.join('|')]);

  const safeExtractLabel = (item) => (typeof item === 'object' ? (item.name || item.label) : item);

  const clearDrilldowns = () => { setDrilldownState(null); setDrilldownModel(null); setDrilldownStatus(null); setCurrentPage(1); };
  const switchTab = (tab) => { setActiveTab(tab); clearDrilldowns(); setSearchTerm(''); };

  const totalItems      = filteredByControls.length;
  const totalPages      = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const hasActiveFilter = Boolean(drilldownState || drilldownModel || drilldownStatus);

  // ─── Columnas dinámicas según tab ────────────────────────────────────────────
  const tableColumns = useMemo(() => {
    const colDevice = {
      header: 'Dispositivo / Cliente',
      accessor: 'm2m_name',
      render: (r) => (
        <div>
          <div className="text-[10px] font-mono text-gray-400">{r.uuid}</div>
          <div className="font-semibold text-gray-700">
            {r.m2m_name || r.name || r.final_client || r.order_id || 'Sin nombre'}
          </div>
          {r.organization && <div className="text-[10px] text-gray-400 mt-0.5">{r.organization}</div>}
        </div>
      ),
    };

    const colModel       = { header: 'Modelo',        accessor: 'model_name' };
    const colRenewalDate = { header: 'F. Renovación',  accessor: 'date_to_renew' };

    // Columna Suscripción: solo en tab 'plan' y 'all'
    // - Tab 'plan': siempre muestra ki_subscription_name
    // - Tab 'all':  si tiene icc → badge "M2M", si no → ki_subscription_name
    const colSubscription = {
      header: 'Suscripción',
      accessor: 'ki_subscription_name',
      render: (r) => {
        const isM2M = Boolean(r.icc);
        if (isM2M) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              M2M
            </span>
          );
        }
        return (
          <span className="text-sm text-gray-700">{r.ki_subscription_name || '—'}</span>
        );
      },
    };

    const colEstado = {
      header: 'Estado',
      accessor: 'state_label',
      render: (r) => {
        const label = r.state_label || r.state || '—';
        const l = label.toLowerCase();
        let cls = 'bg-gray-100 text-gray-600';
        if (l.includes('activa'))      cls = 'bg-green-100 text-green-700';
        else if (l.includes('cancelada'))   cls = 'bg-red-100 text-red-700';
        else if (l.includes('aplicable'))   cls = 'bg-yellow-100 text-yellow-700';
        else if (l.includes('inactiva'))    cls = 'bg-orange-100 text-orange-700';
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
      },
    };

    const colRenovacion = {
      header: 'Renovación',
      accessor: 'status_label',
      render: (r) => getStatusBadge(r.date_to_renew),
    };

    // M2M: sin columna Suscripción
    if (activeTab === 'm2m') {
      return [colDevice, colModel, colRenewalDate, colEstado, colRenovacion];
    }

    // Plan y All: con columna Suscripción
    return [colDevice, colModel, colRenewalDate, colSubscription, colEstado, colRenovacion];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 animate-fade-in pb-10">
      {/* HEADER + TABS */}
      <div className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-blue-900">📊 Dashboard de Renovaciones</h2>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all',  label: 'Todas',  icon: null },
            { key: 'm2m',  label: 'M2M',    icon: <Wifi size={16} /> },
            { key: 'plan', label: 'Planes',  icon: <Box size={16} /> },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => switchTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === key ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {hasActiveFilter && (
          <button onClick={clearDrilldowns} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors">
            Limpiar filtros ✕
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total"      value={processed.kpis.totalDevices} icon={<Server />}      color="bg-blue-500" />
        <KPICard title="Activas"    value={processed.kpis.active}       icon={<CheckCircle />} color="bg-green-500" />
        <KPICard title="Por Vencer" value={processed.kpis.expiringSoon} icon={<Clock />}       color="bg-yellow-500" />
        <KPICard title="Vencidas"   value={processed.kpis.expired}      icon={<AlertCircle />} color="bg-red-500" />
      </div>

      {/* VISUALIZACIONES */}
      <SelectDash
        storageKey="renewalsDashboard:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'subscription-state', title: 'Estado de Producción', defaultMode: 'show',
            render: () => (
              <PieChartCard title="Estado de Producción" legendTitle="Estados visibles"
                data={processed.stateStats} labelKey="name" valueKey="value" heightClass="h-80"
                selectedLabel={drilldownState} getColor={(i) => CHART_COLORS[i % CHART_COLORS.length]}
                onSliceClick={(item) => { setDrilldownState(safeExtractLabel(item)); setDrilldownModel(null); setDrilldownStatus(null); setCurrentPage(1); }}
              />
            ),
          },
          {
            id: 'models-bar', title: 'Distribución por Modelo', defaultMode: 'show',
            render: () => (
              <BarChartCard title="Distribución por Modelo" legendTitle="Modelos visibles"
                data={processed.modelStats} labelKey="name" valueKey="value" heightClass="h-96" indexAxis="y"
                selectedLabel={drilldownModel} getColor={(i) => CHART_COLORS[i % CHART_COLORS.length]}
                onBarClick={(item) => { setDrilldownModel(safeExtractLabel(item)); setDrilldownState(null); setDrilldownStatus(null); setCurrentPage(1); }}
              />
            ),
          },
          {
            id: 'renewal-status', title: 'Estado de Renovación', defaultMode: 'min',
            render: () => (
              <PieChartCard title="Estado de Renovación" legendTitle="Estados visibles"
                data={processed.statusStats} labelKey="name" valueKey="value" heightClass="h-72"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => {
                  const k = (row.__label || row.name || '').toUpperCase();
                  if (k === 'ACTIVO')      return '#10B981';
                  if (k === 'POR VENCER') return '#F59E0B';
                  if (k === 'VENCIDO')    return '#EF4444';
                  return '#9CA3AF';
                }}
                onSliceClick={(item) => { setDrilldownStatus(safeExtractLabel(item)); setDrilldownState(null); setDrilldownModel(null); setCurrentPage(1); }}
              />
            ),
          },
        ]}
      />

      {/* LÍNEA DE TIEMPO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 4px 24px 0 rgba(59,130,246,0.07)' }}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, #f8fafc 100%)' }}>
            <div className="flex items-center gap-2.5">
              <span className="bg-blue-100 rounded-lg p-1.5 flex items-center justify-center"><Calendar size={15} className="text-blue-500" /></span>
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest">Próximos Vencimientos</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600"><span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm" />Vencido</span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-yellow-600"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block shadow-sm" />Por vencer</span>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600"><span className="w-3 h-3 rounded-full bg-green-500 inline-block shadow-sm" />Activo</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">Haz clic en un punto para ver detalles</span>
            </div>
          </div>
          <div className="flex sm:hidden items-center gap-4 px-6 pt-4">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Vencido</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-yellow-600"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />Por vencer</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Activo</span>
          </div>
          <div className="p-6">
            <div className="h-80 relative">
              <Line
                data={{
                  ...processed.lineChartData,
                  datasets: processed.lineChartData.datasets.map(ds => ({
                    ...ds,
                    segment: { borderColor: (ctx) => { const c = ds.backgroundColor; return Array.isArray(c) ? (c[ctx.p0DataIndex] ?? c[0]) : c; } },
                    borderColor: 'transparent',
                    pointBackgroundColor: ds.backgroundColor,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                  }))
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  onClick: (_, el) => el.length > 0 && handleSelection(el[0].index),
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15,23,42,0.88)', titleColor: '#93c5fd', bodyColor: '#e2e8f0',
                      borderColor: 'rgba(99,102,241,0.2)', borderWidth: 1, padding: 10, cornerRadius: 8,
                      callbacks: {
                        labelColor: (ctx) => {
                          const colors = processed.lineChartData.datasets[0]?.backgroundColor;
                          const color = Array.isArray(colors) ? colors[ctx.dataIndex] : colors;
                          return { borderColor: color, backgroundColor: color, borderRadius: 4 };
                        }
                      }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0, color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(148,163,184,0.08)' }, border: { display: false } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-4">
          <LegendBox title={selectedMonthData.title} subtitle={selectedMonthData.subtitle} data={selectedMonthData.data} />
        </div>
      </div>

      {/* TABLA */}
      <TableCard
        title="Listado de Renovaciones"
        data={filteredByControls}
        columns={tableColumns}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={val => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar por nombre, dispositivo, UUID u organización..."
        searchableKeys={['m2m_name', 'name', 'final_client', 'uuid', 'model_name', 'status_label', 'ki_subscription_name', 'organization', 'ki_subscription_state_label', 'order_id']}
        pageSize={rowsPerPage}
        setPageSize={val => { setRowsPerPage(val); setCurrentPage(1); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default RenewalsDashboard;