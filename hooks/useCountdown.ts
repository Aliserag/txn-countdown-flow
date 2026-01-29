'use client';

import { useMemo } from 'react';
import { useStatsStore, useRemainingTransactions, useProgressPercentage } from '@/stores/statsStore';
import { getDigits } from '@/lib/utils/formatters';

export function useCountdown() {
  const totalTransactions = useStatsStore((state) => state.totalTransactions);
  const targetMilestone = useStatsStore((state) => state.targetMilestone);
  const remaining = useRemainingTransactions();
  const progress = useProgressPercentage();
  const isInitialized = useStatsStore((state) => state.isInitialized);

  // Digits for countdown (remaining)
  const digits = useMemo(() => {
    return getDigits(remaining, 10);
  }, [remaining]);

  // Digits for total transactions (hero number)
  const totalDigits = useMemo(() => {
    return getDigits(totalTransactions, 10);
  }, [totalTransactions]);

  const isComplete = remaining <= 0;
  const isCritical = remaining < 1000;
  const isNearMilestone = remaining < 100000;

  return {
    remaining,
    digits,
    totalDigits,
    progress,
    isComplete,
    isCritical,
    isNearMilestone,
    totalTransactions,
    targetMilestone,
    isInitialized,
  };
}
