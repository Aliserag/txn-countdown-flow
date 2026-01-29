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

  // Initialize data on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);

        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch initial stats');
        }

        const stats = await response.json();
        setStats({
          total: stats.total,
          evm: stats.evm,
          cadence: stats.cadence,
          blockHeight: stats.blockHeight,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load initial data');
      }
    }

    fetchInitialData();
  }, [setStats, setLoading, setError]);

  // Connect to real-time stream
  useTransactionStream();

  return <>{children}</>;
}
