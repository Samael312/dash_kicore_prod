// AlarmsView.jsx
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useDataCache } from '../context/DataCacheContext';
import { Bell, Activity, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
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
      // Intentamos mostrar lo que haya en caché/BD igualmente
      await readFromCache();
    } finally {
      setLoadingSync(false);
    }
  }, [invalidateCache, readFromCache]);

  // Al montar: si hay caché la usa, si no hace sync completo
  useEffect(() => {
    if (isCached(CACHE_KEY)) {
      console.log('📦 [AlarmsView] Datos en caché → usando caché.');
      readFromCache();
    } else {
      console.log('🚀 [AlarmsView] Sin caché → sync completo.');
      syncAndRefresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chart ──
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const labels = history.map(h => {
      if (!h.timestamp) return '—';
      return new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    return {
      labels,
      datasets: [
        { label: 'Instalaciones Offline', data: history.map(h => h.disconnected_device ?? 0),
          borderColor: '#b91c1c', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'Controles Offline', data: history.map(h => h.disconnected_control ?? 0),
          borderColor: '#ef4444', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'Fallo Parámetros', data: history.map(h => h.parameters ?? 0),
          borderColor: '#f97316', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'SIM Tráfico Alto', data: history.map(h => h.sim_high ?? 0),
          borderColor: '#eab308', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: 'SIM Tráfico Crítico', data: history.map(h => h.sim_critical ?? 0),
          borderColor: '#000000', backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, borderWidth: 2 },
      ],
    };
  }, [history]);

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

      {/* Error de sync (no bloquea la UI) */}
      {syncError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{syncError}</span>
          <button onClick={() => setSyncError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Instalaciones Offline', value: stats?.disconnected_device, color: 'border-red-700',    text: 'text-red-700'    },
          { label: 'Controles Offline',     value: stats?.disconnected_control, color: 'border-red-500',   text: 'text-red-500'    },
          { label: 'Fallo Parámetros',      value: stats?.parameters,           color: 'border-orange-500', text: 'text-orange-600' },
          { label: 'SIM Tráfico Alto',      value: stats?.sim_high,             color: 'border-yellow-500', text: 'text-yellow-600' },
          { label: 'SIM Tráfico Crítico',   value: stats?.sim_critical,         color: 'border-black',      text: 'text-black'      },
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-white p-5 rounded shadow-sm border-l-4 ${kpi.color} hover:shadow-md transition-all duration-200 relative`}>
            {isBusy && (
              <div className="absolute inset-0 bg-white/60 rounded flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            )}
            <span className="text-gray-400 text-[10px] font-bold uppercase block tracking-widest">{kpi.label}</span>
            <div className={`text-3xl font-black ${kpi.text} mt-2 tabular-nums`}>
              {kpi.value ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* HISTORICAL CHART */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest">
              Evolución Temporal (Muestras cada 10 min)
            </h3>
          </div>
          {isBusy && (
            <span className="text-xs text-blue-500 font-semibold animate-pulse flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Loader2 size={12} className="animate-spin" />
              {loadingSync ? 'Consultando API de alarmas...' : 'Actualizando gráfico...'}
            </span>
          )}
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