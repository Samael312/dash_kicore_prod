import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 my-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {loading && <Loader2 className="animate-spin text-blue-500" />}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-3">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4">
                      {/* Si hay una función de renderizado personalizada, úsala, si no, muestra el valor directo */}
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center">
                  {loading ? "Cargando..." : "No hay datos disponibles"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableCard;