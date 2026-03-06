import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';

import { getConsistentColor } from '../utils/colors';
import { Search, ChevronLeft, ChevronRight, Smartphone, Loader2 } from 'lucide-react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// BarChartCard usa Bar internamente => requiere BarElement
// PieChartCard usa Pie internamente => requiere ArcElement
ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, Title, Tooltip, Legend);

const InfoView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ESTADOS (tabla / filtros) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('Todas');

  // Drilldowns por charts
  const [drilldownVersion, setDrilldownVersion] = useState(null); // click en BarChart (versión)
  const [drilldownStatus, setDrilldownStatus] = useState(null);   // click en PieChart (estado)

  // Tabla: paginación externa (como tu vista original)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getInfo(1, 5000);
        setData(res || []);
      } catch (error) {
        console.error('Error cargando Info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // --- 1. PROCESAMIENTO ---
  const CUTOFF_DATE = useMemo(() => new Date('2025-06-01'), []);

  const processedData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((d) => {
      let status = 'Sin Datos';
      let dateObj = null;

      if (d.compilation_date) {
        dateObj = new Date(d.compilation_date);
        if (!isNaN(dateObj.getTime())) {
          status = dateObj >= CUTOFF_DATE ? 'Actualizado' : 'Desactualizado';
        }
      }

      return {
        ...d,
        update_status: status,
        compilation_date_fmt: dateObj ? dateObj.toLocaleDateString() : 'N/A',
        raw_date: dateObj,
        // normalizamos para consistencia
        quiiotd_version: d.quiiotd_version || 'N/A',
      };
    });
  }, [data, CUTOFF_DATE]);

  // --- 2. FILTRADO BASE (dropdown + drilldowns). La búsqueda se aplica aquí porque tu tabla está paginada fuera ---
  const filteredData = useMemo(() => {
    let result = processedData;

    // Dropdown versión
    if (selectedVersion !== 'Todas') {
      result = result.filter((d) => d.quiiotd_version === selectedVersion);
    }

    // Drilldown versión desde BarChart
    if (drilldownVersion) {
      result = result.filter((d) => (d.quiiotd_version || 'N/A') === drilldownVersion);
    }

    // Drilldown estado desde PieChart
    if (drilldownStatus) {
      result = result.filter((d) => (d.update_status || 'Sin Datos') === drilldownStatus);
    }

    // Search
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          (d.uuid && d.uuid.toLowerCase().includes(lowerTerm)) ||
          (d.quiiotd_version && d.quiiotd_version.toLowerCase().includes(lowerTerm)) ||
          (d.update_status && d.update_status.toLowerCase().includes(lowerTerm))
      );
    }

    return result;
  }, [processedData, selectedVersion, drilldownVersion, drilldownStatus, searchTerm]);

  // Reset paginación al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVersion, searchTerm, rowsPerPage, drilldownVersion, drilldownStatus]);

  // --- 3. PAGINACIÓN ---
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfFirstItem + rowsPerPage);

  // --- 4. STATS PARA CHARTS (sobre filteredData, igual que el resto del dashboard) ---

  // A) Versiones + fecha asociada
  const versionStats = useMemo(() => {
    const stats = {};
    filteredData.forEach((d) => {
      const v = d.quiiotd_version || 'N/A';
      if (!stats[v]) {
        stats[v] = {
          name: v,
          count: 0,
          // guardamos la primera fecha formateada que encontremos para tooltip/leyenda
          date: d.compilation_date_fmt || 'N/A',
        };
      }
      stats[v].count += 1;
    });

    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // B) Estado actualización (pie)
  const updateStats = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const s = curr.update_status || 'Sin Datos';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const STATUS_COLORS = useMemo(
    () => ({
      Actualizado: '#10b981',
      Desactualizado: '#ef4444',
      'Sin Datos': '#9ca3af',
    }),
    []
  );

  // --- Helpers UI ---
  const uniqueVersions = useMemo(
    () => [...new Set(processedData.map((d) => d.quiiotd_version || 'N/A'))].sort(),
    [processedData]
  );

  const updatedCount = useMemo(
    () => filteredData.filter((d) => d.update_status === 'Actualizado').length,
    [filteredData]
  );

  const updatedPct = totalItems ? ((updatedCount / totalItems) * 100).toFixed(1) : '0.0';
  const modeVersion = versionStats.length > 0 ? versionStats[0].name : 'N/A';

  const KpiBox = ({ title, value, color = 'blue' }) => (
    <div className={`bg-white p-6 rounded shadow border-l-4 border-${color}-600 flex flex-col items-center w-full`}>
      <span className="text-gray-500 text-sm uppercase font-bold tracking-wider mb-2">{title}</span>
      <span className={`text-3xl font-bold text-${color}-900`}>{value}</span>
    </div>
  );

  const hasActiveFilter = Boolean(
    (selectedVersion && selectedVersion !== 'Todas') || drilldownVersion || drilldownStatus || searchTerm.trim()
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10 max-w-none">
      {/* HEADER */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">⚙️ Software & Versiones</h2>
            <p className="text-sm text-gray-500">Estado de actualización de firmware</p>
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedVersion('Todas');
                setDrilldownVersion(null);
                setDrilldownStatus(null);
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
            >
              Limpiar filtros ✕
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <KpiBox title="Total Dispositivos" value={totalItems} color="blue" />
        <KpiBox title="% Actualizados" value={`${updatedPct}%`} color="green" />
        <KpiBox title="Versión Más Común" value={modeVersion} color="purple" />
      </div>

      {/* SECCIONES CONTROLADAS (ocultar/minimizar/selector) */}
      <SelectDash
        storageKey="infoView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'versions-bar',
            title: 'Panorama de Versiones',
            defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Panorama de Versiones"
                subtitle="Frecuencia por versión (click en barras o leyenda para filtrar)"
                legendTitle="Detalle de Versiones"
                data={versionStats}
                labelKey="name"
                valueKey="count"
                heightClass="h-[450px]"
                indexAxis="y"
                maxBars={80}
                getColor={(i) => getConsistentColor(i)}
                selectedLabel={drilldownVersion}
                onBarClick={(label) => {
                  setDrilldownVersion(label);
                  setDrilldownStatus(null);
                  setSelectedVersion(label);
                }}
              />
            ),
          },
          {
            id: 'status-pie',
            title: 'Estado de Actualización',
            defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Actualización"
                subtitle="Click en el pie o en la leyenda para filtrar"
                legendTitle="Estados visibles"
                data={updateStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-[380px]"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => STATUS_COLORS[row.__label] || '#cbd5e1'}
                onSliceClick={(label) => {
                  setDrilldownStatus(label);
                  setDrilldownVersion(null);
                }}
              />
            ),
          },
        ]}
      />

      {/* TABLA + TOOLBAR MANUAL (manteniendo tu estructura original) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* TABLA PRINCIPAL (2 columnas) */}
        <div className="lg:col-span-3 bg-white rounded shadow border border-gray-200 overflow-hidden flex flex-col">
          
          {/* TABLA COMPONENTE */}
          <div className="flex-grow overflow-hidden">
            <TableCard
              title=""
              data={currentItems}
              columns={[
                {
                  header: 'UUID',
                  accessor: 'uuid',
                  render: (r) => (
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className="text-gray-400" />
                      <span className="font-mono text-xs text-gray-600">{r.uuid}</span>
                    </div>
                  ),
                },
                {
                  header: 'Versión',
                  accessor: 'quiiotd_version',
                  render: (r) => <span className="font-bold text-gray-800 text-xs">{r.quiiotd_version || 'N/A'}</span>,
                },
                {
                  header: 'Compilación',
                  accessor: 'compilation_date_fmt',
                  render: (r) => <span className="font-mono text-xs text-gray-500">{r.compilation_date_fmt}</span>,
                },
                {
                  header: 'Estado',
                  accessor: 'update_status',
                  render: (r) => (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        r.update_status === 'Actualizado'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : r.update_status === 'Desactualizado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {r.update_status}
                    </span>
                  ),
                },
              ]}
              loading={loading}
              enableToolbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchPlaceholder='Buscar por UUID, Nombre, Modelo...'
              searchableKeys={['uuid','quiiotd_version','compilation_date_fmt', 'update_status']}
              pageSize={rowsPerPage}
              setPageSize={setRowsPerPage}
              rowsPerPageOptions={[5,10,25,50,100]}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default InfoView;
