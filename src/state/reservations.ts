import { useCallback, useEffect, useRef, useState } from 'react';
import { reservationsApi } from '../api/reservations';
import type { Reservation } from '../types';

/**
 * `useReservations(date)` — fetch'inam visas rezervacijas tai datai. Per-hook
 * cache (Map<date, Reservation[]>) sumažina round-trip'us, kai user'is
 * šokinėja tarp savaitės dienų. `invalidate()` reset'ina cache'ą ir
 * re-fetch'ina einamą datą.
 *
 * NE React Query — paprastas useState/useEffect; backend Phase 2 endpoint'as
 * ne tiek sudėtingas, kad reikėtų server cache lib'o.
 */
export function useReservations(date: string) {
  const cacheRef = useRef<Map<string, Reservation[]>>(new Map());
  const [data, setData] = useState<Reservation[] | null>(() => cacheRef.current.get(date) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (d: string, force = false) => {
      if (!force) {
        const cached = cacheRef.current.get(d);
        if (cached) {
          setData(cached);
          return;
        }
      }
      setIsLoading(true);
      setError(null);
      try {
        const items = await reservationsApi.byDate(d);
        cacheRef.current.set(d, items);
        setData(items);
      } catch (e) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const invalidate = useCallback(() => {
    cacheRef.current.clear();
    void load(date, true);
  }, [date, load]);

  return { data, isLoading, error, invalidate };
}
