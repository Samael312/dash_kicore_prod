// RenewalsDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Loader2,
  Calendar,
  MousePointerClick,
  ChevronRight,
  ChevronDown,
  Monitor,
  Copy,
  Wifi,
  Box,
} from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#6366F1', '#EC4899'];

// --- UTILIDAD: Normalizar texto para evitar problemas de mayúsculas/minúsculas ---
const toUpper = (str) => (str || '').toString().trim().toUpperCase();

// --- 1) DEVICE ITEM ---
const DeviceItem = ({ device }) => {
  const [showUuid, setShowUuid] = useState(false);

  const copyToClipboard = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col border-l-2 border-blue-200 ml-1">
      <div
        onClick={() => setShowUuid(!showUuid)}
        className="flex items-center gap-2 pl-4 py-1.5 text-xs text-gray-600 hover:bg-blue-50 cursor-pointer transition-colors group"
      >
        <Monitor size={12} className="text-gray-400" />
        <span className="truncate flex-grow">
          <span className="font-medium text-gray-700">{device.name || 'Sin Nombre'}</span>
          <span className="text-gray-400 ml-1 opacity-75">({device.model_name})</span>
        </span>
        {showUuid ? <ChevronDown size={12} className="text-blue-400" /> : <ChevronRight size={12} className="text-gray-300" />}
      </div>

      {showUuid && (
        <div className="pl-8 pr-2 pb-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-white border border-blue-100 rounded p-2 flex items-center justify-between shadow-sm">
            <code className="text-[10px] font-mono text-blue-600 break-all">{device.uuid}</code>
            <button
              onClick={(e) => copyToClipboard(e, device.uuid)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500"
            >
              <Copy size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 2) KPI CARD ---
const KPICard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
    <div className={`p-4 rounded-full text-white shadow-sm ${color}`}>{React.cloneElement(icon, { size: 28 })}</div>
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value ?? 0}</p>
    </div>
  </div>
);

// --- 3) LEGEND BOX ---
const LegendBox = ({ data, title, subtitle }) => {
  const [expandedDay, setExpandedDay] = useState(null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col overflow-hidden max-h-[320px] lg:max-h-[380px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
          <Calendar size={16} className="text-blue-500" /> {title || 'Vencimientos'}
        </h4>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>

      <div className="overflow-y-auto flex-grow p-2">
        {!data || data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-sm p-4 text-center">
            <MousePointerClick size={32} className="mb-2 opacity-50" />
            <p>Selecciona un punto en el gráfico de línea</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.map((dayGroup, idx) => (
              <div key={idx} className="border border-gray-100 rounded bg-white overflow-hidden transition-all">
                <div
                  onClick={() => setExpandedDay(expandedDay === dayGroup.date ? null : dayGroup.date)}
                  className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors ${
                    expandedDay === dayGroup.date ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {expandedDay === dayGroup.date ? (
                      <ChevronDown size={14} className="text-blue-500" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                    <span className="text-gray-700 font-bold text-xs">{dayGroup.date}</span>
                  </div>
                  <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded text-xs">{dayGroup.count} disp.</span>
                </div>

                {expandedDay === dayGroup.date && (
                  <div className="bg-gray-50 border-t border-blue-100 p-2 space-y-1">
                    {dayGroup.devices.map((device, dIdx) => (
                      <DeviceItem key={dIdx} device={device} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RenewalsDashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Control de Pestañas
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'm2m', 'plan'

  // TableCard control
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Line selection
  const [selectedMonthData, setSelectedMonthData] = useState({ title: '', subtitle: '', data: [] });

  // Drilldowns
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
    if (diffDays < 0)
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center">
          <AlertCircle size={12} className="mr-1" /> VENCIDO ({Math.abs(diffDays)} días)
        </span>
      );
    if (diffDays <= 30)
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center">
          <Clock size={12} className="mr-1" /> POR VENCER ({Math.abs(diffDays)} días)
        </span>
      );
    return (
      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center">
        <CheckCircle size={12} className="mr-1" /> ACTIVO ({Math.abs(diffDays)} días)
      </span>
    );
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
    if (activeTab === 'all') return dataWithStatusLabel;
    return dataWithStatusLabel.filter((d) => {
      if (activeTab === 'm2m') return Boolean(d.icc);
      if (activeTab === 'plan') return !d.icc;
      return true;
    });
  }, [dataWithStatusLabel, activeTab]);

  // ✅ Filtros de gráficas con normalización (UpperCase) para que encajen perfectos
  const filteredByControls = useMemo(() => {
    let data = dataByTab; 

    if (drilldownState) data = data.filter((d) => toUpper(d.ki_subscription_state_label || d.ki_subscription_state || 'Sin Suscripción') === drilldownState);
    if (drilldownModel) data = data.filter((d) => toUpper(d.model_name || 'Desconocido') === drilldownModel);
    if (drilldownStatus) data = data.filter((d) => toUpper(d.status_label || 'INDEFINIDO') === drilldownStatus);

    return data;
  }, [dataByTab, drilldownState, drilldownModel, drilldownStatus]);

  // ✅ CORRECTO: Un efecto solo para reiniciar la página si aplicas/buscas algo
  const processed = useMemo(() => {
    const source = filteredByControls;

    if (!source || source.length === 0) {
      return {
        kpis: { totalDevices: 0, expired: 0, expiringSoon: 0, active: 0 },
        stateStats: [],
        modelStats: [],
        statusStats: [],
        lineChartData: { labels: [], datasets: [{ label: 'Vencimientos', data: [], extraData: [] }] },
      };
    }

    const today = new Date();
    const stats = { totalDevices: 0, expired: 0, expiringSoon: 0, active: 0 };
    const stateCount = {};
    const modelCount = {};
    const statusCount = {};
    const renewalsTimeline = {}; 

    source.forEach((device) => {
      stats.totalDevices++;

      // ✅ Normalizado a Mayúsculas para unificar "No Aplicable" y "No aplicable"
      const state = toUpper(device.ki_subscription_state_label || device.ki_subscription_state || 'Sin Suscripción');
      stateCount[state] = (stateCount[state] || 0) + 1;

      const model = toUpper(device.model_name || 'Desconocido');
      modelCount[model] = (modelCount[model] || 0) + 1;

      const status_label = toUpper(device.status_label || 'INDEFINIDO');
      statusCount[status_label] = (statusCount[status_label] || 0) + 1;

      if (device.date_to_renew) {
        const renewDate = new Date(device.date_to_renew);
        if (!isNaN(renewDate)) {
          const diffDays = Math.ceil((renewDate - today) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) stats.expired++;
          else if (diffDays <= 30) stats.expiringSoon++;
          else stats.active++;

          const monthKey = renewDate.toISOString().slice(0, 7);
          if (!renewalsTimeline[monthKey]) renewalsTimeline[monthKey] = { count: 0, items: [] };
          renewalsTimeline[monthKey].count++;
          
          renewalsTimeline[monthKey].items.push({
            date: device.date_to_renew,
            name: device.m2m_name || device.final_client || device.order_id || 'Sin Nombre',
            uuid: device.uuid,
            ki_subscription_name: device.ki_subscription_name || 'Sin Suscripción',
            model_name: device.model_name || 'Desconocido',
          });
        } else {
          stats.active++;
        }
      } else {
        stats.active++;
      }
    });

    const sortedMonths = Object.keys(renewalsTimeline).sort();

    const stateStats = Object.entries(stateCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const modelStats = Object.entries(modelCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const statusStats = Object.entries(statusCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: stats,
      stateStats,
      modelStats,
      statusStats,
      lineChartData: {
        labels: sortedMonths,
        datasets: [
          {
            label: 'Vencimientos',
            data: sortedMonths.map((m) => renewalsTimeline[m].count),
            extraData: sortedMonths.map((m) => renewalsTimeline[m].items),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
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

  // Manejador seguro para evitar fallos si el componente devuelve un objeto
  const safeExtractLabel = (item) => (typeof item === 'object' ? (item.name || item.label) : item);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const hasActiveFilter = Boolean(drilldownState || drilldownModel || drilldownStatus);

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
      <div className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-blue-900">📊 Dashboard de Renovaciones</h2>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('all'); setDrilldownState(null); setDrilldownModel(null); setDrilldownStatus(null); setSearchTerm(''); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => { setActiveTab('m2m'); setDrilldownState(null); setDrilldownModel(null); setDrilldownStatus(null); setSearchTerm(''); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'm2m' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wifi size={16} /> M2M
          </button>
          <button
            onClick={() => { setActiveTab('plan'); setDrilldownState(null); setDrilldownModel(null); setDrilldownStatus(null); setSearchTerm(''); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'plan' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Box size={16} /> Planes
          </button>
        </div>

        {hasActiveFilter && (
          <button
            onClick={() => {
              setDrilldownState(null);
              setDrilldownModel(null);
              setDrilldownStatus(null);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
          >
            Limpiar filtros ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total" value={processed.kpis.totalDevices} icon={<Server />} color="bg-blue-500" />
        <KPICard title="Activas" value={processed.kpis.active} icon={<CheckCircle />} color="bg-green-500" />
        <KPICard title="Por Vencer" value={processed.kpis.expiringSoon} icon={<Clock />} color="bg-yellow-500" />
        <KPICard title="Vencidas" value={processed.kpis.expired} icon={<AlertCircle />} color="bg-red-500" />
      </div>

      <SelectDash
        storageKey="renewalsDashboard:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'subscription-state',
            title: 'Estado de Producción',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Producción"
                legendTitle="Estados visibles"
                data={processed.stateStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-80"
                selectedLabel={drilldownState}
                getColor={(i, row) => {
                  const k = (row.__label || row.name || '').toLowerCase();
                  if (k.includes('activa')) return '#10B981';
                  if (k.includes('aplicable')) return '#F59E0B';
                  if (k.includes('cancelada')) return '#EF4444';
                  return '#9CA3AF';
                }}
                onSliceClick={(item) => {
                  setDrilldownState(safeExtractLabel(item));
                  setDrilldownModel(null);
                  setDrilldownStatus(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
          {
            id: 'models-bar',
            title: 'Distribución por Modelo',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Modelo"
                legendTitle="Modelos visibles"
                data={processed.modelStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-96"
                indexAxis="y"
                selectedLabel={drilldownModel}
                getColor={(i) => CHART_COLORS[i % CHART_COLORS.length]}
                onBarClick={(item) => {
                  setDrilldownModel(safeExtractLabel(item));
                  setDrilldownState(null);
                  setDrilldownStatus(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
          {
            id: 'renewal-status',
            title: 'Estado de Renovación',
            defaultMode: 'min',
            render: () => (
              <PieChartCard
                title="Estado de Renovación"
                legendTitle="Estados visibles"
                data={processed.statusStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => {
                  const k = (row.__label || row.name || '').toUpperCase();
                  if (k === 'ACTIVO') return '#10B981';
                  if (k === 'POR VENCER') return '#F59E0B';
                  if (k === 'VENCIDO') return '#EF4444';
                  return '#9CA3AF';
                }}
                onSliceClick={(item) => {
                  setDrilldownStatus(safeExtractLabel(item));
                  setDrilldownState(null);
                  setDrilldownModel(null);
                  setCurrentPage(1);
                }}
              />
            ),
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded shadow border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">Próximos Vencimientos</h3>
          <div className="h-80 relative">
            <Line
              data={processed.lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                onClick: (_, el) => el.length > 0 && handleSelection(el[0].index),
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <LegendBox title={selectedMonthData.title} subtitle={selectedMonthData.subtitle} data={selectedMonthData.data} />
        </div>
      </div>

      <TableCard
        title="Listado de Renovaciones"
        data={filteredByControls}
        columns={[
          {
            header: 'Dispositivo / Cliente',
            accessor: 'm2m_name',
            render: (r) => (
              <div>
                <div className="text-[10px] font-mono text-gray-400">{r.uuid}</div>
                <div className="font-semibold text-gray-700">{r.m2m_name || r.final_client || r.order_id || 'Sin nombre'}</div>
              </div>
            ),
          },
          { header: 'Modelo', accessor: 'model_name' },
          { header: 'F. Renovación', accessor: 'date_to_renew' },
          {header: 'Suscripción', accessor:'ki_subscription_name', render: (r) => r.ki_subscription_name || 'Sin Suscripción'},
          { header: 'Estado', accessor: 'status_label', render: (r) => getStatusBadge(r.date_to_renew) },
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={val => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Buscar por nombre, cliente o UUID..."
        searchableKeys={['m2m_name', 'final_client', 'uuid', 'model_name', 'status_label', 'ki_subscription_name']}
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