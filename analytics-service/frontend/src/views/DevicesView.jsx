import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getConsistentColor, COLORS } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const DevicesView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros y Paginación
  const [selectedModel, setSelectedModel] = useState("Todos");
  const [selectedOrg, setSelectedOrg] = useState("Todas");
  const [drilldownModel, setDrilldownModel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); 

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getDevices(1, 10000); 
        setRawData(res || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  // --- LÓGICA DE FILTRADO ---
  const isKiwi = useMemo(() => rawData.some(d => d.ssid), [rawData]);

  const filteredData = useMemo(() => {
    let data = rawData;
    
    // 1. Filtros de Dropdown
    if (isKiwi) {
      if (selectedModel !== "Todos") data = data.filter(d => d.model === selectedModel);
    } else {
      if (selectedOrg !== "Todas") data = data.filter(d => d.organization === selectedOrg);
      if (selectedModel !== "Todos") data = data.filter(d => d.model === selectedModel);
    }
    
    // 2. Filtro Gráfico (Click)
    if (drilldownModel) data = data.filter(d => d.model === drilldownModel);

    // 3. Buscador de Texto
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(d => 
        (d.uuid && d.uuid.toLowerCase().includes(lowerTerm)) ||
        (d.name && d.name.toLowerCase().includes(lowerTerm)) || // Añadido name
        (d.ssid && d.ssid.toLowerCase().includes(lowerTerm)) ||
        (d.model && d.model.toLowerCase().includes(lowerTerm))
      );
    }
    return data;
  }, [rawData, selectedModel, selectedOrg, drilldownModel, isKiwi, searchTerm]);

  // Reiniciar página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModel, selectedOrg, drilldownModel, searchTerm, rowsPerPage]);

  // --- LÓGICA DE PAGINACIÓN (Slicing) ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- AGREGACIONES ---
  const modelStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const m = curr.model || "Desconocido";
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const getPieStats = (field) => {
    const counts = filteredData.reduce((acc, curr) => {
      const k = curr[field] || "Desconocido";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const statusData = getPieStats('status_clean');
  const enabledData = getPieStats('enabled_clean');

  const uniqueModels = [...new Set(rawData.map(d => d.model))].sort();
  const uniqueOrgs = [...new Set(rawData.map(d => d.organization))].sort();

  const handleBarClick = (data) => {
    if (data && data.activePayload) {
      setDrilldownModel(data.activePayload[0].payload.name);
    }
  };

  // --- LEYENDA ---
  const renderLegend = (data, title) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-full w-full overflow-hidden flex flex-col">
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 pb-2 border-b flex-shrink-0">{title}</h4>
      <div className="overflow-y-auto flex-grow pr-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center py-2 border-b border-gray-100 hover:bg-gray-100 transition-colors text-sm">
            <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: getConsistentColor(idx) }}></div>
            <span className="flex-grow text-gray-700 font-medium truncate mr-2" title={item.name}>{item.name}</span>
            <span className="font-bold text-blue-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-none animate-fade-in pb-10">
      
      {/* 1. HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">🏭 Inventario de Dispositivos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {!isKiwi && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">🏢 Organización</label>
              <select 
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
                value={selectedOrg}
                onChange={(e) => { setSelectedOrg(e.target.value); setDrilldownModel(null); }}
              >
                <option value="Todas">Todas</option>
                {uniqueOrgs.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">📦 Modelo</label>
            <select 
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedModel}
              onChange={(e) => { setSelectedModel(e.target.value); setDrilldownModel(null); }}
            >
              <option value="Todos">Todos</option>
              {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {drilldownModel && (
            <div className="flex items-end w-full">
              <button 
                onClick={() => setDrilldownModel(null)}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar Filtro Activo: {drilldownModel} ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. ZONA SUPERIOR: BARRAS + LISTA */}
      <div className="grid grid-cols-12 gap-6 w-full">
        <div className="col-span-12 lg:col-span-9 bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Distribución por Modelo</h3>
          <div className="h-96 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelStats} onClick={handleBarClick} className="cursor-pointer" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip cursor={{fill: '#f0f0f0'}} wrapperStyle={{ outline: 'none' }} />
                <Bar dataKey="value" name="Dispositivos" radius={[4, 4, 0, 0]}>
                  {modelStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getConsistentColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-gray-400 mt-2">Haz clic en las barras para filtrar</p>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-white p-4 rounded shadow border border-gray-200 w-full h-full min-h-[400px]">
           {renderLegend(modelStats, "Modelos Visibles")}
        </div>
      </div>

      {/* 3. ZONA MEDIA: TARTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Conectividad</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={80} outerRadius={100} dataKey="value" paddingAngle={5}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Conectado' ? '#00CC96' : '#EF553B'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Operatividad</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={enabledData} innerRadius={80} outerRadius={100} dataKey="value" paddingAngle={5}>
                   {enabledData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Habilitado' ? '#636EFA' : '#AB63FA'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. TABLA DETALLADA CON CONTROLES */}
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
              placeholder="Buscar por UUID, Nombre, Modelo..."
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
          title=""
          data={currentItems}
          columns={[
            { header: "ID / UUID", accessor: "uuid", render: (r) => <span className="font-mono text-xs text-gray-600">{r.uuid}</span> },
            { header: "Nombre", accessor: "name", render: (r) => <span className="font-semibold text-gray-700">{r.name || '-'}</span> },
            { header: "Modelo", accessor: "model" },
            { header: "Organización", accessor: "organization" },
            { header: "Estado", accessor: "status_clean", render: (row) => (
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${row.status_clean === 'Conectado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {row.status_clean}
               </span>
            )},
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

export default DevicesView;