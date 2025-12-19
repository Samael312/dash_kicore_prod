import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import { getConsistentColor } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight, Calendar, Smartphone, Loader2 } from 'lucide-react';

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
import { Bar, Pie, getElementAtEvent } from 'react-chartjs-2';

// --- REGISTRO ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const InfoView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const barChartRef = useRef(null);

  // --- ESTADOS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getInfo(1, 10000);
        setData(res || []);
      } catch (error) {
        console.error("Error cargando Info:", error);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // --- 1. PROCESAMIENTO ---
  const CUTOFF_DATE = new Date('2025-06-01');

  const processedData = useMemo(() => {
    return data.map(d => {
      let status = "Sin Datos";
      let dateObj = null;
      
      if (d.compilation_date) {
        dateObj = new Date(d.compilation_date);
        if (!isNaN(dateObj.getTime())) {
             status = dateObj >= CUTOFF_DATE ? "Actualizado" : "Desactualizado";
        }
      }
      return { 
        ...d, 
        update_status: status,
        compilation_date_fmt: dateObj ? dateObj.toLocaleDateString() : "N/A",
        // Guardamos la fecha cruda para ordenar si fuera necesario
        raw_date: dateObj 
      };
    });
  }, [data]);

  // --- 2. FILTRADO ---
  const filteredData = useMemo(() => {
    let result = processedData;

    if (selectedVersion !== "Todas") {
      result = result.filter(d => d.quiiotd_version === selectedVersion);
    }

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

  useEffect(() => { setCurrentPage(1); }, [selectedVersion, searchTerm, rowsPerPage]);

  // --- 3. PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfFirstItem + rowsPerPage);

  // --- 4. PREPARACIÓN DATOS GRÁFICAS ---
  
  // A. Versiones (Agregamos Fecha también) 
  const versionStats = useMemo(() => {
    const stats = {};
    filteredData.forEach(d => {
      const v = d.quiiotd_version || "N/A";
      // Intentamos capturar la fecha de compilación asociada a esta versión
      // (Tomamos la primera que encontremos o la más común)
      if (!stats[v]) {
        stats[v] = { 
          count: 0, 
          date: d.compilation_date_fmt,
          name: v
        };
      }
      stats[v].count += 1;
    });

    return Object.values(stats).sort((a,b) => b.count - a.count);
  }, [filteredData]);

  const barChartData = {
    labels: versionStats.map(d => d.name),
    datasets: [{
      label: 'Dispositivos',
      data: versionStats.map(d => d.count),
      backgroundColor: versionStats.map((_, i) => getConsistentColor(i)),
      borderRadius: 4,
      barPercentage: 0.7, // Barras más gruesas
    }],
  };

  const barOptions = {
    indexAxis: 'y', // Horizontal
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} Disp. (${versionStats[ctx.dataIndex].date})` } }
    },
    layout: {
      padding: { right: 20 } // Espacio extra a la derecha
    },
    scales: {
      x: { beginAtZero: true, grid: { display: false } },
      y: { 
        grid: { display: false },
        ticks: { 
          autoSkip: false, // ¡CRUCIAL! Evita que se oculten etiquetas
          font: { size: 11, weight: 'bold' }
        } 
      }
    }
  };

  // B. Estado Actualización (Pie) 
  const updateStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const s = curr.update_status;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const STATUS_COLORS = { "Actualizado": "#10b981", "Desactualizado": "#ef4444", "Sin Datos": "#9ca3af" };

  const pieChartData = {
    labels: updateStats.map(d => d.name),
    datasets: [{
      data: updateStats.map(d => d.value),
      backgroundColor: updateStats.map(d => STATUS_COLORS[d.name] || '#ccc'),
      borderWidth: 1,
      borderColor: '#fff'
    }],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { position: 'right', labels: { usePointStyle: true } } }
  };

  // --- Helpers UI ---
  const uniqueVersions = [...new Set(processedData.map(d => d.quiiotd_version || "N/A"))].sort();
  const updatedCount = filteredData.filter(d => d.update_status === "Actualizado").length;
  const updatedPct = totalItems ? ((updatedCount / totalItems) * 100).toFixed(1) : 0;
  const modeVersion = versionStats.length > 0 ? versionStats[0].name : "N/A";

  const KpiBox = ({ title, value, color = "blue" }) => (
    <div className={`bg-white p-6 rounded shadow border-l-4 border-${color}-600 flex flex-col items-center w-full`}>
       <span className="text-gray-500 text-sm uppercase font-bold tracking-wider mb-2">{title}</span>
       <span className={`text-3xl font-bold text-${color}-900`}>{value}</span>
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
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10 max-w-none">
       
       {/* HEADER */}
       <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h2 className="text-2xl font-bold text-blue-900">⚙️ Software & Versiones</h2>
          <p className="text-sm text-gray-500">Estado de actualización de firmware (Corte: Junio 2025)</p>
       </div>

       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <KpiBox title="Total Dispositivos" value={totalItems} color="blue" />
          <KpiBox title="% Actualizados" value={`${updatedPct}%`} color="green" />
          <KpiBox title="Versión Más Común" value={modeVersion} color="purple" />
       </div>

       {/* SECCIÓN PRINCIPAL: DISTRIBUCIÓN DE VERSIONES (Diseño Asimétrico 2/3 + 1/3) */}
       <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
          <h3 className="text-lg font-bold text-gray-700 mb-6 border-b pb-2">Panorama de Versiones</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* 1. GRÁFICA DE BARRAS (Ocupa 2 columnas - Más ancha) */}
             <div className="lg:col-span-2 flex flex-col">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Gráfica de Frecuencia</h4>
                <div className="h-[450px] w-full relative">
                   <Bar ref={barChartRef} options={barOptions} data={barChartData} />
                </div>
             </div>

             {/* 2. LEYENDA DETALLADA HTML (Ocupa 1 columna - A la derecha) */}
             <div className="lg:col-span-1 bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col h-[450px]">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                   <Calendar size={14}/> Detalle de Versiones
                </h4>
                
                {/* Encabezados de la mini-tabla */}
                <div className="grid grid-cols-3 text-xs font-bold text-gray-400 border-b pb-2 mb-2 px-2">
                   <span className="col-span-1">Versión</span>
                   <span className="col-span-1 text-center">Fecha</span>
                   <span className="col-span-1 text-right">Cant.</span>
                </div>

                {/* Lista Scrollable */}
                <div className="overflow-y-auto flex-grow custom-scrollbar pr-1">
                   {versionStats.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-3 text-sm py-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors items-center px-2 rounded">
                         
                         {/* Versión + Color */}
                         <div className="col-span-1 flex items-center gap-2 overflow-hidden">
                            <div className="w-2 h-2 min-w-[8px] rounded-full" style={{ backgroundColor: getConsistentColor(idx) }}></div>
                            <span className="truncate font-medium text-gray-700" title={item.name}>{item.name}</span>
                         </div>
                         
                         {/* Fecha */}
                         <div className="col-span-1 text-center text-xs text-gray-500 font-mono">
                            {item.date || '-'}
                         </div>
                         
                         {/* Cantidad */}
                         <div className="col-span-1 text-right font-bold text-blue-700">
                            {item.count}
                         </div>
                      </div>
                   ))}
                </div>
                
                <div className="mt-2 text-xs text-center text-gray-400 italic bg-white p-2 rounded border border-gray-100">
                   Total Versiones Distintas: {versionStats.length}
                </div>
             </div>

          </div>
       </div>

       {/* SECCIÓN SECUNDARIA: ESTADO (Pie Chart y Tabla) */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          
          {/* PIE CHART (1 Columna) */}
          <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col h-[500px]">
             <h3 className="text-lg font-bold text-gray-700 mb-4">Estado de Actualización</h3>
             <div className="flex-grow w-full relative flex items-center justify-center">
                <Pie options={pieOptions} data={pieChartData} />
             </div>
             <p className="text-xs text-center text-gray-400 mt-4">Basado en fecha de corte: 01/06/2025</p>
          </div>

          {/* TABLA PRINCIPAL (2 Columnas) */}
          <div className="lg:col-span-2 bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col h-[500px]">
             
             {/* BARRA HERRAMIENTAS TABLA */}
             <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-64">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search size={16} className="text-gray-400" />
                   </div>
                   <input
                     type="text"
                     placeholder="Buscar dispositivo..."
                     className="pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                
                <div className="flex gap-2">
                   <select 
                     className="border border-gray-300 rounded py-1.5 px-2 text-sm focus:ring-blue-500 focus:outline-none"
                     value={selectedVersion}
                     onChange={(e) => setSelectedVersion(e.target.value)}
                   >
                     <option value="Todas">Todas las Versiones</option>
                     {uniqueVersions.map(v => <option key={v} value={v}>{v}</option>)}
                   </select>

                   <select
                     className="border border-gray-300 rounded py-1.5 px-2 text-sm focus:ring-blue-500 focus:outline-none"
                     value={rowsPerPage}
                     onChange={(e) => setRowsPerPage(Number(e.target.value))}
                   >
                     <option value={10}>10</option>
                     <option value={20}>20</option>
                     <option value={50}>50</option>
                   </select>
                </div>
             </div>

             {/* TABLA COMPONENTE */}
             <div className="flex-grow overflow-hidden">
                <TableCard 
                   title=""
                   data={currentItems}
                   columns={[
                     { header: "UUID", accessor: "uuid", render: (r) => (
                        <div className="flex items-center gap-2">
                           <Smartphone size={14} className="text-gray-400"/>
                           <span className="font-mono text-xs text-gray-600">{r.uuid}</span>
                        </div>
                     )},
                     { header: "Versión", accessor: "quiiotd_version", render: (r) => <span className="font-bold text-gray-800 text-xs">{r.quiiotd_version || "N/A"}</span> },
                     { header: "Compilación", accessor: "compilation_date_fmt", render: (r) => <span className="font-mono text-xs text-gray-500">{r.compilation_date_fmt}</span> },
                     { header: "Estado", accessor: "update_status", render: (r) => (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          r.update_status === 'Actualizado' ? 'bg-green-50 text-green-700 border-green-200' : 
                          r.update_status === 'Desactualizado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
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
             </div>

             {/* FOOTER TABLA */}
             <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                   <span className="font-bold">{indexOfFirstItem + 1}-{Math.min(indexOfFirstItem + rowsPerPage, totalItems)}</span> de {totalItems}
                </div>
                <div className="flex gap-1">
                   <button
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="p-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                   >
                     <ChevronLeft size={16} />
                   </button>
                   <button
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages}
                     className="p-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                   >
                     <ChevronRight size={16} />
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default InfoView;