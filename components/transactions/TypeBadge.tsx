'use client';

import { motion } from 'framer-motion';

interface TypeBadgeProps {
  type: 'cadence' | 'evm';
  isNew?: boolean;
}

export function TypeBadge({ type, isNew = false }: TypeBadgeProps) {
  const isCadence = type === 'cadence';

  return (
    <motion.span
      initial={isNew ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center justify-center
        px-2 py-0.5 rounded text-xs font-medium uppercase
        ${isCadence
          ? 'bg-flow-primary/20 text-flow-primary border border-flow-primary/30'
          : 'bg-flow-evm/20 text-flow-evm border border-flow-evm/30'
        }
        ${isNew ? 'ring-2 ring-offset-2 ring-offset-flow-background' : ''}
        ${isNew && isCadence ? 'ring-flow-primary/50' : ''}
        ${isNew && !isCadence ? 'ring-flow-evm/50' : ''}
      `}
    >
      {isCadence ? 'CAD' : 'EVM'}
    </motion.span>
  );
}
