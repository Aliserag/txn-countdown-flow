'use client';

import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCompactNumber } from '@/lib/utils/formatters';

export function MilestoneProgress() {
  const { progress, totalTransactions, targetMilestone, isInitialized } = useCountdown();

  if (!isInitialized) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-surface-elevated animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  const milestones = [0, 250, 500, 750, 1000];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar Container */}
      <div className="relative">
        {/* Track */}
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          {/* Progress Fill */}
          <motion.div
            className="relative h-full bg-gradient-to-r from-flow-green/80 to-flow-green rounded-full progress-shine overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Progress Head Glow */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-flow-green shadow-glow-green-intense"
          initial={{ left: 0 }}
          animate={{ left: `calc(${Math.min(progress, 100)}% - 6px)` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Milestone Markers */}
        <div className="absolute inset-0 flex justify-between pointer-events-none">
          {milestones.map((m, i) => {
            const position = (m / 1000) * 100;
            const isPassed = progress >= position;
            return (
              <div
                key={m}
                className={`
                  relative w-1 h-1 rounded-full -translate-y-[1px]
                  ${isPassed ? 'bg-flow-green' : 'bg-text-muted'}
                  ${i === 0 ? '' : i === milestones.length - 1 ? '' : ''}
                `}
                style={{ marginLeft: i === 0 ? 0 : undefined }}
              />
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3">
        {milestones.map((m, i) => {
          const position = (m / 1000) * 100;
          const isPassed = progress >= position;
          return (
            <span
              key={m}
              className={`
                text-[10px] font-mono uppercase tracking-wider
                ${isPassed ? 'text-text-secondary' : 'text-text-muted'}
                ${i === milestones.length - 1 ? 'text-flow-green font-medium' : ''}
              `}
            >
              {m === 1000 ? '1B' : m === 0 ? '0' : `${m}M`}
            </span>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-8 mt-6">
        <div className="text-center">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            Current
          </div>
          <div className="text-sm font-mono text-text-secondary">
            {formatCompactNumber(totalTransactions)}
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <div className="text-center">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            Progress
          </div>
          <div className="text-sm font-mono text-flow-green font-medium">
            {Math.min(progress, 100).toFixed(2)}%
          </div>
        </div>

        <div className="w-px h-8 bg-border" />

        <div className="text-center">
          <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            Target
          </div>
          <div className="text-sm font-mono text-text-secondary">
            {formatCompactNumber(targetMilestone)}
          </div>
        </div>
      </div>
    </div>
  );
}
