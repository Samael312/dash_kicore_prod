// InstallationsView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import { Loader2, AlertTriangle, Check } from 'lucide-react'; // <-- Añadido Check para el botón

import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return '—';
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return '—';
  }
};

const mapInstallation = (d) => ({
  ...d,
  uuid: d.uuid || '',
  name: d.name || 'Sin nombre',
  description: d.description || 'Sin descripción',
  state_clean: d.state === true ? 'Conectado' : 'Desconectado',
  enabled_clean: d.enabled === true ? 'Habilitado' : 'Deshabilitado',
  is_obsolete: d.obsoletas === true, 
  last_change: d.last_change || null,
  first_connection: d.first_connection || null,
});

const InstallationsView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEnabled, setSelectedEnabled] = useState('Todos');
  const [drilldownState, setDrilldownState] = useState(null);
  const [drilldownEnabled, setDrilldownEnabled] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // --- NUEVOS ESTADOS ---
  // inputYears: Lo que el usuario escribe (puede ser string vacío temporalmente)
  const [inputYears, setInputYears] = useState('4');
  // activeYearsThreshold: El valor que realmente dispara el useEffect
  const [activeYearsThreshold, setActiveYearsThreshold] = useState(4);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Usamos activeYearsThreshold, no inputYears
        const res = await api.getInst(1, 5000, activeYearsThreshold);
        const items = Array.isArray(res) ? res : (res?.items || []);
        setRawData(items.map(mapInstallation));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeYearsThreshold]); // Solo se dispara cuando cambia el umbral activo

  const handleApplyYears = () => {
    const val = parseFloat(inputYears);
    // Si el valor es válido y mayor a 0, lo aplicamos
    if (!isNaN(val) && val > 0) {
      setActiveYearsThreshold(val);
    } else {
      // Si el usuario metió texto inválido o vacío, restauramos al valor activo
      setInputYears(String(activeYearsThreshold));
    }
  };

  const filteredByControls = useMemo(() => {
    let data = rawData;
    if (selectedEnabled === 'Obsoletas') {
      data = data.filter((d) => d.is_obsolete);
    } else if (selectedEnabled !== 'Todos') {
      data = data.filter((d) => d.enabled_clean === selectedEnabled);
    }
    if (drilldownState) data = data.filter((d) => d.state_clean === drilldownState);
    if (drilldownEnabled) data = data.filter((d) => d.enabled_clean === drilldownEnabled);
    return data;
  }, [rawData, selectedEnabled, drilldownState, drilldownEnabled]);

  const totalItems = filteredByControls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  const stats = useMemo(() => ({
    connected: filteredByControls.filter((d) => d.state_clean === 'Conectado').length,
    disconnected: filteredByControls.filter((d) => d.state_clean === 'Desconectado').length,
    enabled: filteredByControls.filter((d) => d.enabled_clean === 'Habilitado').length,
    obsolete: filteredByControls.filter((d) => d.is_obsolete).length,
  }), [filteredByControls]);

  const connectedPct = totalItems > 0 ? ((stats.connected / totalItems) * 100).toFixed(1) : '0.0';

  const stateData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.state_clean] = (acc[curr.state_clean] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const enabledData = useMemo(() => {
    const counts = filteredByControls.reduce((acc, curr) => {
      acc[curr.enabled_clean] = (acc[curr.enabled_clean] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredByControls]);

  const clearAllDrilldowns = () => {
    setDrilldownState(null);
    setDrilldownEnabled(null);
    setCurrentPage(1);
  };

  const getStateColor = (label) => {
    if (label === 'Conectado') return '#00CC96';
    if (label === 'Desconectado') return '#EF553B';
    return '#94a3b8';
  };

  const getEnabledColor = (label) => {
    if (label === 'Habilitado') return '#0086be';
    if (label === 'Deshabilitado') return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-10">
      
      {/* 1. HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">🔌 Inventario de Instalaciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
          
          {/* SELECTOR DE ESTADO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">⚡ Filtrar categoría</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedEnabled}
              onChange={(e) => { setSelectedEnabled(e.target.value); clearAllDrilldowns(); }}
            >
              <option value="Todos">Todos</option>
              <option value="Habilitado">Habilitado</option>
              <option value="Deshabilitado">Deshabilitado</option>
              {/* Usa el valor activo para el texto */}
              <option value="Obsoletas">⚠️ Obsoletas (+{activeYearsThreshold} años)</option>
            </select>
          </div>

          {/* INPUT + BOTÓN APLICAR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">⏳ Umbral Obsoletas (Años)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.5" 
                step="0.5"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
                value={inputYears}
                onChange={(e) => setInputYears(e.target.value)} // Solo cambia el estado visual del input
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyYears(); // Permite aplicar dando al enter
                }}
              />
              <button
                onClick={handleApplyYears}
                disabled={loading} // Se deshabilita mientras carga
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                title="Aplicar umbral"
              >
                <Check size={18} />
              </button>
            </div>
          </div>

          {(drilldownState || drilldownEnabled) && (
            <div className="flex items-end">
              <button
                onClick={clearAllDrilldowns}
                className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors"
              >
                Limpiar filtro gráfico ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPIs */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 bg-white rounded shadow-sm border border-gray-200">
          <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
          <p className="text-gray-500">Recalculando obsolescencia...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
              <span className="text-gray-500 text-xs font-bold uppercase">Total</span>
              <p className="text-3xl font-bold text-blue-900">{totalItems}</p>
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
              <span className="text-gray-500 text-xs font-bold uppercase">Obsoletas</span>
              <p className="text-3xl font-bold text-orange-700">{stats.obsolete}</p>
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
              <span className="text-gray-500 text-xs font-bold uppercase">Conectados</span>
              <p className="text-3xl font-bold text-green-700">{stats.connected} <span className="text-sm font-normal">({connectedPct}%)</span></p>
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
              <span className="text-gray-500 text-xs font-bold uppercase">Desconectados</span>
              <p className="text-3xl font-bold text-red-700">{stats.disconnected}</p>
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-indigo-500">
              <span className="text-gray-500 text-xs font-bold uppercase">Habilitados</span>
              <p className="text-3xl font-bold text-indigo-700">{stats.enabled}</p>
            </div>
          </div>

          {/* 3. VISUALIZACIONES */}
          <SelectDash
            storageKey="installationsView:sections"
            headerTitle="Visualizaciones"
            sections={[
              {
                id: 'pie-state',
                title: 'Estado de Conexión',
                defaultMode: 'show',
                render: () => (
                  <PieChartCard
                    title="Estado de Conexión"
                    data={stateData}
                    labelKey="name"
                    valueKey="value"
                    heightClass="h-72"
                    selectedLabel={drilldownState}
                    getColor={(i, row) => getStateColor(row?.__label || row?.name)}
                    onSliceClick={(label) => {
                      setDrilldownState(label);
                      setDrilldownEnabled(null);
                      setCurrentPage(1);
                    }}
                  />
                ),
              },
              {
                id: 'pie-enabled',
                title: 'Habilitación',
                defaultMode: 'show',
                render: () => (
                  <PieChartCard
                    title="Habilitación"
                    data={enabledData}
                    labelKey="name"
                    valueKey="value"
                    heightClass="h-72"
                    selectedLabel={drilldownEnabled}
                    getColor={(i, row) => getEnabledColor(row?.__label || row?.name)}
                    onSliceClick={(label) => {
                      setDrilldownEnabled(label);
                      setDrilldownState(null);
                      setCurrentPage(1);
                    }}
                  />
                ),
              },
            ]}
          />

          {/* 4. TABLA */}
          <TableCard
            title="Listado de instalaciones"
            data={filteredByControls}
            columns={[
              {
                header: 'Nombre',
                accessor: 'name',
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-700">{r.name}</span>
                    {r.is_obsolete && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold uppercase mt-1">
                        <AlertTriangle size={12} /> Obsoleta (+{activeYearsThreshold} años)
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: 'Descripción',
                accessor: 'description',
                render: (r) => <span className="text-gray-500 text-xs line-clamp-1">{r.description || '-'}</span>,
              },
              {
                header: 'Estado',
                accessor: 'state_clean',
                render: (r) => (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border"
                    style={{
                      backgroundColor: r.is_obsolete ? '#fff7ed' : `${getStateColor(r.state_clean)}18`,
                      color: r.is_obsolete ? '#c2410c' : getStateColor(r.state_clean),
                      borderColor: r.is_obsolete ? '#fdba74' : `${getStateColor(r.state_clean)}40`,
                    }}
                  >
                    {r.is_obsolete ? 'Obsoleto' : r.state_clean}
                  </span>
                ),
              },
              {
                header: 'Habilitada',
                accessor: 'enabled_clean',
                render: (r) => (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border"
                    style={{
                      backgroundColor: `${getEnabledColor(r.enabled_clean)}18`,
                      color: getEnabledColor(r.enabled_clean),
                      borderColor: `${getEnabledColor(r.enabled_clean)}40`,
                    }}
                  >
                    {r.enabled_clean}
                  </span>
                ),
              },
              {
                header: 'Última Conexión',
                accessor: 'last_change',
                render: (r) => (
                  <span className={`text-xs whitespace-nowrap ${r.is_obsolete ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                    {formatDate(r.last_change)}
                  </span>
                ),
              },
              {
                header: 'Primera Conexión',
                accesor: 'first_connection',
                render: (r) => <span className="text-xs whitespace-nowrap text-gray-600">{r.first_connection}</span>,
              },
              {
                header: 'UUID',
                accessor: 'uuid',
                render: (r) => <span className="font-mono text-[10px] text-gray-400">{r.uuid}</span>,
              },
            ]}
            loading={loading}
            enableToolbar
            searchTerm={searchTerm}
            setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Buscar instalaciones..."
            searchableKeys={['uuid', 'name', 'description']}
            pageSize={rowsPerPage}
            setPageSize={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
};

export default InstallationsView;