'use client';

import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCompactNumber, formatNumber } from '@/lib/utils/formatters';

export function MilestoneProgress() {
  const { progress, totalTransactions, targetMilestone, isInitialized } = useCountdown();

  if (!isInitialized) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="h-4 bg-flow-surface rounded-full overflow-hidden">
          <div className="h-full bg-gray-700 animate-pulse" style={{ width: '30%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{formatCompactNumber(totalTransactions)}</span>
        <span className="text-flow-primary font-medium">{progress.toFixed(2)}%</span>
        <span>{formatCompactNumber(targetMilestone)}</span>
      </div>

      <div className="relative h-4 bg-flow-surface rounded-full overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-flow-primary/20 to-transparent"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />

        {/* Main progress bar */}
        <motion.div
          className="h-full bg-gradient-to-r from-flow-primary to-emerald-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Animated glow at the edge */}
        <motion.div
          className="absolute top-0 bottom-0 w-2 bg-white/50 blur-sm"
          style={{ left: `${Math.min(progress, 100)}%` }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>250M</span>
        <span>500M</span>
        <span>750M</span>
        <span>1B</span>
      </div>
    </div>
  );
}
