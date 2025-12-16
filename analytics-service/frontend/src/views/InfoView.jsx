import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend 
} from 'recharts';
import { getConsistentColor } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const InfoView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA FILTROS Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getInfo(1, 10000); // Traemos todo para procesar en cliente
        setData(res || []);
      } catch (error) {
        console.error("Error cargando Info:", error);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // --- 1. PROCESAMIENTO DE DATOS (Fechas y Estado) ---
  const CUTOFF_DATE = new Date('2025-06-01');

  const processedData = useMemo(() => {
    return data.map(d => {
      let status = "Sin Datos";
      let dateObj = null;
      
      if (d.compilation_date) {
        dateObj = new Date(d.compilation_date);
        // Validamos si la fecha es válida
        if (!isNaN(dateObj.getTime())) {
             status = dateObj >= CUTOFF_DATE ? "Actualizado" : "Desactualizado";
        }
      }
      return { 
        ...d, 
        update_status: status,
        compilation_date_fmt: dateObj ? dateObj.toLocaleDateString() : "N/A"
      };
    });
  }, [data]);

  // --- 2. LÓGICA DE FILTRADO ---
  const filteredData = useMemo(() => {
    let result = processedData;

    // A. Filtro por Versión (Dropdown)
    if (selectedVersion !== "Todas") {
      result = result.filter(d => d.quiiotd_version === selectedVersion);
    }

    // B. Filtro por Buscador (Texto)
    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(d => 
        (d.uuid && d.uuid.toLowerCase().includes(lowerTerm)) ||
        (d.quiiotd_version && d.quiiotd_version.toLowerCase().includes(lowerTerm)) ||
        (d.update_status && d.update_status.toLowerCase().includes(lowerTerm))
      );
    }
    return result;
  }, [processedData, selectedVersion, searchTerm]);

  // Reiniciar página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVersion, searchTerm, rowsPerPage]);

  // --- 3. PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // --- 4. AGREGACIONES PARA GRÁFICAS ---
  
  // Stats para Gráfica de Barras (Versiones)
  const versionStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const v = curr.quiiotd_version || "N/A";
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredData]);

  // Stats para Gráfica de Tarta (Actualizados vs Desactualizados)
  const updateStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const s = curr.update_status;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Listas para dropdowns
  const uniqueVersions = [...new Set(processedData.map(d => d.quiiotd_version || "N/A"))].sort();

  // --- KPIs ---
  const updatedCount = filteredData.filter(d => d.update_status === "Actualizado").length;
  const updatedPct = totalItems ? ((updatedCount / totalItems) * 100).toFixed(1) : 0;
  const modeVersion = versionStats.length > 0 ? versionStats[0].name : "N/A";

  // Colores para el Pie Chart
  const STATUS_COLORS = {
    "Actualizado": "#10b981",    // Verde
    "Desactualizado": "#ef4444", // Rojo
    "Sin Datos": "#9ca3af"       // Gris
  };

  const KpiBox = ({ title, value }) => (
    <div className="bg-white p-6 rounded shadow border-l-4 border-blue-600 flex flex-col items-center w-full">
       <span className="text-gray-500 text-sm uppercase font-bold tracking-wider mb-2">{title}</span>
       <span className="text-3xl font-bold text-blue-900">{value}</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10 max-w-none">
       
       {/* HEADER */}
       <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h2 className="text-2xl font-bold text-blue-900">⚙️ Software & Versiones</h2>
          <p className="text-sm text-gray-500">Estado de actualización de firmware (Corte: Junio 2025)</p>
       </div>

       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <KpiBox title="Total Dispositivos" value={totalItems} />
          <KpiBox title="% Actualizados" value={`${updatedPct}%`} />
          <KpiBox title="Versión Más Común" value={modeVersion} />
       </div>

       {/* GRÁFICAS */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          
          {/* IZQUIERDA: Distribución Versiones */}
          <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Distribución por Versión</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={versionStats} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="value" name="Dispositivos" barSize={20} radius={[0, 4, 4, 0]}>
                        {versionStats.map((entry, index) => (
                          <Cell key={index} fill={getConsistentColor(index)} />
                        ))}
                      </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* DERECHA: Estado Actualización (PIE CHART) */}
          <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Estado de Actualización</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie 
                        data={updateStats} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" cy="50%" 
                        innerRadius={60} 
                        outerRadius={100} 
                        paddingAngle={5}
                        label={({percent}) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {updateStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#ccc'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                </ResponsiveContainer>
              </div>
          </div>
       </div>

       {/* TABLA CON PAGINACIÓN Y FILTROS */}
       <div className="w-full bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
          
          {/* BARRA DE HERRAMIENTAS */}
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-4 bg-gray-50">
             
             {/* Buscador */}
             <div className="relative w-full lg:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por UUID o Versión..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="flex gap-4 w-full lg:w-auto">
                {/* Filtro Versión */}
                <select 
                  className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:w-48"
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                >
                  <option value="Todas">Todas las Versiones</option>
                  {uniqueVersions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>

                {/* Selector Filas */}
                <select
                  className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10 filas</option>
                  <option value={25}>25 filas</option>
                  <option value={50}>50 filas</option>
                </select>
             </div>
          </div>

          {/* TABLA */}
          <TableCard 
             title=""
             data={currentItems}
             columns={[
               { header: "UUID", accessor: "uuid", render: (r) => <span className="font-mono text-xs text-gray-600">{r.uuid}</span> },
               { header: "Versión Quiiotd", accessor: "quiiotd_version", render: (r) => <span className="font-bold text-gray-800">{r.quiiotd_version || "N/A"}</span> },
               { header: "Fecha Compilación", accessor: "compilation_date_fmt" },
               { header: "Estado Actualización", accessor: "update_status", render: (r) => (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    r.update_status === 'Actualizado' ? 'bg-green-100 text-green-700' : 
                    r.update_status === 'Desactualizado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {r.update_status}
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
              Mostrando <span className="font-bold">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> a <span className="font-bold">{Math.min(indexOfLastItem, totalItems)}</span> de <span className="font-bold">{totalItems}</span>
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

export default InfoView;