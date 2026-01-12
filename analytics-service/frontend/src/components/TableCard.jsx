import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Loader2, ArrowUpDown, 
  ArrowUp, ArrowDown, Filter, X, Check 
} from 'lucide-react';

const TableCard = ({ 
  title, 
  data, 
  columns, 
  loading, 
  page, 
  setPage, 
  limit, 
  hasMore 
}) => {
  // --- ESTADOS ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filters, setFilters] = useState({}); // { accessor: ['valor1', 'valor2'] }
  const [activeFilterColumn, setActiveFilterColumn] = useState(null); // Qué menú de filtro está abierto

  // --- ORDENAMIENTO (Igual que antes) ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- FILTRADO ---
  
  // 1. Obtener valores únicos de una columna para mostrarlos en el menú
  const getUniqueValues = (accessor) => {
    if (!data) return [];
    const values = data.map(item => String(item[accessor] || '')); // Convertimos a string para asegurar
    return [...new Set(values)].sort();
  };

  // 2. Manejar checkbox de filtro
  const handleFilterChange = (accessor, value) => {
    setFilters(prev => {
      const currentFilters = prev[accessor] || [];
      // Si ya está filtrado, lo quitamos (toggle)
      if (currentFilters.includes(value)) {
        const newFilters = currentFilters.filter(item => item !== value);
        return { ...prev, [accessor]: newFilters };
      } 
      // Si no está, lo agregamos
      else {
        return { ...prev, [accessor]: [...currentFilters, value] };
      }
    });
  };

  // 3. Limpiar filtro de una columna
  const clearFilter = (accessor) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[accessor];
      return newFilters;
    });
  };

  // --- LÓGICA PRINCIPAL (MEMOIZADA) ---
  // Aplica primero Filtros -> Luego Ordenamiento
  const processedData = useMemo(() => {
    let result = [...data];

    // PASO 1: FILTRAR
    Object.keys(filters).forEach(key => {
      const selectedValues = filters[key];
      if (selectedValues && selectedValues.length > 0) {
        result = result.filter(item => {
          const itemValue = String(item[key] || '');
          return selectedValues.includes(itemValue);
        });
      }
    });

    // PASO 2: ORDENAR
    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        } else {
            const stringA = String(aValue).toLowerCase();
            const stringB = String(bValue).toLowerCase();
            if (stringA < stringB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (stringA > stringB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
      });
    }
    return result;
  }, [data, sortConfig, filters]);

  // --- RENDER HELPERS ---
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortConfig.direction === 'ascending' 
      ? <ArrowUp size={14} className="text-blue-600" /> 
      : <ArrowDown size={14} className="text-blue-600" />;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 my-4 relative">
      
      {/* Backdrop invisible para cerrar filtros al hacer clic fuera */}
      {activeFilterColumn && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActiveFilterColumn(null)} 
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {title}
            {Object.keys(filters).length > 0 && (
                <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Filtros activos
                </span>
            )}
        </h2>
        {loading && <Loader2 className="animate-spin text-blue-500" />}
      </div>

      <div className="overflow-x-visible"> {/* overflow visible para que se vea el dropdown */}
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, idx) => {
                const isFiltered = filters[col.accessor] && filters[col.accessor].length > 0;
                
                return (
                  <th key={idx} className="px-6 py-3 select-none relative group">
                    <div className="flex items-center justify-between gap-2">
                      
                      {/* TITULO + SORT (Clickeable) */}
                      <div 
                        className={`flex items-center gap-2 cursor-pointer ${col.accessor ? 'hover:text-blue-600' : ''}`}
                        onClick={() => col.accessor && requestSort(col.accessor)}
                      >
                        {col.header}
                        {col.accessor && getSortIcon(col.accessor)}
                      </div>

                      {/* BOTÓN FILTRO (Clickeable independiente) */}
                      {col.accessor && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar ordenar al abrir filtro
                            setActiveFilterColumn(activeFilterColumn === col.accessor ? null : col.accessor);
                          }}
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${isFiltered ? 'text-blue-600 bg-blue-100' : 'text-gray-400'}`}
                        >
                          <Filter size={14} fill={isFiltered ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>

                    {/* --- DROPDOWN MENU DE FILTRO --- */}
                    {activeFilterColumn === col.accessor && (
                      <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-md shadow-xl border border-gray-200 z-20 flex flex-col animate-fade-in text-gray-700 normal-case font-normal">
                        <div className="p-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">Filtrar por valor</span>
                            <button onClick={() => setActiveFilterColumn(null)}><X size={14} className="text-gray-400 hover:text-red-500"/></button>
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                            {getUniqueValues(col.accessor).map((val, vIdx) => {
                                const isChecked = filters[col.accessor]?.includes(val);
                                return (
                                    <label key={vIdx} className="flex items-center space-x-2 px-2 py-1 hover:bg-blue-50 rounded cursor-pointer text-sm">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked || false}
                                            onChange={() => handleFilterChange(col.accessor, val)}
                                            className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="truncate">{val === '' ? '(Vacío)' : val}</span>
                                    </label>
                                )
                            })}
                        </div>
                        
                        <div className="p-2 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => clearFilter(col.accessor)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
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
          <tbody className="divide-y divide-gray-100">
            {!loading && processedData.length > 0 ? (
              processedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white hover:bg-gray-50 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-500">
                  {loading ? (
                     <div className="flex justify-center items-center gap-2">
                        <Loader2 className="animate-spin" size={20}/> Cargando...
                     </div>
                  ) : "No hay datos que coincidan con los filtros"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {(setPage && limit) && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
             <div className="text-xs text-gray-500">
                Mostrando {processedData.length} registros (filtrados)
             </div>
             <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                    <ChevronLeft size={16}/>
                </button>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={hasMore === false || (data.length < limit) || loading}
                    className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                    <ChevronRight size={16}/>
                </button>
             </div>
        </div>
      )}
    </div>
  );
};

export default TableCard;