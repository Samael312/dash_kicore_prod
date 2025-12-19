import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api'; 
import { 
  AlertCircle, CheckCircle, Clock, Server, Loader2, Calendar, 
  MousePointerClick, ChevronRight, ChevronLeft, ChevronDown, 
  Monitor, Search, FileSpreadsheet 
} from 'lucide-react';

// --- CHART.JS IMPORTS ---
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// --- REGISTRO ---
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- COLORES ---
const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#6366F1', '#EC4899'];

// --- COMPONENTE KPI CARD ---
const KPICard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4">
    <div className={`p-4 rounded-full text-white shadow-sm ${color}`}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// --- COMPONENTE LEGEND BOX (Timeline Detalle) ---
const LegendBox = ({ data, title, subtitle }) => {
  const [expandedDay, setExpandedDay] = useState(null);

  const toggleDay = (date) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col overflow-hidden max-h-[320px] lg:max-h-[380px]">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
          <Calendar size={16} className="text-blue-500"/>
          {title}
        </h4>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      
      <div className="overflow-y-auto flex-grow p-2">
        {(!data || data.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-sm p-4 text-center">
            <MousePointerClick size={32} className="mb-2 opacity-50"/>
            <p>Selecciona un punto en el gráfico de línea</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.map((dayGroup, idx) => {
              const isExpanded = expandedDay === dayGroup.date;
              return (
                <div key={idx} className="border border-gray-100 rounded bg-white overflow-hidden transition-all">
                  <div 
                    onClick={() => toggleDay(dayGroup.date)}
                    className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={14} className="text-blue-500"/> : <ChevronRight size={14} className="text-gray-400"/>}
                      <span className="text-gray-700 font-bold text-xs">{dayGroup.date}</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${isExpanded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {dayGroup.count} disp.
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-blue-100 p-2 space-y-1">
                      {dayGroup.devices.map((device, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-2 pl-4 py-1 text-xs text-gray-600 border-l-2 border-blue-200 ml-1">
                          <Monitor size={12} className="text-gray-400"/>
                          <span className="truncate" title={device.uuid}>
                            {device.name || "Sin Nombre"}
                            <span className="text-gray-400 ml-1 opacity-75">({device.real_model_name})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const RenewalsDashboard = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Timeline
  const [selectedMonthData, setSelectedMonthData] = useState(null);

  // Estados para Tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 1. CARGA DE DATOS
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getRenewals(1, 10000); 
        const dataToSet = Array.isArray(res) ? res : (res?.items || []);
        setRawData(dataToSet);
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // 2. PROCESAMIENTO DE DATOS (KPIs, Charts, Timeline)
  const { kpis, pieChartData, barChartData, lineChartData } = useMemo(() => {
    if (!rawData || rawData.length === 0) return { kpis: null };

    const today = new Date();
    let totalDevices = 0, expired = 0, expiringSoon = 0, active = 0;

    const stateCount = {};
    const modelCount = {};
    const renewalsTimeline = {}; 

    rawData.forEach(device => {
      totalDevices++;
      
      // --- CORRECCIÓN DE ERROR AQUÍ ---
      const currentState = device.ki_subscription_state || 'Sin Suscripción';
      stateCount[currentState] = (stateCount[currentState] || 0) + 1;

      const model = device.real_model_name || device.model || 'Desconocido';
      modelCount[model] = (modelCount[model] || 0) + 1;

      // Timeline Logic & KPIs
      if (device.date_to_renew) {
        const renewDate = new Date(device.date_to_renew);
        if (!isNaN(renewDate)) {
            const diffTime = renewDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) expired++;
            else if (diffDays <= 30) expiringSoon++;
            else active++;

            // Agrupar por Mes (YYYY-MM)
            const monthKey = renewDate.toISOString().slice(0, 7); 
            
            if (!renewalsTimeline[monthKey]) {
                renewalsTimeline[monthKey] = { count: 0, items: [] };
            }

            renewalsTimeline[monthKey].count += 1;
            renewalsTimeline[monthKey].items.push({
                date: device.date_to_renew, // "2025-11-10"
                name: device.name,
                uuid: device.uuid,
                real_model_name: device.real_model_name || device.model
            });

        } else { active++; }
      } else { active++; }
    });

    // Chart Data Preparation
    const pieLabels = Object.keys(stateCount);
    const pieChartData = {
      labels: pieLabels,
      datasets: [{
        data: Object.values(stateCount),
        backgroundColor: pieLabels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 1,
      }]
    };

    const sortedModels = Object.entries(modelCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const barChartData = {
      labels: sortedModels.map(item => item[0]),
      datasets: [{
        label: 'Cantidad',
        data: sortedModels.map(item => item[1]),
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      }]
    };

    const sortedDates = Object.keys(renewalsTimeline).sort();
    const lineChartData = {
      labels: sortedDates,
      datasets: [{
        label: 'Vencimientos',
        data: sortedDates.map(d => renewalsTimeline[d].count),
        extraData: sortedDates.map(d => renewalsTimeline[d].items), // Guardamos items para el click
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 9,
      }]
    };

    return { kpis: { totalDevices, expired, expiringSoon, active }, pieChartData, barChartData, lineChartData };
  }, [rawData]);

  // 3. LOGICA TABLA (Filtrado y Paginación)
  const filteredItems = useMemo(() => {
    return rawData.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        (item.name?.toLowerCase() || '').includes(term) ||
        (item.uuid?.toLowerCase() || '').includes(term) ||
        (item.real_model_name?.toLowerCase() || '').includes(term) ||
        (item.ki_subscription_state?.toLowerCase() || '').includes(term)
      );
    });
  }, [rawData, searchTerm]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * rowsPerPage;
    const indexOfFirstItem = indexOfLastItem - rowsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredItems, currentPage, rowsPerPage]);

  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;

  // --- HELPERS ---
  
  // Click en Timeline
  const handleSelection = (index) => {
    if (!lineChartData || !lineChartData.labels[index]) return;
    const monthLabel = lineChartData.labels[index];
    const itemsArray = lineChartData.datasets[0].extraData[index]; 
    
    // Agrupar por día
    const groups = {};
    itemsArray.forEach(item => {
        if (!groups[item.date]) groups[item.date] = { date: item.date, count: 0, devices: [] };
        groups[item.date].count += 1;
        groups[item.date].devices.push(item);
    });
    const stats = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));

    setSelectedMonthData({
      title: `Vencimientos: ${monthLabel}`,
      subtitle: `${itemsArray.length} dispositivos en total`,
      data: stats
    });
  };

  // Badge Status para Tabla
  const getStatusBadge = (dateStr) => {
    if (!dateStr) return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">INDEFINIDO</span>;
    const today = new Date();
    const renewDate = new Date(dateStr);
    const diffDays = Math.ceil((renewDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold w-fit flex items-center"><AlertCircle size={12} className="mr-1"/> VENCIDO</span>;
    if (diffDays <= 30) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold w-fit flex items-center"><Clock size={12} className="mr-1"/> POR VENCER</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold w-fit flex items-center"><CheckCircle size={12} className="mr-1"/> ACTIVO</span>;
  };


  // Inicializar Timeline con el ultimo mes
  useEffect(() => {
    if (lineChartData && lineChartData.labels.length > 0 && !selectedMonthData) {
        handleSelection(lineChartData.labels.length - 1);
    }
  }, [lineChartData]); 

  // --- CHART OPTIONS ---
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  const lineOptions = {
    ...commonOptions,
    onClick: (event, elements) => { if (elements.length > 0) handleSelection(elements[0].index); },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
  };

 // --- RENDERIZADO ---
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-500">
          <Loader2 className="animate-spin mb-2" size={48} />
          <p>Cargando datos...</p>
        </div>
      );
    }
  if (!kpis) return <div className="p-10 text-center">No hay datos disponibles.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen animate-fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">📊 Dashboard de Renovaciones</h2>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Dispositivos" value={kpis.totalDevices} icon={<Server />} color="bg-blue-500" />
        <KPICard title="Licencias Activas" value={kpis.active} icon={<CheckCircle />} color="bg-green-500" />
        <KPICard title="Por Vencer (30 días)" value={kpis.expiringSoon} icon={<Clock />} color="bg-yellow-500" />
        <KPICard title="Vencidas" value={kpis.expired} icon={<AlertCircle />} color="bg-red-500" />
      </div>

      {/* PIE & BAR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-700">Estado de Producción</h3>
          <div className="h-72 relative"><Pie data={pieChartData} options={{...commonOptions, plugins: {legend: {position: 'right'}}}} /></div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-700">Distribución por Modelo</h3>
          <div className="h-72 relative"><Bar data={barChartData} options={{...commonOptions, indexAxis: 'y', plugins: {legend: {display: false}}}} /></div>
        </div>
      </div>

      {/* TIMELINE + LEGEND BOX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        <div className="lg:col-span-8 bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-700">Próximos Vencimientos (Mes a Mes)</h3>
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">Haz clic para ver detalles</span>
          </div>
          <div className="h-80 relative flex-grow"><Line data={lineChartData} options={lineOptions} /></div>
        </div>
        <div className="lg:col-span-4 h-full min-h-[350px]">
             <LegendBox 
                title={selectedMonthData ? selectedMonthData.title : "Selecciona un mes"} 
                subtitle={selectedMonthData ? selectedMonthData.subtitle : ""}
                data={selectedMonthData ? selectedMonthData.data : []} 
             />
        </div>
      </div>

      {/* TABLA DETALLADA */}
      <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <h3 className="text-lg font-bold text-gray-800">Listado Detallado</h3>
        </div>
        
        {/* FILTROS TABLA */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
           <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-400" /></div>
            <input
              type="text" placeholder="Buscar por UUID, Nombre..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="border border-gray-300 rounded-md py-1 px-2 text-sm" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={5}>5 por pág</option>
              <option value={10}>10 por pág</option>
              <option value={50}>50 por pág</option>
          </select>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID / Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suscripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Renovación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((row, idx) => (
                  <tr key={row.uuid || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="text-xs font-mono text-gray-500">{row.uuid}</div>
                       <div className="font-semibold text-gray-700">{row.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.real_model_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.ki_subscription_state}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.date_to_renew || 'N/A'}</td>
                    <td className="px-6 py-4">{getStatusBadge(row.date_to_renew)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">No hay resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACION */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} de {totalItems}</div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm"><ChevronLeft size={16}/> Anterior</button>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded text-sm">{currentPage}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm">Siguiente <ChevronRight size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalsDashboard;