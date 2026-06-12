// InfoView.jsx (con DashboardSectionManager,useCachedFetch y KPIs Interactivos)
import React, { useEffect, useMemo, useState, useRef } from 'react';
import useCachedFetch from '../hooks/useCachedFetch';
import { api } from '../services/api';
import TableCard from '../components/TableCard';
import BarChartCard from '../components/BarChartCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import KpiCard from '../components/KpiCard'; 
import { getConsistentColor } from '../utils/colors';
import { 
  Smartphone, 
  Loader2, 
  Thermometer, 
  HardDrive, 
  Cpu, 
  Wifi, 
  Columns, 
  Check, 
  Layers, 
  CheckCircle 
} from 'lucide-react';

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

ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, Title, Tooltip, Legend);

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d)) return '—';
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    });
  } catch { return '—'; }
};

const getBaseVersion = (v) => {
  if (!v || v === 'N/A') return 'N/A';
  const match = v.match(/^(v\d{6}\.\d+(?:\.\d+)?)/);
  if (match) return match[1];
  return v.split('-')[0];
};

const getVersionScore = (v) => {
  if (!v) return 0;
  const match = v.match(/^v(\d{4})(\d{2})\.(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const ver = parseFloat(match[3]);
  return year * 100000 + month * 100 + ver;
};

const ALL_COLUMNS = [
  { id: 'uuid',             label: 'UUID',           defaultVisible: true  },
  { id: 'quiiotd_version',  label: 'Versión',        defaultVisible: true  },
  { id: 'compilation_date', label: 'Compilación',    defaultVisible: true  },
  { id: 'update_status',    label: 'Estado',         defaultVisible: true  },
  { id: 'board_model',      label: 'Placa',          defaultVisible: true  },
  { id: 'osname',           label: 'SO',             defaultVisible: false },
  { id: 'uptime',           label: 'Uptime',         defaultVisible: false },
  { id: 'sys_temp_c',       label: 'Temp / RAM',     defaultVisible: true  },
  { id: 'free_size_mb',     label: 'Disco libre',    defaultVisible: false },
  { id: 'interfaces',       label: 'Interfaces',     defaultVisible: false },
  { id: 'info_timestamp',   label: 'Última info',    defaultVisible: true  },
  { id: 'update_ts',        label: 'Actualizado en', defaultVisible: false },
];

const ColumnToggle = ({ visibleCols, onToggle, onReset }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Columns size={15} /> Columnas
        <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
          {visibleCols.size}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Columnas visibles</span>
            <button onClick={onReset} className="text-xs text-blue-600 hover:underline">Reset</button>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {ALL_COLUMNS.map((col) => {
              const isVisible = visibleCols.has(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => onToggle(col.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                    isVisible ? 'text-blue-700 bg-blue-50 hover:bg-blue-100' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{col.label}</span>
                  {isVisible && <Check size={14} className="text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoView = () => {
  const { data: fetchRes, loading } = useCachedFetch(
    'info',
    () => api.getInfo(1, 5000)
  );

  const data = useMemo(() => {
    return Array.isArray(fetchRes) ? fetchRes : [];
  }, [fetchRes]);

  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedVersion,  setSelectedVersion]  = useState('Todas');
  const [selectedModel,    setSelectedModel]    = useState('Todos');
  const [drilldownVersion, setDrilldownVersion] = useState(null);
  const [drilldownStatus,  setDrilldownStatus]  = useState(null);
  const [drilldownModel,   setDrilldownModel]   = useState(null);
  const [currentPage,      setCurrentPage]      = useState(1);
  const [rowsPerPage,      setRowsPerPage]      = useState(10);
  const [referenceVersion, setReferenceVersion] = useState('');

  const defaultVisible = new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id));
  const [visibleCols, setVisibleCols] = useState(defaultVisible);

  const toggleCol = (id) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } 
      else { next.add(id); }
      return next;
    });
  };

  const resetCols = () => setVisibleCols(new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)));

  const sortedBaseVersions = useMemo(() => {
    if (!data || data.length === 0) return [];
    const versions = [...new Set(data.map(d => getBaseVersion(d.quiiotd_version)).filter(v => v !== 'N/A'))];
    return versions.sort((a, b) => getVersionScore(b) - getVersionScore(a));
  }, [data]);

  const sortedFullVersions = useMemo(() => {
    if (!data || data.length === 0) return [];
    const versions = [...new Set(data.map(d => d.quiiotd_version).filter(v => v && v !== 'N/A'))];
    return versions.sort((a, b) => getVersionScore(b) - getVersionScore(a));
  }, [data]);

  useEffect(() => {
    if (sortedBaseVersions.length > 0 && !referenceVersion) {
      setReferenceVersion(sortedBaseVersions[0]); 
    }
  }, [sortedBaseVersions, referenceVersion]);

  const processedData = useMemo(() => {
    return data.map((d) => {
      const fullVersionStr = d.quiiotd_version || 'N/A';
      const baseVersionStr = getBaseVersion(fullVersionStr);
      
      let calcStatus = 'Sin Datos';
      if (fullVersionStr !== 'N/A') {
        calcStatus = (baseVersionStr === referenceVersion) ? 'Actualizado' : 'Desactualizado';
      }

      return {
        ...d,
        uuid:             d.device             || d.uuid             || '—',
        quiiotd_version:  fullVersionStr, 
        compilation_date: d.compilation_date   || null,
        update_status:    calcStatus,
        board_model:      d.board_model        || 'Desconocido',
        osname:           d.osname             || '—',
        osversion:        d.osversion          || '—',
        uptime:           d.uptime             || '—',
        free_ram_mb:      d.free_ram_mb  != null ? d.free_ram_mb  : null,
        sys_temp_c:       d.sys_temp_c   != null ? d.sys_temp_c   : null,
        free_size_mb:     d.free_size_mb != null ? d.free_size_mb : null,
        info_timestamp:   d.info_timestamp     || null,
        interfaces:       d.interfaces         || '—',
        update_ts:        d.update_ts          || null,
      };
    });
  }, [data, referenceVersion]);

  const filteredData = useMemo(() => {
    let result = processedData;
    if (selectedVersion !== 'Todas') result = result.filter((d) => d.quiiotd_version === selectedVersion);
    if (selectedModel   !== 'Todos') result = result.filter((d) => d.board_model     === selectedModel);
    if (drilldownVersion)            result = result.filter((d) => d.quiiotd_version === drilldownVersion);
    if (drilldownStatus)             result = result.filter((d) => d.update_status   === drilldownStatus);
    if (drilldownModel)              result = result.filter((d) => d.board_model     === drilldownModel);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      result = result.filter((d) =>
        ['uuid', 'quiiotd_version', 'update_status', 'board_model',
         'osname', 'osversion', 'uptime', 'interfaces'].some((k) =>
         String(d[k] || '').toLowerCase().includes(t)
        )
      );
    }
    return result;
  }, [processedData, selectedVersion, selectedModel, drilldownVersion, drilldownStatus, drilldownModel, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  const versionStats = useMemo(() => {
    const stats = {};
    filteredData.forEach((d) => {
      const v = d.quiiotd_version || 'N/A';
      if (!stats[v]) stats[v] = { name: v, count: 0 };
      stats[v].count++;
    });
    return Object.values(stats).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  const updateStats = useMemo(() => {
    const counts = filteredData.reduce((acc, d) => {
      const s = d.update_status || 'Sin Datos';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const modelStats = useMemo(() => {
    const counts = filteredData.reduce((acc, d) => {
      const m = d.board_model || 'Desconocido';
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const updatedCount = useMemo(() => filteredData.filter((d) => d.update_status === 'Actualizado').length, [filteredData]);
  const updatedPct   = totalItems ? ((updatedCount / totalItems) * 100).toFixed(1) : '0.0';
  const modeVersion  = versionStats.length > 0 ? versionStats[0].name : 'N/A';

  const avgTemp = useMemo(() => {
    const valid = filteredData.filter((d) => d.sys_temp_c != null);
    if (!valid.length) return '—';
    return (valid.reduce((s, d) => s + d.sys_temp_c, 0) / valid.length).toFixed(1) + ' °C';
  }, [filteredData]);

  const avgRam = useMemo(() => {
    const valid = filteredData.filter((d) => d.free_ram_mb != null);
    if (!valid.length) return '—';
    return Math.round(valid.reduce((s, d) => s + d.free_ram_mb, 0) / valid.length) + ' MB';
  }, [filteredData]);

  const uniqueModels = useMemo(() => [...new Set(processedData.map((d) => d.board_model))].filter(Boolean).sort(), [processedData]);
  const STATUS_COLORS = { Actualizado: '#10b981', Desactualizado: '#ef4444', 'Sin Datos': '#9ca3af' };

  const hasActiveFilter = Boolean(
    selectedVersion !== 'Todas' || selectedModel !== 'Todos' ||
    drilldownVersion || drilldownStatus || drilldownModel || searchTerm.trim()
  );

  const clearAll = () => {
    setSearchTerm(''); setSelectedVersion('Todas'); setSelectedModel('Todos');
    setDrilldownVersion(null); setDrilldownStatus(null); setDrilldownModel(null);
    setCurrentPage(1);
  };

  // ── MANEJADORES DE TOGGLE INTERACTIVO PARA KPIs ──
  const handleStatusToggle = (statusName) => {
    setDrilldownStatus((prev) => (prev === statusName ? null : statusName));
    setDrilldownVersion(null);
    setDrilldownModel(null);
    setCurrentPage(1);
  };

  const handleVersionToggle = (versionName) => {
    if (versionName === 'N/A') return;
    setDrilldownVersion((prev) => (prev === versionName ? null : versionName));
    setDrilldownStatus(null);
    setDrilldownModel(null);
    setCurrentPage(1);
  };

  const allColumnDefs = [
    {
      id: 'uuid', header: 'UUID', accessor: 'uuid',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-gray-400 shrink-0" />
          <span className="font-mono text-xs text-gray-600">{r.uuid}</span>
        </div>
      ),
    },
    {
      id: 'quiiotd_version', header: 'Versión', accessor: 'quiiotd_version',
      render: (r) => <span className="font-bold text-gray-800 text-xs">{r.quiiotd_version}</span>,
    },
    {
      id: 'compilation_date', header: 'Compilación', accessor: 'compilation_date',
      render: (r) => <span className="font-mono text-xs text-gray-500">{r.compilation_date || '—'}</span>,
    },
    {
      id: 'update_status', header: 'Estado', accessor: 'update_status',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
          r.update_status === 'Actualizado'
            ? 'bg-green-50 text-green-700 border-green-200'
            : r.update_status === 'Desactualizado'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {r.update_status}
        </span>
      ),
    },
    {
      id: 'board_model', header: 'Placa', accessor: 'board_model',
      render: (r) => <span className="text-xs text-gray-700">{r.board_model}</span>,
    },
    {
      id: 'osname', header: 'SO', accessor: 'osname',
      render: (r) => (
        <div>
          <div className="text-xs font-medium text-gray-700">{r.osname}</div>
          <div className="text-[10px] text-gray-400">{r.osversion}</div>
        </div>
      ),
    },
    {
      id: 'uptime', header: 'Uptime', accessor: 'uptime',
      render: (r) => <span className="text-xs text-gray-600 whitespace-nowrap">{r.uptime}</span>,
    },
    {
      id: 'sys_temp_c', header: 'Temp / RAM', accessor: 'sys_temp_c',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          {r.sys_temp_c != null && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <Thermometer size={11} /> {r.sys_temp_c} °C
            </span>
          )}
          {r.free_ram_mb != null && (
            <span className="flex items-center gap-1 text-xs text-indigo-600">
              <Cpu size={11} /> {r.free_ram_mb} MB
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'free_size_mb', header: 'Disco libre', accessor: 'free_size_mb',
      render: (r) => r.free_size_mb != null
        ? <span className="flex items-center gap-1 text-xs text-gray-600"><HardDrive size={11} /> {r.free_size_mb} MB</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      id: 'interfaces', header: 'Interfaces', accessor: 'interfaces',
      render: (r) => (
        <span className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
          <Wifi size={11} className="shrink-0" /> {r.interfaces}
        </span>
      ),
    },
    {
      id: 'info_timestamp', header: 'Última info', accessor: 'info_timestamp',
      render: (r) => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(r.info_timestamp)}</span>,
    },
    {
      id: 'update_ts', header: 'Actualizado en', accessor: 'update_ts',
      render: (r) => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(r.update_ts)}</span>,
    },
  ];

  const activeColumns = ALL_COLUMNS
    .filter((c) => visibleCols.has(c.id))
    .map((c) => allColumnDefs.find((def) => def.id === c.id))
    .filter(Boolean);

  if (loading && processedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-10 max-w-none">

      {/* 1. HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 w-full">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">⚙️ Software & Versiones</h2>
            <p className="text-sm text-gray-500">Estado de actualización de firmware</p>
          </div>
          {hasActiveFilter && (
            <button onClick={clearAll} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold border border-red-200 transition-colors">
              Limpiar filtros ✕
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <label className="block text-xs font-bold text-green-800 uppercase tracking-wide mb-1">
              Versión Objetivo (Actualizados)
            </label>
            <select
              className="block w-full rounded-md border-green-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2 text-sm bg-white font-medium text-green-900"
              value={referenceVersion}
              onChange={(e) => {
                setReferenceVersion(e.target.value);
                setCurrentPage(1);
              }}
            >
              {sortedBaseVersions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">🔧 Filtrar por Versión</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedVersion}
              onChange={(e) => { setSelectedVersion(e.target.value); setDrilldownVersion(null); setCurrentPage(1); }}
            >
              <option value="Todas">Todas</option>
              {sortedFullVersions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">🖥️ Filtrar por Modelo</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedModel}
              onChange={(e) => { setSelectedModel(e.target.value); setDrilldownModel(null); setCurrentPage(1); }}
            >
              <option value="Todos">Todos</option>
              {uniqueModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPIs INTEGRADOS MEDIANTE KPICARD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        <KpiCard 
          title="Total Dispositivos" 
          value={totalItems} 
          color="blue" 
          icon={<Smartphone />}
          disabled={loading}
        />
        <KpiCard 
          title="Actualizados" 
          value={`${updatedPct}%`} 
          color="green"  
          icon={<CheckCircle />}
          sub={`${updatedCount} equipos en meta`} 
          onClick={() => handleStatusToggle('Actualizado')}
          active={drilldownStatus === 'Actualizado'}
          disabled={loading}
        />
        <KpiCard 
          title="Versión Común"   
          value={modeVersion}      
          color="gray"   
          icon={<Layers />}
          sub={modeVersion !== 'N/A' ? 'Click para aislar' : 'Sin datos'}
          onClick={() => handleVersionToggle(modeVersion)}
          active={drilldownVersion === modeVersion && modeVersion !== 'N/A'}
          disabled={loading}
        />
        <KpiCard 
          title="Temp. Media"     
          value={avgTemp}          
          color="orange" 
          icon={<Thermometer />}
          disabled={loading}
        />
        <KpiCard 
          title="RAM Libre Media" 
          value={avgRam}           
          color="indigo" 
          icon={<Cpu />}
          disabled={loading}
        />
      </div>

      {/* 3. VISUALIZACIONES */}
      <SelectDash
        storageKey="infoView:sections"
        headerTitle="Visualizaciones"
        sections={[
          {
            id: 'versions-bar', title: 'Panorama de Versiones', defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Panorama de Versiones"
                subtitle="Frecuencia por versión (click para filtrar)"
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
                  setDrilldownVersion(label); setDrilldownStatus(null);
                  setDrilldownModel(null); setSelectedVersion(label); setCurrentPage(1);
                }}
              />
            ),
          },
          {
            id: 'status-pie', title: 'Estado de Actualización', defaultMode: 'show',
            render: () => (
              <PieChartCard
                title="Estado de Actualización"
                subtitle="Click en el pie para filtrar"
                legendTitle="Estados visibles"
                data={updateStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-[380px]"
                selectedLabel={drilldownStatus}
                getColor={(i, row) => STATUS_COLORS[row.__label] || '#cbd5e1'}
                onSliceClick={(label) => {
                  setDrilldownStatus(label); setDrilldownVersion(null);
                  setDrilldownModel(null); setCurrentPage(1);
                }}
              />
            ),
          },
          {
            id: 'model-bar', title: 'Distribución por Modelo de Placa', defaultMode: 'show',
            render: () => (
              <BarChartCard
                title="Distribución por Modelo de Placa"
                legendTitle="Modelos visibles"
                data={modelStats}
                labelKey="name"
                valueKey="value"
                heightClass="h-72"
                indexAxis="x"
                getColor={(i) => getConsistentColor(i)}
                selectedLabel={drilldownModel}
                onBarClick={(label) => {
                  setDrilldownModel(label); setDrilldownVersion(null);
                  setDrilldownStatus(null); setCurrentPage(1);
                }}
              />
            ),
          },
        ]}
      />

      {/* 4. TABLA */}
      <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Listado de dispositivos</span>
          <ColumnToggle visibleCols={visibleCols} onToggle={toggleCol} onReset={resetCols} />
        </div>

        <TableCard
          title=""
          data={filteredData}
          columns={activeColumns}
          loading={loading}
          enableToolbar
          searchTerm={searchTerm}
          setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
          searchPlaceholder="Buscar por UUID, versión, modelo, SO..."
          searchableKeys={['uuid', 'quiiotd_version', 'update_status', 'board_model', 'osname', 'osversion', 'uptime', 'interfaces']}
          pageSize={rowsPerPage}
          setPageSize={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
};

export default InfoView;