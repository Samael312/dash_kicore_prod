// AlarmsView.jsx
import React, { useMemo, useEffect, useRef } from 'react';
import useCachedFetch from '../hooks/useCachedFetch'; 
import { Bell, Activity, Loader2, RefreshCw } from 'lucide-react';
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
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AlarmsView = () => {
  // 1. Destructuramos usando el nombre real revelado por la consola: 'refresh'
  const { data: alarmsData, loading, refresh } = useCachedFetch(
    'alarms_analytics',
    async () => {
      const [freshStats, freshHistory] = await Promise.all([
        api.getAlarmStats(),
        api.getAlarmHistory(144) 
      ]);
      return {
        stats: freshStats || null,
        history: Array.isArray(freshHistory) ? freshHistory : []
      };
    }
  );

  // 2. Guardamos la referencia de refresh en un useRef para evitar bucles infinitos
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // 3. CONTROL DE CICLO DE VIDA ÚNICO (Array de dependencias vacío [])
  useEffect(() => {
    // Se ejecuta una única vez en cuanto el usuario pisa esta pantalla
    console.log('🚀 [AlarmsView] Pantalla cargada/reabierta. Forzando actualización de datos...');
    if (refreshRef.current) refreshRef.current();

    // Configuramos el intervalo pasivo de 10 minutos
    const INTERVAL_10_MIN = 10 * 60 * 1000; 
    const autoRefresh = setInterval(() => {
      const ahora = new Date().toLocaleTimeString();
      console.log(`🔄 [AlarmsView] Ciclo de 10 minutos cumplido en pantalla (${ahora}). Auto-refrescando...`);
      if (refreshRef.current) refreshRef.current();
    }, INTERVAL_10_MIN);

    // Al salir de la pantalla, destruimos el contador limpiamente
    return () => {
      console.log('🛑 [AlarmsView] Saliendo de la pantalla. Limpiando temporizador.');
      clearInterval(autoRefresh);
    };
  }, []); // [] asegura que este bloque SOLO se monte una vez y no parpadee

  const realStats = alarmsData?.stats || null;
  const historyData = alarmsData?.history || [];

  // Construcción del Gráfico
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const labels = historyData.map(h => {
      if (!h.timestamp) return '—';
      return new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Instalaciones Offline',
          data: historyData.map(h => h.disconnected_device ?? 0),
          borderColor: '#b91c1c',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'Controles Offline',
          data: historyData.map(h => h.disconnected_control ?? 0),
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'Fallo Parámetros',
          data: historyData.map(h => h.parameters ?? 0),
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'SIM Tráfico Alto',
          data: historyData.map(h => h.sim_high ?? 0),
          borderColor: '#eab308',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'SIM Tráfico Crítico',
          data: historyData.map(h => h.sim_critical ?? 0),
          borderColor: '#000000',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        }
      ],
    };
  }, [historyData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 10, font: { size: 11, weight: '600' } }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
    }
  };

  // Acción del botón manual
  const handleManualRefresh = () => {
    console.log('⚡ [AlarmsView] Botón presionado. Forzando refresco de datos manual bypass-cache...');
    if (typeof refresh === 'function') refresh();
  };

  if (loading && !realStats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500 font-medium">Cargando analítica y serie temporal...</p>
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
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400 text-blue-700 text-xs font-bold uppercase tracking-wider rounded shadow-sm transition-all duration-150 cursor-pointer"
          >
            <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>

          {realStats?.timestamp && (
            <div className="text-right text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 italic flex flex-col shadow-inner">
              <span className="font-bold text-gray-600 uppercase mb-0.5 tracking-wider">Última captura</span>
              <span>{new Date(realStats.timestamp).toLocaleString('es-ES')}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Instalaciones Offline', value: realStats?.disconnected_device, color: 'border-red-700', text: 'text-red-700' },
          { label: 'Controles Offline', value: realStats?.disconnected_control, color: 'border-red-500', text: 'text-red-500' },
          { label: 'Fallo Parámetros', value: realStats?.parameters, color: 'border-orange-500', text: 'text-orange-600' },
          { label: 'SIM Tráfico Alto', value: realStats?.sim_high, color: 'border-yellow-500', text: 'text-yellow-600' },
          { label: 'SIM Tráfico Crítico', value: realStats?.sim_critical, color: 'border-black', text: 'text-black' }
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-white p-5 rounded shadow-sm border-l-4 ${kpi.color} hover:shadow-md transition-all duration-200`}>
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
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-widest">Evolución Temporal (Muestras cada 10 min)</h3>
          </div>
          {loading && (
            <span className="text-xs text-blue-500 font-semibold animate-pulse flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Loader2 size={12} className="animate-spin" /> Actualizando gráfico...
            </span>
          )}
        </div>
        <div className="h-[380px] w-full">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-sm border border-dashed border-gray-200 rounded">
              Esperando inicialización de la línea temporal...
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AlarmsView;