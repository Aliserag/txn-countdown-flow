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
            className="glass-card rounded-2xl p-6 h-28 animate-pulse"
          >
            <div className="h-3 w-24 bg-surface-elevated rounded mb-4" />
            <div className="h-8 w-32 bg-surface-elevated rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Total"
        value={totalTransactions}
        type="total"
      />
      <StatCard
        label="Cadence"
        value={cadenceCount}
        type="cadence"
        description="Native Flow transactions"
      />
      <StatCard
        label="EVM"
        value={evmCount}
        type="evm"
        description="Ethereum-compatible"
      />
    </div>
  );
}
