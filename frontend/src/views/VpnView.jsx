// VpnView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api'; // Asegúrate de que esta ruta sea correcta
import TableCard from '../components/TableCard';
import PieChartCard from '../components/PieChartCard';
import SelectDash from '../components/SelectDash';
import { Loader2, Activity, ServerCrash, Network, AlertCircle } from 'lucide-react';

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

const VpnView = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSync, setSelectedSync] = useState('Todos');
  const [drilldownSync, setDrilldownSync] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtenemos ambos endpoints simultáneamente
        const [resCloud, resVpn] = await Promise.all([
          api.getCloudDevice(1, 5000), // Ajusta los límites según necesites
          api.getCloudVPN(1, 5000)
        ]);

        const cloudItems = Array.isArray(resCloud) ? resCloud : (resCloud?.items || []);
        const vpnItems = Array.isArray(resVpn) ? resVpn : (resVpn?.items || []);

        // Creamos diccionarios para cruce rápido
        const vpnMap = new Map(vpnItems.map(v => [v.username, v]));
        const cloudMap = new Map(cloudItems.map(c => [c.uuid, c]));

        
        // Obtenemos todos los identificadores únicos (Full Outer Join)
        const allIds = new Set([...cloudMap.keys(), ...vpnMap.keys()]);

        const mergedData = Array.from(allIds).map(id => {
          const cloud = cloudMap.get(id);
          const vpn = vpnMap.get(id);

          // Normalizamos estados booleanos
          const isCloudUp = cloud ? (cloud.state === true || cloud.state === 'Conectado') : false;
          const isVpnUp = vpn ? (vpn.link_detected === true || vpn.link_detected === 'true') : false;
          const isRouter = id.startsWith('RUT') || id.startsWith('router') || id.startsWith('rut'); // Ejemplo de cómo identificar routers por UUID


          // Lógica de Sincronización
          let syncStatus = 'Desconocido';
          if (cloud && vpn) {
            if (isCloudUp && isVpnUp) syncStatus = 'Ambos Conectados';
            else if (!isCloudUp && !isVpnUp) syncStatus = 'Ambos Desconectados';
            else if (isCloudUp && !isVpnUp) syncStatus = 'Solo Cloud (Desfasado)';
            else if (!isCloudUp && isVpnUp) syncStatus = 'Solo VPN (Desfasado)';
          } else if (cloud && !vpn) {
            syncStatus = 'Sin registro VPN';
          }else if (!cloud && vpn && isRouter) {
            syncStatus = 'Router Asignado';
          } else if (!cloud && vpn && !isRouter) {
            syncStatus = 'Huérfano VPN'; // Está en la VPN pero no en Cloud
          } 

          return {
            id,
            name: cloud?.name || '—',
            router: isRouter,
            cloud_state: isCloudUp,
            vpn_state: isVpnUp,
            cloud_last_change: cloud?.last_change || null,
            vpn_last_change: vpn?.last_change || null,
            sync_status: syncStatus,
            has_cloud: !!cloud,
            has_vpn: !!vpn
          };
        });

        setRawData(mergedData);
      } catch (e) {
        console.error("Error cargando comparativa:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let data = rawData;
    
    // Filtro del select (agrupado)
    if (selectedSync === 'Sincronizados') {
      data = data.filter(d => d.sync_status === 'Ambos Conectados' || d.sync_status === 'Ambos Desconectados');
    } else if (selectedSync === 'Desfasados') {
      data = data.filter(d => d.sync_status === 'Solo Cloud (Desfasado)' || d.sync_status === 'Solo VPN (Desfasado)');
    } else if (selectedSync === 'Estructurales') {
      data = data.filter(d => d.sync_status === 'Sin registro VPN' || d.sync_status === 'Huérfano VPN' || d.sync_status === 'Router Asignado');
    }
    
    // Filtro del gráfico (específico)
    if (drilldownSync) {
      data = data.filter(d => d.sync_status === drilldownSync);
    }
    return data;
  }, [rawData, selectedSync, drilldownSync]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  // KPIs
  const stats = useMemo(() => {
    return {
      sincronizados: filteredData.filter(d => d.sync_status.includes('Ambos')).length,
      desfasados: filteredData.filter(d => d.sync_status.includes('Desfasado')).length,
      estructurales: filteredData.filter(d => d.sync_status === 'Sin registro VPN' || d.sync_status === 'Huérfano VPN' || d.sync_status === 'Router Asignado').length,
    };
  }, [filteredData]);

  // Datos para el gráfico Pie
  const syncChartData = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      acc[curr.sync_status] = (acc[curr.sync_status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const getSyncColor = (status) => {
    switch (status) {
      case 'Ambos Conectados': return '#10B981'; // green
      case 'Ambos Desconectados': return '#64748B'; // slate
      case 'Solo Cloud (Desfasado)': return '#F59E0B'; // amber
      case 'Solo VPN (Desfasado)': return '#EF4444'; // red
      case 'Sin registro VPN': return '#94A3B8'; // light slate
      case 'Router Asignado': return '#3B82F6'; // blue
      case 'Huérfano VPN': return '#8B5CF6'; // purple
      default: return '#E2E8F0';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-10">
      
      {/* 1. HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Network className="text-blue-900" size={28} />
          <h2 className="text-2xl font-bold text-blue-900">Comparativa Cloud vs VPN</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Filtrar por Sincronización</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-gray-50"
              value={selectedSync}
              onChange={(e) => { 
                setSelectedSync(e.target.value); 
                setDrilldownSync(null); 
                setCurrentPage(1); 
              }}
            >
              <option value="Todos">Ver Todos</option>
              <option value="Sincronizados">Sincronizados (OK)</option>
              <option value="Desfasados">Desfasados (Alertas)</option>
              <option value="Estructurales">Estructurales</option>
            </select>
          </div>

          {drilldownSync && (
            <div className="flex items-end md:col-start-4">
              <button
                onClick={() => { setDrilldownSync(null); setCurrentPage(1); }}
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
          <p className="text-gray-500">Cruzando datos entre Cloud y VPN...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase">Total Equipos</span>
                <p className="text-3xl font-bold text-blue-900">{totalItems}</p>
              </div>
              <Activity className="text-blue-200" size={40} />
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-emerald-500 flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase">Sincronizados</span>
                <p className="text-3xl font-bold text-emerald-700">{stats.sincronizados}</p>
              </div>
              <Network className="text-emerald-200" size={40} />
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500 flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase">Desfasados</span>
                <p className="text-3xl font-bold text-orange-700">{stats.desfasados}</p>
              </div>
              <AlertCircle className="text-orange-200" size={40} />
            </div>
            <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500 flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase">Sin Relación / Huérfanos</span>
                <p className="text-3xl font-bold text-purple-700">{stats.estructurales}</p>
              </div>
              <ServerCrash className="text-purple-200" size={40} />
            </div>
          </div>

          {/* 3. VISUALIZACIONES */}
          <SelectDash
            storageKey="cloudVpnView:sections"
            headerTitle="Visualizaciones de Coherencia"
            sections={[
              {
                id: 'pie-sync',
                title: 'Desglose de Sincronización',
                defaultMode: 'show',
                render: () => (
                  <PieChartCard
                    title="Desglose de Sincronización"
                    data={syncChartData}
                    labelKey="name"
                    valueKey="value"
                    heightClass="h-72"
                    selectedLabel={drilldownSync}
                    getColor={(i, row) => getSyncColor(row?.__label || row?.name)}
                    onSliceClick={(label) => {
                      setDrilldownSync(label);
                      setCurrentPage(1);
                    }}
                  />
                ),
              }
            ]}
          />

          {/* 4. TABLA DE CRUCE */}
          <TableCard
            title="Detalle de Sincronización (Cloud ↔ VPN)"
            data={filteredData}
            columns={[
              {
                header: 'Dispositivo / UUID',
                accessor: 'id',
                render: (r) => (
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800">{r.name}</span>
                    <span className="font-mono text-[10px] text-gray-500">{r.id}</span>
                  </div>
                ),
              },
              {
                header: 'Estado Cloud',
                accessor: 'cloud_state',
                render: (r) => r.has_cloud ? (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.cloud_state ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.cloud_state ? 'Conectado' : 'Desconectado'}
                  </span>
                ) : <span className="text-xs text-gray-400">No existe</span>
              },
              {
                header: 'Estado VPN',
                accessor: 'vpn_state',
                render: (r) => r.has_vpn ? (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.vpn_state ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.vpn_state ? 'Detected' : 'Offline'}
                  </span>
                ) : <span className="text-xs text-gray-400">No existe</span>
              },
              {
                header: 'Última Conexión (Cruce)',
                accessor: 'cloud_last_change',
                render: (r) => (
                  <div className="flex flex-col gap-1 text-[11px]">
                    {r.has_cloud && <span className="text-blue-600">☁️ Cloud: {formatDate(r.cloud_last_change)}</span>}
                    {r.has_vpn && <span className="text-purple-600">🔒 VPN: {formatDate(r.vpn_last_change)}</span>}
                  </div>
                ),
              },
              {
                header: 'Diagnóstico',
                accessor: 'sync_status',
                render: (r) => (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border whitespace-nowrap"
                    style={{
                      backgroundColor: `${getSyncColor(r.sync_status)}18`,
                      color: getSyncColor(r.sync_status),
                      borderColor: `${getSyncColor(r.sync_status)}40`,
                    }}
                  >
                    {r.sync_status}
                  </span>
                ),
              },
            ]}
            loading={loading}
            enableToolbar
            searchTerm={searchTerm}
            setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Buscar por UUID o Nombre..."
            searchableKeys={['id', 'name', 'sync_status']}
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

export default VpnView;