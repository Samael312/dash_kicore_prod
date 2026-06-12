// frontend/src/hooks/useCachedFetch.js
import { useState, useEffect, useCallback } from 'react';
import { useDataCache } from '../context/DataCacheContext';

/**
 * Hook reutilizable para cargar datos con caché automática y vencimiento por TTL.
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