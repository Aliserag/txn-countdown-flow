'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Transaction } from '@/lib/flow/types';
import { TypeBadge } from './TypeBadge';
import { formatAddress, formatNumber, formatTimeAgo } from '@/lib/utils/formatters';

interface TransactionRowProps {
  transaction: Transaction;
  isNew?: boolean;
  index: number;
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  isNew = false,
  index,
}: TransactionRowProps) {
  const isCadence = transaction.type === 'cadence';

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.02,
      }}
      className={`
        flex items-center gap-4 px-4 py-3 rounded-lg
        bg-flow-surface/50 hover:bg-flow-surfaceHover
        border border-transparent
        ${isNew ? (isCadence ? 'border-flow-primary/30' : 'border-flow-evm/30') : ''}
        transition-colors duration-200
      `}
    >
      {/* Type Badge */}
      <TypeBadge type={transaction.type} isNew={isNew} />

      {/* Transaction Number */}
      <div className="flex-shrink-0 w-32">
        <span className="font-mono text-sm text-gray-300">
          #{formatNumber(transaction.number)}
        </span>
      </div>

      {/* Transaction ID */}
      <div className="flex-1 min-w-0">
        <a
          href={`https://flowscan.io/transaction/${transaction.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-gray-400 hover:text-white truncate block transition-colors"
        >
          {formatAddress(transaction.id, 8, 6)}
        </a>
      </div>

      {/* Proposer */}
      <div className="hidden md:block flex-shrink-0">
        <span className="font-mono text-xs text-gray-500">
          {formatAddress(transaction.proposer, 6, 4)}
        </span>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-gray-500">
          {formatTimeAgo(transaction.timestamp)}
        </span>
      </div>

      {/* New indicator */}
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`
            flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium
            ${isCadence ? 'bg-flow-primary/20 text-flow-primary' : 'bg-flow-evm/20 text-flow-evm'}
          `}
        >
          NEW
        </motion.div>
      )}
    </motion.div>
  );
});
