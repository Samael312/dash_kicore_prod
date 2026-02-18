// TableCard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Search,
  Database,
} from 'lucide-react';

const defaultRowsPerPageOptions = [5, 10, 25, 50, 100];

const TableCard = ({
  title,
  data = [],
  columns = [],
  loading = false,

  // --- PAGINACIÓN ---
  currentPage,
  setCurrentPage,
  totalItems,
  pageSize,
  setPageSize,
  totalPages,

  // --- TOOLBAR / SEARCH ---
  enableToolbar = true,
  searchTerm,
  setSearchTerm,
  searchPlaceholder = 'Buscar registros...',
  searchableKeys,

  // --- ROWS PER PAGE ---
  rowsPerPageOptions = defaultRowsPerPageOptions,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filters, setFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const getUniqueValues = (accessor) => {
    const values = (data || []).map((item) => String(item?.[accessor] ?? ''));
    return [...new Set(values)].sort();
  };

  const handleFilterChange = (accessor, value) => {
    setFilters((prev) => {
      const current = prev[accessor] || [];
      if (current.includes(value)) return { ...prev, [accessor]: current.filter((v) => v !== value) };
      return { ...prev, [accessor]: [...current, value] };
    });
  };

  const clearFilter = (accessor) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[accessor];
      return next;
    });
  };

  const effectiveSearchKeys = useMemo(() => {
    if (Array.isArray(searchableKeys) && searchableKeys.length > 0) return searchableKeys;
    return (columns || []).map((c) => c.accessor).filter(Boolean);
  }, [searchableKeys, columns]);

  // --- LÓGICA PRINCIPAL: Search -> Column filters -> Sort ---
  const processedData = useMemo(() => {
    let result = [...(data || [])];

    // 0) Search (sobre todo el dataset)
    const term = (searchTerm ?? '').trim().toLowerCase();
    if (term) {
      result = result.filter((row) =>
        effectiveSearchKeys.some((k) => String(row?.[k] ?? '').toLowerCase().includes(term))
      );
    }

    // 1) Column filters
    Object.keys(filters).forEach((key) => {
      const selected = filters[key];
      if (selected?.length) {
        result = result.filter((item) => selected.includes(String(item?.[key] ?? '')));
      }
    });

    // 2) Sort
    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        const aValue = a?.[sortConfig.key];
        const bValue = b?.[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        const stringA = String(aValue).toLowerCase();
        const stringB = String(bValue).toLowerCase();
        if (stringA < stringB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (stringA > stringB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig, searchTerm, effectiveSearchKeys]);

  // --- PAGINACIÓN (sobre processedData, NO sobre data recortada) ---
  const paginationEnabled =
    typeof currentPage === 'number' &&
    typeof totalItems === 'number' &&
    typeof pageSize === 'number' &&
    typeof totalPages === 'number' &&
    typeof setCurrentPage === 'function';

  const pageRows = useMemo(() => {
    if (!paginationEnabled) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, paginationEnabled, currentPage, pageSize]);

  const indexOfFirstItem = paginationEnabled ? (currentPage - 1) * pageSize : 0;
  const indexOfLastItem = paginationEnabled
    ? Math.min(indexOfFirstItem + pageRows.length, totalItems)
    : 0;

  // Reset a página 1 si cambian search o pageSize
  useEffect(() => {
    if (paginationEnabled) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pageSize]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown size={14} className="text-slate-300 transition-colors group-hover:text-slate-400" />;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp size={14} className="text-indigo-600" strokeWidth={2.5} />
    ) : (
      <ArrowDown size={14} className="text-indigo-600" strokeWidth={2.5} />
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200/60 flex flex-col relative overflow-hidden font-sans">
      {activeFilterColumn && (
        <div
          className="fixed inset-0 z-20 bg-black/5 backdrop-blur-[1px]"
          onClick={() => setActiveFilterColumn(null)}
        />
      )}

      {/* HEADER & TOOLBAR */}
      <div className="bg-white border-b border-slate-100">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>

              {Object.keys(filters).length > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {Object.keys(filters).length} filtros activos
                  </span>
                  <button
                    onClick={() => setFilters({})}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted"
                  >
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            {loading && (
              <div className="p-2 bg-indigo-50 rounded-full">
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              </div>
            )}
          </div>

          {enableToolbar && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Search */}
              {typeof searchTerm === 'string' && typeof setSearchTerm === 'function' && (
                <div className="relative w-full sm:max-w-md group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg w-full 
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white
                               transition-all duration-200 text-sm text-slate-700 placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}

              {/* Rows selector */}
              {typeof pageSize === 'number' && typeof setPageSize === 'function' && (
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filas:</span>
                  <div className="relative">
                    <select
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      {rowsPerPageOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <ChevronDownIcon size={14} />
                    </div>
                  </div>
                </div>
              )}
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
                return (
                  <th
                    key={idx}
                    className="px-6 py-4 select-none relative group align-middle first:pl-6 last:pr-6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${
                          col.accessor ? 'hover:text-indigo-600' : ''
                        }`}
                        onClick={() => col.accessor && requestSort(col.accessor)}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                          {col.header}
                        </span>
                        {col.accessor && getSortIcon(col.accessor)}
                      </div>

                      {col.accessor && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterColumn(activeFilterColumn === col.accessor ? null : col.accessor);
                          }}
                          className={`p-1.5 rounded-md transition-all duration-200 ${
                            isFiltered
                              ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200'
                              : 'text-slate-300 hover:bg-white hover:text-slate-500 hover:shadow-sm'
                          }`}
                        >
                          <Filter size={14} strokeWidth={isFiltered ? 2.5 : 2} fill={isFiltered ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </div>

                    {/* DROPDOWN FILTER */}
                    {activeFilterColumn === col.accessor && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-30 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-right overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar</span>
                          <button
                            onClick={() => setActiveFilterColumn(null)}
                            className="p-1 hover:bg-red-50 hover:text-red-500 rounded transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                          {getUniqueValues(col.accessor).map((val, vIdx) => {
                            const isChecked = filters[col.accessor]?.includes(val);
                            return (
                              <label
                                key={vIdx}
                                className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                  isChecked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked || false}
                                  onChange={() => handleFilterChange(col.accessor, val)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition duration-150 ease-in-out"
                                />
                                <span className="truncate select-none">
                                  {val === '' ? <em className="text-slate-400">Sin valor</em> : val}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="p-2 border-t border-slate-100 bg-slate-50/30">
                          <button
                            onClick={() => clearFilter(col.accessor)}
                            className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded transition-colors"
                          >
                            Limpiar filtro
                          </button>
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {!loading && pageRows.length > 0 ? (
              pageRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="group hover:bg-indigo-50/30 transition-colors duration-150">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 text-sm text-slate-600 align-middle">
                      {col.render ? (
                        col.render(row)
                      ) : (
                        <span className="text-slate-700 group-hover:text-slate-900">{row?.[col.accessor]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mb-3 text-indigo-500" size={32} />
                        <span className="text-sm font-medium">Cargando datos...</span>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-slate-50 rounded-full mb-3">
                          <Database size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No se encontraron resultados</p>
                        <p className="text-slate-400 text-sm mt-1">Intenta ajustar tus filtros o búsqueda.</p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      {paginationEnabled && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-medium">
            <span className="text-slate-700">
              {totalItems === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)}
            </span>{' '}
            de <span className="text-slate-700">{totalItems}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalItems === 0 || loading}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="px-4 py-1 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded select-none min-w-[2rem] text-center">
              {currentPage}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalItems === 0 || loading}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronDownIcon = ({ size }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default TableCard;
