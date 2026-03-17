import axios from 'axios';

// Asegúrate de que este puerto coincida con tu uvicorn.run (8000)
// Usar variable de entorno de Vite o fallback al dominio con HTTPS (vía proxy Apache)
//const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/internal/dashboard';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://metrics.kiconex.com/internal/dashboard';

// Función genérica para reutilizar lógica
const fetchEndpoint = async (endpoint, page, limit) => {
  const offset = (page - 1) * limit;
  try {
    const response = await axios.get(`${API_BASE}/${endpoint}`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

export const api = {
  getDevices: (page, limit) => fetchEndpoint('devices', page, limit),
  getKiwi: (page, limit) => fetchEndpoint('kiwi', page, limit),
  getInfo: (page, limit) => fetchEndpoint('info', page, limit),
  getM2M: (page, limit) => fetchEndpoint('m2m', page, limit),
 getRenewals: async (page, limit) => {
  try {
    const resolvedLimit  = limit ?? 5000;
    const resolvedOffset = page ? (page - 1) * resolvedLimit : 0;

    const [m2mResponse, planResponse] = await Promise.all([
      axios.get(`${API_BASE}/renewals/m2m`, {
        params: { limit: resolvedLimit, offset: resolvedOffset, show_all: false, from_date: '1970-01-01', to: '2100-12-31', raw: false }
      }),
      axios.get(`${API_BASE}/renewals/plan`, {
        params: { limit: resolvedLimit, offset: resolvedOffset, show_all: false, from_date: '1970-01-01', to: '2100-12-31', raw: false }
      }),
    ]);

    const m2mArray  = m2mResponse.data?.all_data  || m2mResponse.data?.data  || [];
    const planArray = planResponse.data?.all_data || planResponse.data?.data || [];
    return [...m2mArray, ...planArray];
  } catch (error) {
    console.error('Error al obtener las renovaciones combinadas:', error);
    return [];
  }
},
  getPool: (page, limit) => fetchEndpoint('pools', page, limit),
  getInst: (page, limit) => fetchEndpoint('installations', page, limit),
  getAlarmStats: async () => {
    try {
      const response = await axios.get(`${API_BASE}/alarms/stats`);
      return response.data;
    } catch (error) {
      console.error("Error fetching alarm stats:", error);
      return null;
    }
  },
  getAlarmHistory: async (limit = 50) => {
    try {
      const response = await axios.get(`${API_BASE}/alarms/history`, { params: { limit } });
      return response.data;
    } catch (error) {
      console.error("Error fetching alarm history:", error);
      return [];
    }
  },

  // --- CORRECCIÓN ---
  getHistory: async (icc, payload) => {
    try {
      const response = await axios.post(`${API_BASE}/m2m/${icc}/history`, payload);
      
      return response.data;
    } catch (error) {
      console.error("Error en getHistory:", error);
      // Retornamos estructura vacía para evitar romper la UI si falla
      return { labels: [], datasets: [] }; 
    }
  }
};