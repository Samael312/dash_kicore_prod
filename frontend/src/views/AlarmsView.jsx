// AlarmsView.jsx
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useDataCache } from '../context/DataCacheContext';
import KpiCard from '../components/KpiCard';
import { 
  Bell, 
  Activity, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  Radio, 
  Sliders, 
  Wifi, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

const CACHE_KEY = 'alarms_analytics';

const AlarmsView = () => {
  const { getCachedData, invalidateCache, isCached } = useDataCache();
  const [stats, setStats]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSync, setLastSync]   = useState(null);

  // ── ESTADO DE DRILLDOWN (Filtro Activo) ──
  const [activeMetric, setActiveMetric] = useState(null);

  // ── Solo lee BD (usa caché si existe) ──
  const readFromCache = useCallback(async () => {
    setLoadingRead(true);
    try {
      const result = await getCachedData(CACHE_KEY, async () => {
        const [freshStats, freshHistory] = await Promise.all([
          api.getAlarmStats(),
          api.getAlarmHistory(144)
        ]);
        return {
          stats: freshStats || null,
          history: Array.isArray(freshHistory) ? freshHistory : []
        };
      });
      setStats(result?.stats || null);
      setHistory(result?.history || []);
    } catch (err) {
      console.error('[AlarmsView] Error leyendo datos:', err);
    } finally {
      setLoadingRead(false);
    }
  }, [getCachedData]);

  // ── Sync completo: Cloud API → BD → invalida caché → re-lee ──
  const syncAndRefresh = useCallback(async () => {
    setSyncError(null);
    setLoadingSync(true);
    try {
      await api.syncAlarms();
      setLastSync(new Date());
      invalidateCache(CACHE_KEY);
      await readFromCache();
    } catch (err) {
      console.error('[AlarmsView] Error en sync:', err);
      setSyncError('No se pudo sincronizar con la API de alarmas.');
      await readFromCache();
    } finally {
      setLoadingSync(false);
    }
  }, [invalidateCache, readFromCache]);

  useEffect(() => {
    if (isCached(CACHE_KEY)) {
      readFromCache();
    } else {
      syncAndRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Métricas calculadas para los subtítulos de los KPIs
  const kpiMetrics = useMemo(() => {
    const total = 
      (stats?.disconnected_device || 0) +
      (stats?.disconnected_control || 0) +
      (stats?.parameters || 0) +
      (stats?.sim_high || 0) +
      (stats?.sim_critical || 0);

    const getPct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

    return {
      total,
      pctDevice: getPct(stats?.disconnected_device || 0),
      pctControl: getPct(stats?.disconnected_control || 0),
      pctParams: getPct(stats?.parameters || 0),
      pctHigh: getPct(stats?.sim_high || 0),
      pctCritical: getPct(stats?.sim_critical || 0),
    };
  }, [stats]);

  // Manejador del toggle interactivo
  const handleMetricToggle = (metricKey) => {
    setActiveMetric((prev) => (prev === metricKey ? null : metricKey));
  };

  // ── Configuración de Gráfico Dinámico (Filtra las series temporales) ──
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const labels = history.map(h => {
      if (!h.timestamp) return '—';
      return new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const allDatasets = [
      { 
        id: 'disconnected_device', 
        label: 'Inst. Offline', 
        data: history.map(h => h.disconnected_device ?? 0),
        borderColor: '#b91c1c', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 
      },
      { 
        id: 'disconnected_control', 
        label: 'Controles Offline', 
        data: history.map(h => h.disconnected_control ?? 0),
        borderColor: '#f97316', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 
      },
      { 
        id: 'parameters', 
        label: 'Fallo Parámetros', 
        data: history.map(h => h.parameters ?? 0),
        borderColor: '#eab308', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 
      },
      { 
        id: 'sim_high', 
        label: 'SIM Tráfico Alto', 
        data: history.map(h => h.sim_high ?? 0),
        borderColor: '#6366f1', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 
      },
      { 
        id: 'sim_critical', 
        label: 'SIM Tráfico Crítico', 
        data: history.map(h => h.sim_critical ?? 0),
        borderColor: '#a855f7', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 
      },
    ];

    // Si hay una métrica seleccionada en los KPIs, filtramos el array de datasets para mostrar solo esa línea
    const filteredDatasets = activeMetric 
      ? allDatasets.filter(dataset => dataset.id === activeMetric)
      : allDatasets;

    return { labels, datasets: filteredDatasets };
  }, [history, activeMetric]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11, weight: '600' } } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
    }
  };

  const isBusy = loadingSync || loadingRead;

  if (isBusy && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500 font-medium">
          {loadingSync ? 'Sincronizando con la API de alarmas...' : 'Cargando datos...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-10">

      {/* HEADER */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Bell className="text-blue-600" size={26} /> Analítica de Alarmas
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Estado estructural e histórico del parque de dispositivos.</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={syncAndRefresh}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 text-blue-700 text-xs font-bold uppercase tracking-wider rounded shadow-sm transition-all duration-150"
          >
            <RefreshCw size={14} className={isBusy ? 'animate-spin' : ''} />
            {loadingSync ? 'Consultando API...' : loadingRead ? 'Leyendo BD...' : 'Sincronizar Ahora'}
          </button>

          {(lastSync || stats?.timestamp) && (
            <div className="text-right text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 italic flex flex-col shadow-inner">
              <span className="font-bold text-gray-600 uppercase mb-0.5 tracking-wider">
                {lastSync ? 'Última sincronización' : 'Última captura BD'}
              </span>
              <span>
                {lastSync
                  ? lastSync.toLocaleString('es-ES')
                  : new Date(stats.timestamp).toLocaleString('es-ES')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error de sync */}
      {syncError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{syncError}</span>
          <button onClick={() => setSyncError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* KPI CARDS INTERACTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Instalaciones Offline"
          value={stats?.disconnected_device}
          icon={<AlertCircle />}
          color="red"
          sub={`${kpiMetrics.pctDevice}% del total`}
          onClick={() => handleMetricToggle('disconnected_device')}
          active={activeMetric === 'disconnected_device'}
          disabled={isBusy}
        />
        <KpiCard
          title="Controles Offline"
          value={stats?.disconnected_control}
          icon={<Radio />}
          color="orange"
          sub={`${kpiMetrics.pctControl}% del total`}
          onClick={() => handleMetricToggle('disconnected_control')}
          active={activeMetric === 'disconnected_control'}
          disabled={isBusy}
        />
        <KpiCard
          title="Fallo Parámetros"
          value={stats?.parameters}
          icon={<Sliders />}
          color="yellow"
          sub={`${kpiMetrics.pctParams}% del total`}
          onClick={() => handleMetricToggle('parameters')}
          active={activeMetric === 'parameters'}
          disabled={isBusy}
        />
        <KpiCard
          title="SIM Tráfico Alto"
          value={stats?.sim_high}
          icon={<Wifi />}
          color="indigo"
          sub={`${kpiMetrics.pctHigh}% del total`}
          onClick={() => handleMetricToggle('sim_high')}
          active={activeMetric === 'sim_high'}
          disabled={isBusy}
        />
        <KpiCard
          title="SIM Tráfico Crítico"
          value={stats?.sim_critical}
          icon={<AlertTriangle />}
          color="purple"
          sub={`${kpiMetrics.pctCritical}% del total`}
          onClick={() => handleMetricToggle('sim_critical')}
          active={activeMetric === 'sim_critical'}
          disabled={isBusy}
        />
      </div>

      {/* HISTORICAL CHART */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest">
              Evolución Temporal (Muestras cada 10 min)
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            {activeMetric && (
              <button
                onClick={() => setActiveMetric(null)}
                className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200 hover:bg-red-100 transition-colors"
              >
                Mostrar Todas las Líneas ✕
              </button>
            )}
            {isBusy && (
              <span className="text-xs text-blue-500 font-semibold animate-pulse flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <Loader2 size={12} className="animate-spin" />
                {loadingSync ? 'Consultando API de alarmas...' : 'Actualizando gráfico...'}
              </span>
            )}
          </div>
        </div>

        <div className="h-[380px] w-full">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-sm border border-dashed border-gray-200 rounded">
              {isBusy ? 'Cargando datos...' : 'Sin datos históricos en la base de datos.'}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AlarmsView;