'use client';

import { motion } from 'framer-motion';

interface TypeBadgeProps {
  type: 'cadence' | 'evm';
  isNew?: boolean;
}

export function TypeBadge({ type, isNew = false }: TypeBadgeProps) {
  const isCadence = type === 'cadence';

  return (
    <div
      className={`
        relative flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider
        ${isCadence
          ? 'bg-flow-green/10 text-flow-green'
          : 'bg-flow-blue/10 text-flow-blue'
        }
      `}
    >
      {isCadence ? 'CDC' : 'EVM'}

      {/* Pulse effect for new transactions */}
      {isNew && (
        <motion.div
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`
            absolute inset-0 rounded
            ${isCadence ? 'bg-flow-green' : 'bg-flow-blue'}
          `}
        />
      )}
    </div>
  );
}
