// frontend/src/hooks/useCachedFetch.js
import { useState, useEffect, useCallback } from 'react';
import { useDataCache } from '../context/DataCacheContext';

/**
 * Hook reutilizable para cargar datos con caché automática.
 *
 * @param {string} cacheKey   - Clave única en la caché (ej: 'devices', 'm2m')
 * @param {Function} fetcher  - Función async sin argumentos que devuelve los datos
 * @param {Object} options
 * @param {any[]} options.deps         - Dependencias extra que fuerzan re-fetch (como parámetros)
 * @param {boolean} options.skip       - Si true, no hace nada (útil para condicionales)
 * @param {any} options.initialData    - Valor inicial mientras carga
 *
 * @returns {{ data, loading, error, refresh }}
 *
 * Uso básico:
 *   const { data, loading } = useCachedFetch('devices', () => api.getDevices(1, 5000));
 *
 * Con parámetros dinámicos (la clave cambia → nueva petición si no está en caché):
 *   const { data, loading } = useCachedFetch(
 *     `installations-${years}`,
 *     () => api.getInst(1, 5000, years),
 *     { deps: [years] }
 *   );
 *
 * Forzar refresh manual:
 *   const { data, refresh } = useCachedFetch('m2m', () => api.getM2M(1, 5000));
 *   <button onClick={refresh}>Actualizar</button>
 */
const useCachedFetch = (cacheKey, fetcher, { deps = [], skip = false, initialData = [] } = {}) => {
  const { getCachedData } = useDataCache();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (skip) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getCachedData(cacheKey, fetcher, { forceRefresh });
        setData(result ?? initialData);
      } catch (err) {
        console.error(`[useCachedFetch] Error cargando "${cacheKey}":`, err);
        setError(err);
        setData(initialData);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, getCachedData, skip, ...deps]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, error, refresh };
};

export default useCachedFetch;