import { useCallback, useEffect, useRef, useState } from 'react';

export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  // mode: undefined → to'liq yuklash (LoadingState ko'rsatiladi),
  //       'refresh'  → pull-to-refresh (mavjud kontent qoladi, spinner aylanadi).
  const run = useCallback(async (mode) => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current) {
        setData(result);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  const reload = useCallback(() => run(), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);

  return { data, loading, refreshing, error, reload, refresh };
}
