import axios from 'axios';

// Asegúrate de que este puerto coincida con tu uvicorn.run (8000)
const API_BASE = 'http://localhost:8000/internal/dashboard';

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
  getPool: (page, limit) => fetchEndpoint('pools', page, limit),
  getInst: (page, limit) => fetchEndpoint('installations', page, limit),

  // --- NUEVA LÓGICA DE RENOVACIONES ---
  getRenewals: async (page, limit) => {
    try {
      // Disparamos ambas peticiones en paralelo para que cargue el doble de rápido
      const [m2mResponse, planResponse] = await Promise.all([
        fetchEndpoint('renewals/m2m', page, limit),
        fetchEndpoint('renewals/plan', page, limit)
      ]);

      const m2mArray = m2mResponse?.all_data || m2mResponse?.data || [];
      const planArray = planResponse?.all_data || planResponse?.data || [];
      return [...m2mArray, ...planArray];
    } catch (error) {
      console.error("Error al obtener las renovaciones combinadas:", error);
      // Retornamos un array vacío en caso de error para que la UI no crashee
      return []; 
    }
  },

  // --- HISTÓRICO ---
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