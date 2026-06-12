// frontend/src/context/DataCacheContext.jsx
import React, { createContext, useContext, useRef, useCallback } from 'react';

const DataCacheContext = createContext(null);

// 1 hora en milisegundos (60 min * 60 seg * 1000 ms)
const DEFAULT_TTL = 60 * 60 * 1000; 

/**
 * Proveedor global de caché en memoria con soporte de TTL.
 * Los datos se guardan durante la sesión del navegador o hasta que expire su TTL (1 hora).
 */
export const DataCacheProvider = ({ children }) => {
  // Ahora cada key almacenará un objeto: { data: any, timestamp: number }
  const cache = useRef({});
  const pendingRequests = useRef({});

  /**
   * Obtiene datos con caché y validación de expiración (TTL).
   * @param {string} key - Clave única para identificar el dataset
   * @param {Function} fetcher - Función async que devuelve los datos si no están en caché
   * @param {Object} options
   * @param {boolean} options.forceRefresh - Si true, ignora la caché y vuelve a pedir
   * @returns {Promise<any>}
   */
  const getCachedData = useCallback(async (key, fetcher, { forceRefresh = false } = {}) => {
    const now = Date.now();
    const cachedItem = cache.current[key];

    // Verificar si el registro existe en caché
    if (cachedItem !== undefined) {
      // Validar si ya expiró el TTL de 1 hora
      const isExpired = now - cachedItem.timestamp > DEFAULT_TTL;

      if (!forceRefresh && !isExpired) {
        // La caché es válida y no ha expirado, la devolvemos inmediatamente
        return cachedItem.data;
      } else if (isExpired) {
        // Si expiró, la limpiamos proactivamente antes de continuar
        delete cache.current[key];
      }
    }

    // Si ya hay una petición idéntica en vuelo, esperar a que termine (evita duplicados)
    if (pendingRequests.current[key]) {
      return pendingRequests.current[key];
    }

    // Lanzar la petición, guardar la promesa, la data y el timestamp actual
    const promise = fetcher()
      .then((data) => {
        cache.current[key] = {
          data,
          timestamp: Date.now() // Captura el momento exacto en que se guardó
        };
        delete pendingRequests.current[key];
        return data;
      })
      .catch((err) => {
        delete pendingRequests.current[key];
        throw err;
      });

    pendingRequests.current[key] = promise;
    return promise;
  }, []);

  /**
   * Invalida (borra) una clave de caché específica o todas.
   * @param {string|null} key - Si null, borra toda la caché
   */
  const invalidateCache = useCallback((key = null) => {
    if (key === null) {
      cache.current = {};
    } else {
      delete cache.current[key];
    }
  }, []);

  /**
   * Comprueba si una clave está en caché y sigue siendo válida.
   */
  const isCached = useCallback((key) => {
    const cachedItem = cache.current[key];
    if (cachedItem === undefined) return false;
    
    // Es válida si no ha superado el tiempo límite
    return Date.now() - cachedItem.timestamp < DEFAULT_TTL;
  }, []);

  return (
    <DataCacheContext.Provider value={{ getCachedData, invalidateCache, isCached }}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const ctx = useContext(DataCacheContext);
  if (!ctx) {
    throw new Error('useDataCache debe usarse dentro de <DataCacheProvider>');
  }
  return ctx;
};