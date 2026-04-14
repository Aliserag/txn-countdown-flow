'use client';

import { useEffect } from 'react';
import { useTransactionStream } from '@/hooks/useTransactionStream';
import { useStatsStore } from '@/stores/statsStore';
import { useTransactionStore } from '@/stores/transactionStore';

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const setStats = useStatsStore((state) => state.setStats);
  const setLoading = useTransactionStore((state) => state.setLoading);
  const setError = useTransactionStore((state) => state.setError);

  // Initialize data on mount and re-sync every 5 minutes to prevent drift
  useEffect(() => {
    async function fetchStats(isInitial = false) {
      try {
        if (isInitial) setLoading(true);

        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');

        const stats = await response.json();
        setStats({
          total: stats.total,
          evm: stats.evm,
          cadence: stats.cadence,
          blockHeight: stats.blockHeight,
        });

        if (isInitial) setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        if (isInitial) setError('Failed to load initial data');
      }
    }

    fetchStats(true);
    const syncInterval = setInterval(() => fetchStats(false), 5 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [setStats, setLoading, setError]);

  // Connect to real-time stream
  useTransactionStream();

  return <>{children}</>;
}
