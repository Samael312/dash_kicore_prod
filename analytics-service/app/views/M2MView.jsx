import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Activity, Globe, Wifi, AlertTriangle, Filter, Search } from 'lucide-react';

// Colores profesionales para las gráficas
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const M2MView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgFilter, setOrgFilter] = useState(""); 
  const [appliedFilter, setAppliedFilter] = useState("");

  // Función para obtener datos
  const fetchAnalytics = async (org = "") => {
    setLoading(true);
    try {
      // Ajusta la URL a tu servidor local o de producción
      let url = `http://localhost:8000/internal/dashboard/m2m/analytics`;
      if (org) url += `?organization=${encodeURIComponent(org)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Error en la petición");
      const jsonData = await response.json();
      setData(jsonData);
      setAppliedFilter(org);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAnalytics(orgFilter);
  };

  if (loading && !data) return <div className="flex h-screen items-center justify-center text-blue-600">Cargando datos...</div>;
  if (!data) return <div className="p-10 text-center">No hay datos disponibles</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* --- HEADER & FILTER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard M2M</h1>
            {appliedFilter && <p className="text-sm text-blue-600 font-medium">Filtrando por: {appliedFilter}</p>}
        </div>
        
        <form onSubmit={handleFilterSubmit} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filtrar por Organización..." 
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium flex items-center gap-2"
          >
            <Filter size={16}/> Aplicar
          </button>
          {appliedFilter && (
            <button 
                type="button"
                onClick={() => { setOrgFilter(""); fetchAnalytics(""); }}
                className="bg-white text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
                Limpiar
            </button>
          )}
        </form>
      </div>

      {/* --- KPI PRINCIPAL --- */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Total Dispositivos</p>
            <h2 className="text-4xl font-bold text-slate-800 mt-1">{data.total_count}</h2>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <Wifi className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* --- GRÁFICAS DE TARTA (PIE CHARTS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 1. Estado */}
        <ChartCard title="Estado M2M">
          <GenericPieChart data={data.status_dist} />
        </ChartCard>

        {/* 2. Tarifa */}
        <ChartCard title="Tipo de Tarifa">
          <GenericPieChart data={data.rate_dist} />
        </ChartCard>

        {/* 3. Países */}
        <ChartCard title="Distribución por País">
          <GenericPieChart data={data.country_dist} />
        </ChartCard>
      </div>

      {/* --- ALARMAS Y CONSUMO --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        
        {/* Desglose de Alarmas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 border-b pb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-slate-700 text-lg">Desglose de Alarmas</h3>
          </div>
          <div className="h-64">
            {data.alarms_breakdown && data.alarms_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.alarms_breakdown} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{fill: 'transparent'}}
                  />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20}>
                    {/* Opcional: Labels al final de la barra */}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle size={48} className="opacity-20 mb-2" />
                <p>No se detectaron alarmas activas</p>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas de Consumo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 border-b pb-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-700 text-lg">Estadísticas de Consumo</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <ConsumptionBox 
              title="Diario (MB)" 
              stats={data.consumption.daily} 
              colorClass="text-emerald-600"
            />
            <ConsumptionBox 
              title="Mensual (MB)" 
              stats={data.consumption.monthly} 
              colorClass="text-violet-600"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// --- COMPONENTES REUTILIZABLES ---

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
    <h3 className="font-bold text-slate-700 mb-4 text-center border-b pb-2">{title}</h3>
    <div className="h-64 w-full relative">
      {children}
    </div>
  </div>
);

const GenericPieChart = ({ data }) => {
  if (!data || data.length === 0) return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos</div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
        />
        <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-slate-600 text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const ConsumptionBox = ({ title, stats, colorClass }) => (
  <div className="bg-slate-50 p-5 rounded-xl">
    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 text-center">{title}</h4>
    <div className="space-y-3">
      <StatRow label="Mínimo" value={stats.min} unit="MB" />
      <StatRow label="Promedio" value={stats.mean} unit="MB" isBold color={colorClass} />
      <StatRow label="Máximo" value={stats.max} unit="MB" />
    </div>
  </div>
);

const StatRow = ({ label, value, unit, isBold = false, color = "text-slate-800" }) => (
  <div className="flex justify-between items-end border-b border-slate-200 pb-1 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`font-mono ${isBold ? 'text-lg font-bold' : 'text-sm font-medium'} ${color}`}>
      {value.toFixed(2)} <span className="text-xs text-slate-400 font-normal">{unit}</span>
    </span>
  </div>
);

export default M2MView;