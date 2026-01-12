import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { api } from '../services/api';
import { 
  Layers, Activity, Search, Filter, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';

// --- AGREGADO: Imports para Chart.js (Gráfica de línea histórica) ---
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
  Filler
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler
);

const PoolView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState('ALL');

  // --- AGREGADO: Estados faltantes ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [timeRange, setTimeRange] = useState('semanal');
  const [historyData, setHistoryData] = useState({ labels: [], datasets: [] });

  // --- FETCH DE DATOS ---
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
    try {
      const res = await api.getPool(1, 10000);
      setData(res || []);
    } catch (error) {
        console.error('Error fetching pools:', error);
    }
        setLoading(false);  
      };
    fetch();
    }, []);

  // --- HELPERS ---
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // --- FILTRADO Y CÁLCULOS ---
  const uniqueOrgs = useMemo(() => {
    const orgs = [...new Set(data.map(item => item.commercialGroup))];
    return orgs.filter(o => o).sort(); 
  }, [data]);

  // --- MODIFICADO: Filtrado incluye searchTerm ---
  const filteredData = useMemo(() => {
    let res = data;

    // Filtro por Organización
    if (selectedOrg !== 'ALL') {
      res = res.filter(item => item.commercialGroup === selectedOrg);
    }

    // Filtro por Buscador (Pool ID o Grupo)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      res = res.filter(item => 
        (item.pool_id && item.pool_id.toLowerCase().includes(lowerTerm)) ||
        (item.commercialGroup && item.commercialGroup.toLowerCase().includes(lowerTerm))
      );
    }
    
    return res;
  }, [data, selectedOrg, searchTerm]);

  // Resetear página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrg, searchTerm]);

  // --- 2. PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  
  // --- 3. GENERACIÓN DE DATOS HISTÓRICOS (MOCK) ---
  useEffect(() => {
    if (loading) return;

    const currentTotalGB = filteredData.reduce((acc, item) => acc + (item.bytes_consumed || 0), 0) / (1024**3);
    
    let labels = [];
    let dataPoints = [];

    if (timeRange === 'mensual') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      dataPoints = labels.map((_, i) => {
        const factor = 0.5 + (0.1 * i); 
        return (currentTotalGB * factor * (0.9 + Math.random() * 0.2)).toFixed(2);
      });
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      dataPoints = labels.map((_, i) => {
        const factor = 0.8 + (0.05 * i); 
        return (currentTotalGB * factor * (0.95 + Math.random() * 0.1)).toFixed(2);
      });
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
        }
      ]
    });

  }, [filteredData, timeRange, loading]);

  // --- AGREGADO: Opciones para la gráfica de línea ---
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  // Cálculos de KPI globales
  const stats = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      totalSims: acc.totalSims + (curr.sims_total || 0),
      activeSims: acc.activeSims + (curr.sims_active || 0),
      consumed: acc.consumed + (curr.bytes_consumed || 0),
      limit: acc.limit + (curr.bytes_limit || 0),
    }), { totalSims: 0, activeSims: 0, consumed: 0, limit: 0 });
  }, [filteredData]);

  // Preparar datos para gráfica de barras
  const chartData = filteredData.map(item => ({
    name: item.commercialGroup, 
    group: item.commercialGroup,
    Consumo: parseFloat((item.bytes_consumed / (1024 ** 3)).toFixed(2)), 
    Limite: parseFloat((item.bytes_limit / (1024 ** 3)).toFixed(2)),    
    percent: item.usage_percent
  })).sort((a,b) => b.Consumo - a.Consumo).slice(0, 20); 

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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* 1. CONTROLES Y FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <Layers className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-700">Monitor de Pools de Datos</h2>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Search size={18} className="text-gray-400"/>
            <select 
                value={selectedOrg} 
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="block w-full md:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
                <option value="ALL">Todas las Organizaciones</option>
                {uniqueOrgs.map(org => (
                    <option key={org} value={org}>{org}</option>
                ))}
            </select>
        </div>
      </div>

      {/* 2. KPIS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-medium">SIMs Totales</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalSims}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500 font-medium">SIMs Activas</p>
            <p className="text-2xl font-bold text-gray-800">{stats.activeSims}</p>
            <p className="text-xs text-green-600 mt-1">
                {stats.totalSims > 0 ? ((stats.activeSims/stats.totalSims)*100).toFixed(1) : 0}% Activación
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
                Espacio libre: {formatBytes(stats.limit - stats.consumed)}
            </p>
        </div>
      </div>

      {/* 3. GRÁFICA DE CONSUMO VS LIMITE */}
      <div className="bg-white p-6 rounded-lg shadow-sm h-[500px]">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Consumo vs Límite (Top Pools - GB)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }} 
              interval={0} 
              angle={-45} 
              textAnchor="end" 
              height={60} 
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [`${value} GB`, name]}
              labelStyle={{ color: '#333' }}
            />
            
            {/* --- CAMBIO AQUÍ: verticalAlign="top" --- */}
            <Legend verticalAlign="top" height={36} />
            
            <Bar dataKey="Consumo" fill="#8884d8" name="Consumo (GB)" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.percent > 90 ? '#ef4444' : '#6366f1'} />
              ))}
            </Bar>
            <Bar dataKey="Limite" fill="#6a6e73" name="Límite (GB)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 3. GRÁFICA: HISTÓRICO (GRANDE) */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-[400px]">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Activity size={18} className="text-blue-500"/> Tendencia de Consumo
            </h3>
            <div className="flex bg-gray-100 rounded p-1">
                <button 
                onClick={() => setTimeRange('semanal')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'semanal' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >Semanal</button>
                <button 
                onClick={() => setTimeRange('mensual')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'mensual' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >Mensual</button>
            </div>
        </div>
        <div className="flex-grow w-full relative">
            <Line options={lineOptions} data={historyData} />
        </div>
      </div>

    {/* 4. TABLA CON FILTROS (TableCard) */}
      <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Barra de Herramientas de Tabla */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
           
           {/* Buscador */}
           <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={16} className="text-gray-400" />
              </div>
              <input
                 type="text"
                 placeholder="Buscar Pool ID o Grupo..."
                 className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="flex gap-4 w-full sm:w-auto">
              {/* Filtro Org */}
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={14} className="text-gray-400" />
                 </div>
                 <select 
                    className="pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                 >
                    <option value="ALL">Todas las Organizaciones</option>
                    {uniqueOrgs.map(o => <option key={o} value={o}>{o}</option>)}
                 </select>
              </div>

              {/* Rows Per Page */}
              <select
                 className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                 value={rowsPerPage}
                 onChange={(e) => setRowsPerPage(Number(e.target.value))}
              >
                 <option value={5}>5 filas</option>
                 <option value={10}>10 filas</option>
                 <option value={20}>20 filas</option>
              </select>
           </div>
        </div>

        {/* Tabla Reutilizable Definida Abajo */}
        <TableCard 
           data={currentItems}
           columns={[
             { header: "Pool ID", accessor: "pool_id", render: (r) => <span className="font-mono font-bold text-blue-700 text-xs">{r.pool_id}</span> },
             { header: "Organización", accessor: "commercialGroup", render: (r) => <span className="text-gray-600 font-medium">{r.commercialGroup}</span> },
             { header: "SIMs Activas", accessor: "sims_active", render: (r) => (
                <div>
                   <span className="font-bold text-green-700">{r.sims_active}</span>
                   <span className="text-gray-400 text-xs mx-1">/</span>
                   <span className="text-gray-500 text-xs">{r.sims_total}</span>
                </div>
             )},
             { header: "Consumo", accessor: "bytes_consumed", render: (r) => (
                <div className="w-32">
                   <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                      <span>{formatBytes(r.bytes_consumed)}</span>
                      <span>{formatBytes(r.bytes_limit)}</span>
                   </div>
                   <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${r.usage_percent > 90 ? 'bg-red-500' : r.usage_percent > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(r.usage_percent, 100)}%` }}
                      ></div>
                   </div>
                </div>
             )},
             { header: "Estado", accessor: "usage_percent", render: (r) => {
                 let color = 'bg-green-100 text-green-800';
                 let label = 'Normal';
                 if (r.usage_percent > 90) { color = 'bg-red-100 text-red-800'; label = 'Crítico'; }
                 else if (r.usage_percent > 75) { color = 'bg-yellow-100 text-yellow-800'; label = 'Alto'; }
                 
                 return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>{label} ({r.usage_percent}%)</span>
             }}
           ]}
        />

        {/* Footer Paginación */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
           <div className="text-sm text-gray-600">
              Mostrando <span className="font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> a <span className="font-bold">{Math.min(indexOfLastItem, totalItems)}</span> de <span className="font-bold">{totalItems}</span>
           </div>
           <div className="flex gap-2">
              <button
                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                 disabled={currentPage === 1 || totalItems === 0}
                 className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm text-gray-600"
              >
                 <ChevronLeft size={16} className="mr-1"/> Anterior
              </button>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200 text-sm">
                 {currentPage}
              </span>
              <button
                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                 disabled={currentPage === totalPages || totalItems === 0}
                 className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 flex items-center text-sm text-gray-600"
              >
                 Siguiente <ChevronRight size={16} className="ml-1"/>
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

// --- AGREGADO: Componente TableCard ---
// Este componente recibe 'data' y 'columns' para renderizar la tabla de forma dinámica
const TableCard = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No hay datos disponibles.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, index) => (
              <th 
                key={index}
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PoolView;