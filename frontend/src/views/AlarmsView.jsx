import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bell, 
  Activity
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
  const [realStats, setRealStats] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stats, history] = await Promise.all([
          api.getAlarmStats(),
          api.getAlarmHistory(24) // Últimas 24 muestras
        ]);
        
        if (stats) setRealStats(stats);
        if (history) setHistoryData(history);
      } catch (error) {
        console.error("Error al cargar datos reales:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const labels = historyData.map(h => new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    return {
      labels,
      datasets: [
        {
          label: 'Instalaciones',
          data: historyData.map(h => h.disconnected_device),
          borderColor: '#b91c1c', // red-700
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: 'Controles',
          data: historyData.map(h => h.disconnected_control),
          borderColor: '#ef4444', // red-500
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: 'Parámetros',
          data: historyData.map(h => h.parameters),
          borderColor: '#f97316', // orange-500
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: 'SIM High',
          data: historyData.map(h => h.sim_high),
          borderColor: '#eab308', // yellow-500
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
        },
        {
          label: 'SIM Critical',
          data: historyData.map(h => h.sim_critical),
          borderColor: '#000000', // black
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
        }
      ],
    };
  }, [historyData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          font: { size: 10, weight: 'bold' }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }
      }
    }
  };

  // MOCK DATA PARA LA TABLA (ELIMINADO SEGÚN SOLICITUD)
  // YA NO NECESITAMOS LOS HELPERS DE BADGES DE LA TABLA

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-10">
      {/* HEADER */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Bell className="text-blue-600" /> Analítica de Alarmas
          </h2>
          <p className="text-sm text-gray-500">Estado actual e histórico de incidencias offline.</p>
        </div>
        {realStats?.timestamp && (
          <div className="text-right text-[10px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 italic flex flex-col">
            <span className="font-bold text-gray-600 uppercase mb-1">Última Sincronización</span>
            <span>{new Date(realStats.timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Reales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Instalaciones', value: realStats?.disconnected_device, color: 'border-red-700', text: 'text-red-700' },
          { label: 'Controles', value: realStats?.disconnected_control, color: 'border-red-500', text: 'text-red-500' },
          { label: 'Parámetros', value: realStats?.parameters, color: 'border-orange-500', text: 'text-orange-600' },
          { label: 'SIM High', value: realStats?.sim_high, color: 'border-yellow-500', text: 'text-yellow-600' },
          { label: 'SIM Critical', value: realStats?.sim_critical, color: 'border-black', text: 'text-black' }
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-white p-5 rounded shadow-sm border-l-4 ${kpi.color} hover:shadow-md transition-shadow`}>
            <span className="text-gray-500 text-[10px] font-black uppercase block tracking-wider">{kpi.label}</span>
            <div className={`text-2xl font-black ${kpi.text} mt-1`}>{kpi.value ?? '...'}</div>
          </div>
        ))}
      </div>

      {/* HISTORICAL CHART */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={20} className="text-blue-600" />
          <h3 className="font-bold text-gray-700 uppercase text-sm tracking-widest">Evolución Temporal (Muestras cada 10 min)</h3>
        </div>
        <div className="h-[350px] w-full">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-sm">
              Cargando histórico de datos...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlarmsView;
