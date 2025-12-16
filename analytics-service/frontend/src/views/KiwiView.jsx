import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getConsistentColor, COLORS } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'; // Necesitarás estos iconos

const KiwiView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS PARA FILTROS Y PAGINACIÓN ---
  const [selectedSoftware, setSelectedSoftware] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Por defecto 10

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getKiwi(1, 10000); 
        setRawData(res || []);
      } catch (error) {
        console.error("Error cargando Kiwi:", error);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // --- 1. LÓGICA DE FILTRADO COMBINADO (Dropdown + Buscador) ---
  const filteredData = useMemo(() => {
    let data = rawData;

    // A. Filtro por Dropdown (Software)
    if (selectedSoftware !== "Todos") {
      data = data.filter(d => d.model === selectedSoftware);
    }

    // B. Filtro por Buscador (Texto)
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(d => 
        (d.uuid && d.uuid.toLowerCase().includes(lowerTerm)) ||
        (d.ssid && d.ssid.toLowerCase().includes(lowerTerm)) ||
        (d.model && d.model.toLowerCase().includes(lowerTerm))
      );
    }

    return data;
  }, [rawData, selectedSoftware, searchTerm]);

  // --- RESETEAR PÁGINA AL FILTRAR ---
  // Si cambias el filtro o buscas algo, vuelves a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSoftware, searchTerm, rowsPerPage]);

  // --- 2. LÓGICA DE PAGINACIÓN (Slicing) ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  // Calculamos los índices para cortar el array
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- KPIs y GRÁFICAS (Usan filteredData para reflejar la búsqueda global) ---
  const totalDevices = filteredData.length;
  const onlineDevices = filteredData.filter(d => d.status_clean === 'Conectado').length;
  const onlinePct = totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(1) : 0;

  // Stats Gráficas
  const softwareStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const m = curr.model || "Desconocido"; 
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const statusStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const s = curr.status_clean || "Desconocido";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const uniqueSoftware = [...new Set(rawData.map(d => d.model))].sort();

  // --- COMPONENTE LEYENDA ---
  const LegendBox = ({ data, title }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full w-full overflow-hidden flex flex-col">
      <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">{title}</h5>
      <div className="overflow-y-auto flex-grow pr-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0 hover:bg-gray-100 px-2 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-3 h-3 min-w-[12px] rounded-full" style={{ backgroundColor: getConsistentColor(idx) }}></div>
              <span className="truncate text-gray-700" title={item.name}>{item.name}</span>
            </div>
            <span className="font-bold text-blue-800 ml-2">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-none animate-fade-in pb-10">
      
      {/* 1. HEADER & FILTROS SUPERIORES */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center w-full">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">🥝 Dispositivos Kiwi</h2>
          <p className="text-sm text-gray-500">Gestión de versiones y conectividad</p>
        </div>
        
        <div className="mt-4 md:mt-0 w-full md:w-64">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Filtrar por Software</label>
          <select 
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
            value={selectedSoftware}
            onChange={(e) => setSelectedSoftware(e.target.value)}
          >
            <option value="Todos">Todos los Softwares</option>
            {uniqueSoftware.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 2. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Dispositivos Filtrados</span>
          <span className="text-4xl font-bold text-blue-900 mt-2">{totalDevices}</span>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Conectados (Online)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-bold text-green-700">{onlineDevices}</span>
            <span className="text-sm text-green-600 font-medium">({onlinePct}%)</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500 flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-bold uppercase">Variedad de Software</span>
          <span className="text-4xl font-bold text-purple-900 mt-2">{uniqueSoftware.length}</span>
        </div>
      </div>

      {/* 3. GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Distribución por Versión</h3>
          <div className="h-96 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={softwareStats} layout="horizontal" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-15} textAnchor="end" height={60}/>
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} wrapperStyle={{ outline: 'none' }} />
                <Bar dataKey="value" name="Dispositivos" radius={[4, 4, 0, 0]}>
                  {softwareStats.map((entry, index) => <Cell key={`cell-${index}`} fill={getConsistentColor(index)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-full min-h-[500px]">
          <h3 className="text-lg font-bold text-gray-700 mb-2">Estado Actual</h3>
          <div className="h-64 w-full flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusStats} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Conectado' ? '#10b981' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex-grow w-full overflow-hidden">
             <LegendBox data={softwareStats} title="Versiones Detectadas" />
          </div>
        </div>
      </div>

      {/* 4. TABLA DE DETALLES CON CONTROLES */}
      <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
        
        {/* BARRA DE HERRAMIENTAS DE TABLA */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
          
          {/* Buscador */}
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por UUID, SSID, Modelo..."
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

        {/* TABLA (Pasamos los items de la página actual) */}
        <TableCard 
          title="" // Título vacío porque ya tenemos la barra arriba
          data={currentItems}
          columns={[
            { header: "UUID", accessor: "uuid", render: (row) => <span className="font-mono text-xs text-gray-600">{row.uuid}</span> },
            { header: "SSID", accessor: "ssid", render: (row) => <span className="font-bold text-gray-800">{row.ssid}</span> },
            { header: "Software / Modelo", accessor: "model" },
            { header: "Estado", accessor: "status_clean", render: (row) => (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                row.status_clean === 'Conectado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {row.status_clean}
              </span>
            )},
            { header: "Versión ID", accessor: "version_uuid", render: (row) => <span className="font-mono text-xs text-gray-400">{row.version_uuid?.substring(0,8)}...</span> }
          ]}
          loading={loading}
          page={currentPage} 
          setPage={setCurrentPage} 
          limit={rowsPerPage} 
          hasMore={false} 
        />

        {/* CONTROLES DE PAGINACIÓN (Footer) */}
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
            
            {/* Indicador de página simple */}
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

export default KiwiView;