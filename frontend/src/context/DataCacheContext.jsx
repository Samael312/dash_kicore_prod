// frontend/src/context/DataCacheContext.jsx
import React, { createContext, useContext, useRef, useCallback } from 'react';

const DataCacheContext = createContext(null);

/**
 * Proveedor global de caché en memoria.
 * Los datos se guardan durante la sesión del navegador.
 * Al recargar la página, la caché se vacía (comportamiento esperado).
 */
export const DataCacheProvider = ({ children }) => {
  // useRef para que la caché NO provoque re-renders al actualizarse
  const cache = useRef({});
  const pendingRequests = useRef({});

  /**
   * Obtiene datos con caché.
   * @param {string} key - Clave única para identificar el dataset (ej: 'devices', 'm2m')
   * @param {Function} fetcher - Función async que devuelve los datos si no están en caché
   * @param {Object} options
   * @param {boolean} options.forceRefresh - Si true, ignora la caché y vuelve a pedir
   * @returns {Promise<any>}
   */
  const getCachedData = useCallback(async (key, fetcher, { forceRefresh = false } = {}) => {
    // Si ya tenemos los datos y no se fuerza refresh, devolverlos
    if (!forceRefresh && cache.current[key] !== undefined) {
      return cache.current[key];
    }

    // Si ya hay una petición en vuelo para esta key, esperar a que termine
    // (evita peticiones duplicadas si dos componentes piden lo mismo a la vez)
    if (pendingRequests.current[key]) {
      return pendingRequests.current[key];
    }

    // Lanzar la petición y guardar la promesa
    const promise = fetcher()
      .then((data) => {
        cache.current[key] = data;
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
   * Comprueba si una clave está en caché.
   */
  const isCached = useCallback((key) => {
    return cache.current[key] !== undefined;
  }, []);

  return (
    <DataCacheContext.Provider value={{ getCachedData, invalidateCache, isCached }}>
      {children}
    </DataCacheContext.Provider>
  );
};

/**
 * Hook para usar la caché desde cualquier componente.
 */
export const useDataCache = () => {
  const ctx = useContext(DataCacheContext);
  if (!ctx) {
    throw new Error('useDataCache debe usarse dentro de <DataCacheProvider>');
  }
  return ctx;
};