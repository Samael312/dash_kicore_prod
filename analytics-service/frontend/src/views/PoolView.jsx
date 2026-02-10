import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../services/api';
import { Layers, Activity, Search, Loader2 } from 'lucide-react';

import TableCard from '../components/TableCard';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, ChartLegend, Filler
);

const PoolView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [timeRange, setTimeRange] = useState('semanal');
  const [historyData, setHistoryData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.getPool(1, 5000);
        setData(res || []);
      } catch (error) {
        console.error('Error fetching pools:', error);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const uniqueOrgs = useMemo(() => {
    const orgs = [...new Set(data.map(item => item.commercialGroup))];
    return orgs.filter(Boolean).sort();
  }, [data]);

  // 1) Filtro por organización
  const filteredByOrg = useMemo(() => {
    if (selectedOrg === 'ALL') return data;
    return data.filter(item => item.commercialGroup === selectedOrg);
  }, [data, selectedOrg]);

  // 2) Enriquecer con status_label (para filtrar por label)
  const dataWithLabels = useMemo(() => {
    return filteredByOrg.map((r) => {
      const p = r.usage_percent || 0;
      let status_label = 'Normal';
      if (p > 90) status_label = 'Crítico';
      else if (p > 75) status_label = 'Alto';
      return { ...r, status_label };
    });
  }, [filteredByOrg]);

  // Resetear página al filtrar/cambiar pageSize/buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOrg, rowsPerPage, searchTerm]);

  // 3) Paginación sobre dataWithLabels
  const totalItems = dataWithLabels.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = dataWithLabels.slice(indexOfFirstItem, indexOfLastItem);

  // KPIs (org filter + labels)
  const stats = useMemo(() => {
    return dataWithLabels.reduce((acc, curr) => ({
      totalSims: acc.totalSims + (curr.sims_total || 0),
      activeSims: acc.activeSims + (curr.sims_active || 0),
      consumed: acc.consumed + (curr.bytes_consumed || 0),
      limit: acc.limit + (curr.bytes_limit || 0),
    }), { totalSims: 0, activeSims: 0, consumed: 0, limit: 0 });
  }, [dataWithLabels]);

  // Gráfica barras (top 20) basada en dataWithLabels
  const chartData = useMemo(() => {
    return dataWithLabels
      .map(item => ({
        name: item.commercialGroup,
        group: item.commercialGroup,
        Consumo: parseFloat(((item.bytes_consumed || 0) / (1024 ** 3)).toFixed(2)),
        Limite: parseFloat(((item.bytes_limit || 0) / (1024 ** 3)).toFixed(2)),
        percent: item.usage_percent || 0
      }))
      .sort((a, b) => b.Consumo - a.Consumo)
      .slice(0, 20);
  }, [dataWithLabels]);

  // Histórico (mock) basado en dataWithLabels
  useEffect(() => {
    if (loading) return;

    const currentTotalGB =
      dataWithLabels.reduce((acc, item) => acc + (item.bytes_consumed || 0), 0) / (1024 ** 3);

    let labels = [];
    let dataPoints = [];

    if (timeRange === 'mensual') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      dataPoints = labels.map((_, i) => {
        const factor = 0.5 + (0.1 * i);
        return Number((currentTotalGB * factor * (0.9 + Math.random() * 0.2)).toFixed(2));
      });
    } else {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      dataPoints = labels.map((_, i) => {
        const factor = 0.8 + (0.05 * i);
        return Number((currentTotalGB * factor * (0.95 + Math.random() * 0.1)).toFixed(2));
      });
    }

    setHistoryData({
      labels,
      datasets: [
        {
          label: 'Consumo Global (GB)',
          data: dataPoints,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
        }
      ]
    });
  }, [dataWithLabels, timeRange, loading]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  if (loading) return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={48} />
        <p className="text-gray-500">Cargando Dashboard...</p>
      </div>
    );

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen font-sans">

      {/* 1. CONTROLES (Org) */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-700">Monitor de Pools de Datos</h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search size={18} className="text-gray-400" />
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="block w-full md:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
          >
            <option value="ALL">Todas las Organizaciones</option>
            {uniqueOrgs.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">SIMs Totales</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalSims}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">SIMs Activas</p>
          <p className="text-2xl font-bold text-gray-800">{stats.activeSims}</p>
          <p className="text-xs text-green-600 mt-1">
            {stats.totalSims > 0 ? ((stats.activeSims / stats.totalSims) * 100).toFixed(1) : 0}% Activación
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 font-medium">Datos Consumidos (Global)</p>
          <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.consumed)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 font-medium">Límite Contratado</p>
          <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.limit)}</p>
          <p className="text-xs text-orange-600 mt-1">
            Espacio libre: {formatBytes(Math.max(0, stats.limit - stats.consumed))}
          </p>
        </div>
      </div>

      {/* 3. GRÁFICA BARRAS */}
      <div className="bg-white p-6 rounded-lg shadow-sm h-[500px]">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Consumo vs Límite (Top Pools - GB)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip formatter={(value, name) => [`${value} GB`, name]} labelStyle={{ color: '#333' }} />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="Consumo" fill="#8884d8" name="Consumo (GB)" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.percent > 90 ? '#ef4444' : '#6366f1'} />
              ))}
            </Bar>
            <Bar dataKey="Limite" fill="#6a6e73" name="Límite (GB)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4. HISTÓRICO */}
      <div className="bg-white p-6 rounded shadow border border-gray-200 w-full flex flex-col h-[400px]">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Activity size={18} className="text-blue-500" /> Tendencia de Consumo
          </h3>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => setTimeRange('semanal')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'semanal' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setTimeRange('mensual')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeRange === 'mensual' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mensual
            </button>
          </div>
        </div>
        <div className="flex-grow w-full relative">
          <Line options={lineOptions} data={historyData} />
        </div>
      </div>

      {/* 5. TABLA */}
      <TableCard
        title="Pools"
        data={currentItems}
        columns={[
          { header: "Pool ID", accessor: "pool_id", render: (r) => <span className="font-mono font-bold text-blue-700 text-xs">{r.pool_id}</span> },
          { header: "Organización", accessor: "commercialGroup", render: (r) => <span className="text-gray-600 font-medium">{r.commercialGroup}</span> },
          {
            header: "SIMs Activas",
            accessor: "sims_active",
            render: (r) => (
              <div>
                <span className="font-bold text-green-700">{r.sims_active}</span>
                <span className="text-gray-400 text-xs mx-1">/</span>
                <span className="text-gray-500 text-xs">{r.sims_total}</span>
              </div>
            )
          },
          {
            header: "Consumo",
            accessor: "bytes_consumed",
            render: (r) => (
              <div className="w-32">
                <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                  <span>{formatBytes(r.bytes_consumed)}</span>
                  <span>{formatBytes(r.bytes_limit)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(r.usage_percent || 0) > 90 ? 'bg-red-500' : (r.usage_percent || 0) > 75 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(r.usage_percent || 0, 100)}%` }}
                  />
                </div>
              </div>
            )
          },
          {
            header: "Estado",
            accessor: "status_label", // ✅ filtra por label
            render: (r) => {
              const p = r.usage_percent || 0;
              const label = r.status_label || 'Normal';
              let color = 'bg-green-100 text-green-800';
              if (label === 'Crítico') color = 'bg-red-100 text-red-800';
              else if (label === 'Alto') color = 'bg-yellow-100 text-yellow-800';
              return (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}>
                  {label} ({p}%)
                </span>
              );
            }
          }
        ]}
        loading={loading}
        enableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchPlaceholder="Buscar Pool ID, Grupo o Estado..."
        searchableKeys={["pool_id", "commercialGroup", "status_label"]}
        pageSize={rowsPerPage}
        setPageSize={setRowsPerPage}
        rowsPerPageOptions={[5, 10, 20]}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        totalPages={totalPages}
      />
    </div>
  );
};

export default PoolView;