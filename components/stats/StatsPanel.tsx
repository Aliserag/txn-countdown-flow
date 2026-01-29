'use client';

import { useStatsStore } from '@/stores/statsStore';
import { StatCard } from './StatCard';

export function StatsPanel() {
  const totalTransactions = useStatsStore((state) => state.totalTransactions);
  const cadenceCount = useStatsStore((state) => state.cadenceCount);
  const evmCount = useStatsStore((state) => state.evmCount);
  const isInitialized = useStatsStore((state) => state.isInitialized);

  if (!isInitialized) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-flow-surface rounded-xl p-6 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total Transactions"
        value={totalTransactions}
        type="total"
      />
      <StatCard
        label="Cadence Transactions"
        value={cadenceCount}
        type="cadence"
      />
      <StatCard
        label="EVM Transactions"
        value={evmCount}
        type="evm"
      />
    </div>
  );
}
