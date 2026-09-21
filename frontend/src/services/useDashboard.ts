import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardData } from './dashboardService';
import type { DashboardData } from '../types';

const REFRESH_MS = 5000;

interface DashboardState {
  data: DashboardData | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

/** Holds the polling loop so the Dashboard component stays presentational. */
export function useDashboard(): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboardData(controller.signal)
      .then((next) => {
        setData(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not fetch telemetry data.'
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { data, error, loading, refresh };
}
