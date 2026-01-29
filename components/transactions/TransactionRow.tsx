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
      initial={isNew ? { opacity: 0, x: -10 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.015,
      }}
      className="tx-row mx-2 px-4 py-3 rounded-lg flex items-center gap-4"
    >
      {/* Type indicator */}
      <TypeBadge type={transaction.type} isNew={isNew} />

      {/* Transaction number */}
      <div className="flex-shrink-0 w-28">
        <span className="font-mono text-xs text-text-secondary tabular-nums">
          #{formatNumber(transaction.number)}
        </span>
      </div>

      {/* Transaction hash */}
      <div className="flex-1 min-w-0">
        <a
          href={`https://flowscan.io/transaction/${transaction.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-text-tertiary hover:text-text-primary truncate block transition-colors duration-200"
        >
          {formatAddress(transaction.id, 10, 8)}
        </a>
      </div>

      {/* Proposer - hidden on mobile */}
      <div className="hidden lg:block flex-shrink-0">
        <span className="font-mono text-[11px] text-text-muted">
          {formatAddress(transaction.proposer, 6, 4)}
        </span>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-[11px] text-text-muted">
          {formatTimeAgo(transaction.timestamp)}
        </span>
      </div>

      {/* New indicator */}
      {isNew && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className={`
            flex-shrink-0 w-1.5 h-1.5 rounded-full
            ${isCadence ? 'bg-flow-green shadow-glow-green' : 'bg-flow-blue'}
          `}
        />
      )}
    </motion.div>
  );
});
