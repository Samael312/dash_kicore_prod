import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { getConsistentColor, COLORS } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// --- CHART.JS IMPORTS ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// --- REGISTRO COMPONENTES CHART.JS ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const M2MView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DE UI ---
  const [selectedOrg, setSelectedOrg] = useState("Todas");
  const [activeTab, setActiveTab] = useState("diario");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); 

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getM2M(1, 10000); 
        setRawData(res || []);
      } catch (error) {
        console.error("Error cargando M2M:", error);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // --- 1. LÓGICA DE FILTRADO ---
  const filteredData = useMemo(() => {
    let data = rawData;

    // A. Filtro por Organización
    if (selectedOrg !== "Todas") {
      data = data.filter(d => d.organization === selectedOrg);
    }

    // B. Filtro por Buscador
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(d => 
        (d.icc && d.icc.toLowerCase().includes(lowerTerm)) ||
        (d.organization && d.organization.toLowerCase().includes(lowerTerm)) ||
        (d.status_clean && d.status_clean.toLowerCase().includes(lowerTerm)) ||
        (d.rate_plan && d.rate_plan.toLowerCase().includes(lowerTerm))
      );
    }

    return data;
  }, [rawData, selectedOrg, searchTerm]);

  // Reiniciar a página 1 si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrg, searchTerm, rowsPerPage]);

  // --- 2. PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- KPIS y HELPERS ---
  const totalSims = filteredData.length;
  const totalAlarms = filteredData.reduce((sum, d) => sum + (d.alarm_count || 0), 0);
  const simsWithAlerts = filteredData.filter(d => (d.alarm_count || 0) > 0).length;

  // Helper para agrupar datos
  const getGroupStats = (field) => {
    const counts = filteredData.reduce((acc, curr) => {
      const k = curr[field] || "N/A";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // --- DATOS PARA GRÁFICAS ---
  const statusStats = getGroupStats("status_clean");
  const networkStats = getGroupStats("network_type");
  const countryStats = getGroupStats("country_code");
  const planStats = getGroupStats("rate_plan");

  const dailyTierStats = getGroupStats("usage_tier_daily");
  const monthlyTierStats = getGroupStats("usage_tier_month");

  const consumptionStats = activeTab === 'diario' ? dailyTierStats : monthlyTierStats;
  const consumptionTotal = activeTab === 'diario' 
    ? filteredData.reduce((s, d) => s + (d.cons_daily_mb||0), 0)
    : filteredData.reduce((s, d) => s + (d.cons_month_mb||0), 0);

  // --- CONFIGURACIÓN CHART.JS ---

  // 1. Configuración Gráfica Estado (Pie)
  const statusChartData = {
    labels: statusStats.map(d => d.name),
    datasets: [{
      data: statusStats.map(d => d.value),
      backgroundColor: statusStats.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 1
    }]
  };

  // 2. Configuración Gráfica Red (Pie)
  const networkChartData = {
    labels: networkStats.map(d => d.name),
    datasets: [{
      data: networkStats.map(d => d.value),
      backgroundColor: networkStats.map((_, i) => COLORS[(i + 2) % COLORS.length]),
      borderWidth: 1
    }]
  };

  // 3. Configuración Países (Pie) - Usamos getConsistentColor
  const countryChartData = {
    labels: countryStats.map(d => d.name),
    datasets: [{
      data: countryStats.map(d => d.value),
      backgroundColor: countryStats.map((_, i) => getConsistentColor(i)),
      borderWidth: 0
    }]
  };

  // 4. Configuración Planes (Pie)
  const planChartData = {
    labels: planStats.map(d => d.name),
    datasets: [{
      data: planStats.map(d => d.value),
      backgroundColor: planStats.map((_, i) => getConsistentColor(i + 5)), // Offset color
      borderWidth: 0
    }]
  };

  // 5. Configuración Consumo (Bar)
  const consumptionChartData = {
    labels: consumptionStats.map(d => d.name),
    datasets: [{
      label: 'SIMs',
      data: consumptionStats.map(d => d.value),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }]
  };

  // Opciones Comunes
  const commonPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
    }
  };

  const hiddenLegendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Ocultamos leyenda porque usamos la CustomBox
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        callbacks: { label: (ctx) => `${ctx.raw} SIMs` } 
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Componente Leyenda Personalizada (Sin cambios lógicos, solo visuales)
  const LegendBox = ({ data, title, colorOffset = 0 }) => (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 h-72 overflow-y-auto w-full custom-scrollbar">
      <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase sticky top-0 bg-gray-50 z-10">{title}</h5>
      {data.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <div 
              className="w-3 h-3 min-w-[12px] rounded-full shadow-sm" 
              style={{ backgroundColor: getConsistentColor(idx + colorOffset) }}
            ></div>
            <span className="truncate text-gray-700" title={item.name}>{item.name}</span>
          </div>
          <span className="font-bold text-blue-800 ml-2">{item.value}</span>
        </div>
      ))}
    </div>
  );

  // --- RENDERIZADO ---
   if (loading) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-500">
         <Loader2 className="animate-spin mb-2" size={48} />
         <p>Cargando datos...</p>
       </div>
     );
   }

  return (
    <div className="space-y-6 w-full min-w-0 p-1 animate-fade-in pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-2 md:mb-0">📡 Gestión M2M</h2>
        <div className="w-full md:w-64">
           <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
           <select 
             className="border p-2 rounded w-full bg-gray-50 border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
             value={selectedOrg}
             onChange={(e) => setSelectedOrg(e.target.value)}
           >
             <option value="Todas">Todas las Organizaciones</option>
             {[...new Set(rawData.map(d => d.organization))].sort().map(o => <option key={o} value={o}>{o}</option>)}
           </select>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500 w-full">
          <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Total SIMs</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{totalSims}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500 w-full">
          <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Alarmas Totales</div>
          <div className="text-3xl font-bold text-red-900 mt-1">{totalAlarms}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500 w-full">
          <div className="text-gray-500 text-sm font-semibold uppercase tracking-wide">SIMs con Alertas</div>
          <div className="text-3xl font-bold text-orange-900 mt-1">{simsWithAlerts}</div>
        </div>
      </div>

      {/* GRÁFICAS SUPERIORES (Estado y Red) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-4 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">🟢 Estado</h3>
          <div className="h-72 w-full relative">
            <Pie data={statusChartData} options={commonPieOptions} />
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">📡 Tipo de Red</h3>
          <div className="h-72 w-full relative">
            <Pie data={networkChartData} options={commonPieOptions} />
          </div>
        </div>
      </div>

      {/* GRÁFICAS COMPLEJAS (País y Planes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        {/* Países */}
        <div className="bg-white p-4 rounded shadow border border-gray-200 w-full">
          <h3 className="font-bold text-gray-700 mb-4">🌍 Distribución Geográfica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
            <div className="sm:col-span-2 h-72 w-full relative">
              <Pie data={countryChartData} options={hiddenLegendOptions} />
            </div>
            <div className="sm:col-span-1 w-full">
              <LegendBox data={countryStats} title="Por País" colorOffset={0} />
            </div>
          </div>
        </div>

        {/* Planes */}
        <div className="bg-white p-4 rounded shadow border border-gray-200 w-full">
          <h3 className="font-bold text-gray-700 mb-4">💳 Planes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
            <div className="sm:col-span-2 h-72 w-full relative">
              <Pie data={planChartData} options={hiddenLegendOptions} />
            </div>
            <div className="sm:col-span-1 w-full">
              <LegendBox data={planStats} title="Planes" colorOffset={5} />
            </div>
          </div>
        </div>
      </div>

      {/* CONSUMO */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
        <h3 className="text-xl font-bold text-blue-900 mb-4">📊 Análisis de Consumo</h3>
        
        <div className="flex space-x-4 border-b border-gray-200 mb-4 overflow-x-auto">
          <button 
            className={`pb-2 px-4 whitespace-nowrap font-medium transition-colors ${activeTab === 'diario' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
            onClick={() => setActiveTab('diario')}
          >
            📅 Diario
          </button>
          <button 
            className={`pb-2 px-4 whitespace-nowrap font-medium transition-colors ${activeTab === 'mensual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
            onClick={() => setActiveTab('mensual')}
          >
            🗓️ Mensual
          </button>
        </div>

        <div className="w-full">
          <div className="bg-blue-50 p-3 rounded text-blue-900 font-bold mb-4 inline-block border border-blue-100">
             Tráfico Total: {(consumptionTotal / 1024).toFixed(2)} GB
          </div>
          <div className="h-72 w-full relative">
            <Bar data={consumptionChartData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* TABLA CON PAGINACIÓN Y FILTROS */}
      <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
        
        {/* BARRA DE HERRAMIENTAS */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
           {/* Buscador */}
           <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por ICCID, Estado, Plan..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Selector de Filas */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Mostrar:</span>
            <select
              className="border border-gray-300 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* TABLA */}
        <TableCard 
          title="Listado M2M Completo"
          data={currentItems} 
          columns={[
            { header: "ICCID", accessor: "icc", render: (r) => <span className="font-mono text-xs text-gray-600">{r.icc}</span> },
            { header: "Estado", accessor: "status_clean", render: (r) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  r.status_clean === 'Active' || r.status_clean === 'Conectado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {r.status_clean}
                </span>
            )},
            { header: "Org", accessor: "organization" },
            { header: "País", accessor: "country_code" },
            { header: "Plan", accessor: "rate_plan" },
            { header: "Mes (MB)", accessor: "cons_month_mb", render: r => r.cons_month_mb?.toFixed(2) },
          ]}
          loading={loading}
          page={currentPage}
          setPage={setCurrentPage}
          limit={rowsPerPage}
          hasMore={false}
        />

        {/* FOOTER PAGINACIÓN */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> a <span className="font-bold">{Math.min(indexOfLastItem, totalItems)}</span> de <span className="font-bold">{totalItems}</span> resultados
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalItems === 0}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft size={16} className="mr-1" /> Anterior
            </button>
            
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded border border-blue-200">
              {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalItems === 0}
              className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Siguiente <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default M2MView;