import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getConsistentColor, COLORS } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // --- 1. LÓGICA DE FILTRADO (Org + Búsqueda) ---
  const filteredData = useMemo(() => {
    let data = rawData;

    // A. Filtro por Organización
    if (selectedOrg !== "Todas") {
      data = data.filter(d => d.organization === selectedOrg);
    }

    // B. Filtro por Buscador (Texto)
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(d => 
        (d.iccid && d.iccid.toLowerCase().includes(lowerTerm)) ||
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

  // --- 2. LÓGICA DE PAGINACIÓN (Slicing) ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  // Estos son los items que VERÁ la tabla
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- KPIS y HELPERS (Usan filteredData para ver el total global de la búsqueda) ---
  const totalSims = filteredData.length;
  const totalAlarms = filteredData.reduce((sum, d) => sum + (d.alarm_count || 0), 0);
  const simsWithAlerts = filteredData.filter(d => (d.alarm_count || 0) > 0).length;

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

  const statusStats = getGroupStats("status_clean");
  const networkStats = getGroupStats("network_type");
  const countryStats = getGroupStats("country_code");
  const planStats = getGroupStats("rate_plan");

  const dailyTierStats = getGroupStats("usage_tier_daily");
  const monthlyTierStats = getGroupStats("usage_tier_month");

  const consumptionData = activeTab === 'diario' 
    ? { stats: dailyTierStats, field: 'cons_daily_mb', total: filteredData.reduce((s, d) => s + (d.cons_daily_mb||0), 0) }
    : { stats: monthlyTierStats, field: 'cons_month_mb', total: filteredData.reduce((s, d) => s + (d.cons_month_mb||0), 0) };

  // Componente Leyenda
  const LegendBox = ({ data, title }) => (
    <div className="bg-gray-50 border border-gray-200 rounded p-3 h-72 overflow-y-auto w-full">
      <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase sticky top-0 bg-gray-50">{title}</h5>
      {data.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 min-w-[8px] rounded-full" style={{ backgroundColor: getConsistentColor(idx) }}></div>
            <span className="truncate" title={item.name}>{item.name}</span>
          </div>
          <span className="font-bold text-blue-800 ml-2">{item.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 w-full min-w-0 p-1 animate-fade-in pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-4 rounded shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-2 md:mb-0">📡 Gestión M2M</h2>
        <div className="w-full md:w-64">
           <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
           <select 
             className="border p-2 rounded w-full bg-gray-50 border-gray-300"
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
          <div className="text-gray-500 text-sm">Total SIMs</div>
          <div className="text-3xl font-bold text-blue-900">{totalSims}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500 w-full">
          <div className="text-gray-500 text-sm">Alarmas Totales</div>
          <div className="text-3xl font-bold text-red-900">{totalAlarms}</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500 w-full">
          <div className="text-gray-500 text-sm">SIMs con Alertas</div>
          <div className="text-3xl font-bold text-orange-900">{simsWithAlerts}</div>
        </div>
      </div>

      {/* GRÁFICAS SUPERIORES (Estado y Red) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-4 rounded shadow border w-full flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">🟢 Estado</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusStats} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {statusStats.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow border w-full flex flex-col">
          <h3 className="font-bold text-gray-700 mb-4">📡 Tipo de Red</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={networkStats} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {networkStats.map((entry, index) => <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRÁFICAS COMPLEJAS (País y Planes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-4 rounded shadow border w-full">
          <h3 className="font-bold text-gray-700 mb-4">🌍 Distribución Geográfica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={countryStats} outerRadius={80} dataKey="value">
                    {countryStats.map((entry, index) => <Cell key={index} fill={getConsistentColor(index)} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="sm:col-span-1 w-full">
              <LegendBox data={countryStats} title="Por País" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow border w-full">
          <h3 className="font-bold text-gray-700 mb-4">💳 Planes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planStats} outerRadius={80} dataKey="value">
                      {planStats.map((entry, index) => <Cell key={index} fill={getConsistentColor(index + 5)} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="sm:col-span-1 w-full">
              <LegendBox data={planStats} title="Planes" />
            </div>
          </div>
        </div>
      </div>

      {/* CONSUMO */}
      <div className="bg-white p-6 rounded shadow border w-full">
        <h3 className="text-xl font-bold text-blue-900 mb-4">📊 Análisis de Consumo</h3>
        
        <div className="flex space-x-4 border-b border-gray-200 mb-4 overflow-x-auto">
          <button 
            className={`pb-2 px-4 whitespace-nowrap font-medium ${activeTab === 'diario' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('diario')}
          >
            📅 Diario
          </button>
          <button 
            className={`pb-2 px-4 whitespace-nowrap font-medium ${activeTab === 'mensual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('mensual')}
          >
            🗓️ Mensual
          </button>
        </div>

        <div className="w-full">
          <div className="bg-blue-50 p-3 rounded text-blue-900 font-bold mb-4 inline-block">
             Tráfico Total: {(consumptionData.total / 1024).toFixed(2)} GB
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumptionData.stats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          data={currentItems} // Pasamos solo los items de la página actual
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