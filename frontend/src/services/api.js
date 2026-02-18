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
  getRenewals: (page, limit) => fetchEndpoint('renewals', page, limit),
  getPool: (page, limit) => fetchEndpoint('pools', page, limit),

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