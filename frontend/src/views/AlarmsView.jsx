import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Clock, 
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import TableCard from '../components/TableCard';

const AlarmsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // MOCK DATA
  const mockAlarms = useMemo(() => [
    { 
      id: 1, 
      severity: 'critical', 
      type: 'Connectivity Loss', 
      device: 'BOARD-7429', 
      org: 'Keyter Technologies', 
      timestamp: '2026-02-18 10:15:22', 
      status: 'active',
      message: 'Persistent timeout on main gateway'
    },
    { 
      id: 2, 
      severity: 'warning', 
      type: 'Data Limit 90%', 
      device: 'SIM-8821', 
      org: 'Intarcon SL', 
      timestamp: '2026-02-18 09:44:10', 
      status: 'active',
      message: 'SIM reached 90% of daily quota'
    },
    { 
      id: 3, 
      severity: 'info', 
      type: 'System Update', 
      device: 'KIWI-V3', 
      org: 'Kiconex Internal', 
      timestamp: '2026-02-17 23:01:05', 
      status: 'resolved',
      message: 'Firmware 2.4.1 successful'
    },
    { 
      id: 4, 
      severity: 'critical', 
      type: 'Hardware Failure', 
      device: 'BOARD-2110', 
      org: 'Keyter Technologies', 
      timestamp: '2026-02-17 18:22:45', 
      status: 'active',
      message: 'Fan sensor reporting 0 RPM'
    },
    { 
      id: 5, 
      severity: 'warning', 
      type: 'High Latency', 
      device: 'GW-ALPHA', 
      org: 'Global Logistics', 
      timestamp: '2026-02-17 14:10:12', 
      status: 'resolved',
      message: 'Ping response > 500ms for 10 min'
    },
    { 
      id: 6, 
      severity: 'critical', 
      type: 'Security Alert', 
      device: 'BOARD-9901', 
      org: 'Keyter Technologies', 
      timestamp: '2026-02-17 12:05:33', 
      status: 'active',
      message: 'Unauthorized login attempt detected'
    },
    { 
      id: 7, 
      severity: 'info', 
      type: 'Device Reboot', 
      device: 'KIWI-PRO', 
      org: 'Intarcon SL', 
      timestamp: '2026-02-17 08:30:00', 
      status: 'resolved',
      message: 'Scheduled maintenance reboot'
    }
  ], []);

  const renderSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> CRÍTICO</span>;
      case 'warning':
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Info size={12}/> AVISO</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock size={12}/> INFO</span>;
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="text-red-600 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Activa</span>;
    }
    return <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={14}/> Resuelta</span>;
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-10">
      {/* HEADER */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
          <Bell className="text-blue-600" /> Historial de Alarmas (Mock)
        </h2>
        <p className="text-sm text-gray-500">Visualización de eventos y alertas críticas del sistema.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
          <span className="text-gray-500 text-xs font-bold uppercase">Total Eventos</span>
          <div className="text-3xl font-bold text-blue-900 mt-1">124</div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-red-600">
          <span className="text-gray-500 text-xs font-bold uppercase">Críticas Activas</span>
          <div className="text-3xl font-bold text-red-600 mt-1">4</div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-orange-500">
          <span className="text-gray-500 text-xs font-bold uppercase">Avisos Activos</span>
          <div className="text-3xl font-bold text-orange-600 mt-1">12</div>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
          <span className="text-gray-500 text-xs font-bold uppercase">Resueltas (24h)</span>
          <div className="text-3xl font-bold text-green-600 mt-1">18</div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <TableCard
        title="Alertas Recientes"
        data={mockAlarms}
        columns={[
          { header: 'Severidad', accessor: 'severity', render: (r) => renderSeverityBadge(r.severity) },
          { header: 'Tipo', accessor: 'type', render: (r) => <span className="font-semibold text-gray-800">{r.type}</span> },
          { header: 'Dispositivo', accessor: 'device', render: (r) => <span className="font-mono text-xs">{r.device}</span> },
          { header: 'Organización', accessor: 'org' },
          { header: 'Fecha/Hora', accessor: 'timestamp', render: (r) => <span className="text-gray-500 text-xs">{r.timestamp}</span> },
          { header: 'Estado', accessor: 'status', render: (r) => renderStatusBadge(r.status) },
          { 
            header: 'Acciones', 
            accessor: 'actions', 
            render: (r) => (
              <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                VER <ArrowRight size={14}/>
              </button>
            )
          }
        ]}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Buscar por dispositivo, tipo u organización..."
        pageSize={rowsPerPage}
        setPageSize={setRowsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={mockAlarms.length}
        totalPages={1}
      />
    </div>
  );
};

export default AlarmsView;
