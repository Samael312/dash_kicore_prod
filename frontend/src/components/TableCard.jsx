import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown,
  Filter, X, Search, Database, GripHorizontal, CalendarRange, Download,
} from 'lucide-react';

const defaultRowsPerPageOptions = [5, 10, 25, 50, 100];

// ── Hook drag reutilizable ────────────────────────────────────────────────────
const useDraggable = () => {
  const [pos, setPos] = useState(null);
  const drag = useRef(null);
  const onDragStart = useCallback((e) => {
    if (!pos) return;
    e.preventDefault();
    drag.current = { sx: e.clientX, sy: e.clientY, ol: pos.left, ot: pos.top };
    const move = (ev) => setPos({ left: drag.current.ol + ev.clientX - drag.current.sx, top: drag.current.ot + ev.clientY - drag.current.sy });
    const up   = () => { drag.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [pos]);
  return { pos, setPos, onDragStart };
};

// ── Portal base para dropdowns arrastrables ───────────────────────────────────
const PortalPanel = ({ id, pos, onDragStart, onClose, header, children, footer, width = 256 }) => {
  useEffect(() => {
    const hs = (e) => { if (!document.getElementById(id)?.contains(e.target)) onClose(); };
    window.addEventListener('scroll', hs, true);
    window.addEventListener('resize', onClose);
    return () => { window.removeEventListener('scroll', hs, true); window.removeEventListener('resize', onClose); };
  }, [onClose, id]);

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={onClose} />
      <div id={id} style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 99999 }}
        className="bg-white rounded-xl shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div onMouseDown={onDragStart}
          className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-slate-400" />
            {header}
          </div>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose}
            className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
        {children}
        {footer && <div className="p-2 border-t border-slate-100 bg-slate-50/30">{footer}</div>}
      </div>
    </>,
    document.body
  );
};

// ── Dropdown filtro checkbox ──────────────────────────────────────────────────
const FilterDropdown = ({ accessor, anchorEl, filters, getUniqueValues, handleFilterChange, clearFilter, onClose }) => {
  const { pos, setPos, onDragStart } = useDraggable();
  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(4, r.right - 256) });
  }, [anchorEl]);
  if (!pos) return null;
  return (
    <PortalPanel id="__filter_dd__" pos={pos} onDragStart={onDragStart} onClose={onClose}
      header={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar</span>}
      footer={
        <button onClick={() => { clearFilter(accessor); onClose(); }}
          className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded transition-colors">
          Limpiar filtro
        </button>
      }>
      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
        {getUniqueValues(accessor).map((val, i) => {
          const checked = filters[accessor]?.includes(val);
          return (
            <label key={i} className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${checked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}>
              <input type="checkbox" checked={checked || false} onChange={() => handleFilterChange(accessor, val)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="truncate select-none">{val === '' ? <em className="text-slate-400">Sin valor</em> : val}</span>
            </label>
          );
        })}
      </div>
    </PortalPanel>
  );
};

// ── Dropdown rango de fechas ──────────────────────────────────────────────────
const DateRangeDropdown = ({ anchorEl, dateRange, setDateRange, onClose }) => {
  const { pos, setPos, onDragStart } = useDraggable();
  const [from, setFrom] = useState(dateRange.from || '');
  const [to,   setTo]   = useState(dateRange.to   || '');

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(4, r.right - 280) });
  }, [anchorEl]);

  if (!pos) return null;

  const apply = () => { setDateRange({ from, to }); onClose(); };
  const clear  = () => { setFrom(''); setTo(''); setDateRange({ from: '', to: '' }); onClose(); };

  return (
    <PortalPanel id="__date_dd__" pos={pos} onDragStart={onDragStart} onClose={onClose} width={280}
      header={
        <div className="flex items-center gap-1.5">
          <CalendarRange size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rango de fechas</span>
        </div>
      }>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Hasta</label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50" />
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={apply} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          Aplicar
        </button>
        <button onClick={clear} className="flex-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-medium px-3 py-2 rounded-lg border border-red-100 transition-colors">
          Limpiar
        </button>
      </div>
    </PortalPanel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const TableCard = ({
  title,
  data = [],
  columns = [],
  loading = false,
  currentPage,
  setCurrentPage,
  totalItems,
  pageSize,
  setPageSize,
  totalPages,
  enableToolbar = true,
  searchTerm,
  setSearchTerm,
  searchPlaceholder = 'Buscar registros...',
  searchableKeys,
  rowsPerPageOptions = defaultRowsPerPageOptions,
  // ── Props opcionales: activas solo si se pasan desde el padre ──
  enableDateRange = false,   // activa filtro de rango de fechas
  dateRangeKey    = null,    // accessor de la columna fecha (e.g. 'date_to_renew')
  enableExport    = false,   // activa botón exportar CSV
  exportFilename  = 'tabla', // nombre base del archivo .csv
}) => {
  const [sortConfig, setSortConfig]               = useState({ key: null, direction: 'ascending' });
  const [filters, setFilters]                     = useState({});
  const [activeFilterCol, setActiveFilterCol]     = useState(null);
  const [activeFilterAnchor, setActiveFilterAnchor] = useState(null);
  const [showDateRange, setShowDateRange]         = useState(false);
  const [dateRangeAnchor, setDateRangeAnchor]     = useState(null);
  const [dateRange, setDateRange]                 = useState({ from: '', to: '' });

  const dateRangeActive = enableDateRange && Boolean(dateRange.from || dateRange.to);

  const requestSort = (key) => {
    const d = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key, direction: d });
  };

  const getUniqueValues = (accessor) =>
    [...new Set((data || []).map((item) => String(item?.[accessor] ?? '')))].sort();

  const handleFilterChange = (accessor, value) =>
    setFilters((prev) => {
      const cur = prev[accessor] || [];
      return { ...prev, [accessor]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });

  const clearFilter = (accessor) =>
    setFilters((prev) => { const n = { ...prev }; delete n[accessor]; return n; });

  const effectiveSearchKeys = useMemo(() => {
    if (Array.isArray(searchableKeys) && searchableKeys.length > 0) return searchableKeys;
    return (columns || []).map((c) => c.accessor).filter(Boolean);
  }, [searchableKeys, columns]);

  const processedData = useMemo(() => {
    let result = [...(data || [])];

    const term = (searchTerm ?? '').trim().toLowerCase();
    if (term) result = result.filter((row) => effectiveSearchKeys.some((k) => String(row?.[k] ?? '').toLowerCase().includes(term)));

    Object.keys(filters).forEach((key) => {
      const sel = filters[key];
      if (sel?.length) result = result.filter((item) => sel.includes(String(item?.[key] ?? '')));
    });

    if (enableDateRange && dateRangeKey && (dateRange.from || dateRange.to)) {
      const from = dateRange.from ? new Date(dateRange.from)             : null;
      const to   = dateRange.to   ? new Date(dateRange.to + 'T23:59:59') : null;
      result = result.filter((row) => {
        if (!row[dateRangeKey]) return false;
        const d = new Date(row[dateRangeKey]);
        if (isNaN(d)) return false;
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }

    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        const av = a?.[sortConfig.key], bv = b?.[sortConfig.key];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number')
          return sortConfig.direction === 'ascending' ? av - bv : bv - av;
        return sortConfig.direction === 'ascending'
          ? String(av).localeCompare(String(bv), 'es', { sensitivity: 'base' })
          : String(bv).localeCompare(String(av), 'es', { sensitivity: 'base' });
      });
    }
    return result;
  }, [data, filters, sortConfig, searchTerm, effectiveSearchKeys, dateRange, dateRangeKey, enableDateRange]);

  const paginationEnabled =
    typeof currentPage === 'number' && typeof totalItems === 'number' &&
    typeof pageSize    === 'number' && typeof totalPages === 'number' &&
    typeof setCurrentPage === 'function';

  const pageRows = useMemo(() => {
    if (!paginationEnabled) return processedData;
    const s = (currentPage - 1) * pageSize;
    return processedData.slice(s, s + pageSize);
  }, [processedData, paginationEnabled, currentPage, pageSize]);

  const indexOfFirstItem = paginationEnabled ? (currentPage - 1) * pageSize : 0;
  const indexOfLastItem  = paginationEnabled ? Math.min(indexOfFirstItem + pageRows.length, totalItems) : 0;

  useEffect(() => {
    if (paginationEnabled) setCurrentPage(1);
  }, [searchTerm, pageSize, filters, dateRange, setCurrentPage, paginationEnabled]);

  // Exportar CSV con BOM UTF-8
  const exportCSV = () => {
    const exportCols = columns.filter((c) => c.accessor);
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      exportCols.map((c) => escape(c.header)).join(','),
      ...processedData.map((row) => exportCols.map((c) => escape(row[c.accessor])).join(',')),
    ].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${exportFilename}_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSortIcon = (k) => {
    if (sortConfig.key !== k) return <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-400" />;
    return sortConfig.direction === 'ascending'
      ? <ArrowUp   size={14} className="text-indigo-600" strokeWidth={2.5} />
      : <ArrowDown size={14} className="text-indigo-600" strokeWidth={2.5} />;
  };

  const handleFilterBtn = (e, accessor) => {
    e.stopPropagation();
    if (activeFilterCol === accessor) { setActiveFilterCol(null); setActiveFilterAnchor(null); }
    else { setActiveFilterCol(accessor); setActiveFilterAnchor(e.currentTarget); }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200/60 flex flex-col relative font-sans">

      {activeFilterCol && (
        <FilterDropdown
          accessor={activeFilterCol} anchorEl={activeFilterAnchor}
          filters={filters} getUniqueValues={getUniqueValues}
          handleFilterChange={handleFilterChange} clearFilter={clearFilter}
          onClose={() => { setActiveFilterCol(null); setActiveFilterAnchor(null); }}
        />
      )}

      {enableDateRange && showDateRange && (
        <DateRangeDropdown
          anchorEl={dateRangeAnchor} dateRange={dateRange}
          setDateRange={setDateRange}
          onClose={() => { setShowDateRange(false); setDateRangeAnchor(null); }}
        />
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-slate-100">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
              {(Object.keys(filters).length > 0 || dateRangeActive) && (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {Object.keys(filters).length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {Object.keys(filters).length} filtros activos
                    </span>
                  )}
                  {dateRangeActive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <CalendarRange size={11} />
                      {dateRange.from || '…'} → {dateRange.to || '…'}
                    </span>
                  )}
                  <button onClick={() => { setFilters({}); setDateRange({ from: '', to: '' }); }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted">
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>
            {loading && <div className="p-2 bg-indigo-50 rounded-full"><Loader2 className="animate-spin text-indigo-600" size={20} /></div>}
          </div>

          {enableToolbar && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap">
              {typeof searchTerm === 'string' && typeof setSearchTerm === 'function' && (
                <div className="relative w-full sm:max-w-md group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input type="text" placeholder={searchPlaceholder} value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-sm text-slate-700 placeholder:text-slate-400" />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap sm:ml-auto">

                {/* Botón rango de fechas — solo si enableDateRange */}
                {enableDateRange && (
                  <button
                    onClick={(e) => { setShowDateRange((v) => !v); setDateRangeAnchor(e.currentTarget); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                      dateRangeActive
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <CalendarRange size={14} />
                    {dateRangeActive ? `${dateRange.from || '…'} → ${dateRange.to || '…'}` : 'F. Renovación'}
                    {dateRangeActive && (
                      <span
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setDateRange({ from: '', to: '' }); }}
                        className="ml-0.5 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </span>
                    )}
                  </button>
                )}

                {/* Botón exportar — solo si enableExport */}
                {enableExport && (
                  <button onClick={exportCSV} disabled={!processedData.length}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200">
                    <Download size={14} />
                    Exportar CSV
                    <span className="ml-0.5 bg-emerald-200 text-emerald-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      {processedData.length}
                    </span>
                  </button>
                )}

                {typeof pageSize === 'number' && typeof setPageSize === 'function' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filas:</span>
                    <div className="relative">
                      <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 pr-8 cursor-pointer hover:bg-slate-100 transition-colors">
                        {rowsPerPageOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <ChevronDownIcon size={14} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-slate-600">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => {
                const isFiltered = filters[col.accessor]?.length > 0;
                const isDateCol  = enableDateRange && col.accessor === dateRangeKey;
                return (
                  <th key={idx} className="px-6 py-4 select-none relative group align-middle first:pl-6 last:pr-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex items-center gap-2 cursor-pointer transition-colors ${col.accessor ? 'hover:text-indigo-600' : ''}`}
                        onClick={() => col.accessor && requestSort(col.accessor)}>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                          {col.header}
                        </span>
                        {col.accessor && getSortIcon(col.accessor)}
                      </div>
                      {col.accessor && (
                        isDateCol ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowDateRange((v) => !v); setDateRangeAnchor(e.currentTarget); }}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              dateRangeActive
                                ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200'
                                : 'text-slate-300 hover:bg-white hover:text-slate-500 hover:shadow-sm'
                            }`}>
                            <CalendarRange size={14} strokeWidth={dateRangeActive ? 2.5 : 2} />
                          </button>
                        ) : (
                          <button onClick={(e) => handleFilterBtn(e, col.accessor)}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              isFiltered
                                ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200'
                                : 'text-slate-300 hover:bg-white hover:text-slate-500 hover:shadow-sm'
                            }`}>
                            <Filter size={14} strokeWidth={isFiltered ? 2.5 : 2} fill={isFiltered ? 'currentColor' : 'none'} />
                          </button>
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {!loading && pageRows.length > 0 ? (
              pageRows.map((row, ri) => (
                <tr key={ri} className="group hover:bg-indigo-50/30 transition-colors duration-150">
                  {columns.map((col, ci) => (
                    <td key={ci} className="px-6 py-4 text-sm text-slate-600 align-middle">
                      {col.render ? col.render(row) : <span className="text-slate-700 group-hover:text-slate-900">{row?.[col.accessor]}</span>}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    {loading ? (
                      <><Loader2 className="animate-spin mb-3 text-indigo-500" size={32} /><span className="text-sm font-medium">Cargando datos...</span></>
                    ) : (
                      <><div className="p-4 bg-slate-50 rounded-full mb-3"><Database size={32} className="text-slate-300" /></div>
                        <p className="text-slate-500 font-medium">No se encontraron resultados</p>
                        <p className="text-slate-400 text-sm mt-1">Intenta ajustar tus filtros o búsqueda.</p></>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginationEnabled && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-slate-700">{totalItems === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)}</span>
            {' '}de <span className="text-slate-700">{totalItems}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || totalItems === 0 || loading}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-1 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded select-none min-w-[2rem] text-center">
              {currentPage}
            </div>
            <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalItems === 0 || loading}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronDownIcon = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default TableCard;