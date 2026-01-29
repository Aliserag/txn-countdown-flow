'use client';

import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions, useTransactionLoading } from '@/stores/transactionStore';
import { TransactionRow } from './TransactionRow';
import { Transaction } from '@/lib/flow/types';

export function TransactionFeed() {
  const transactions = useTransactions();
  const isLoading = useTransactionLoading();
  const parentRef = useRef<HTMLDivElement>(null);
  const [newTxIds, setNewTxIds] = useState<Set<string>>(new Set());
  const prevTxIdsRef = useRef<Set<string>>(new Set());

  // Track new transactions
  useEffect(() => {
    const currentIds = new Set(transactions.map((tx) => tx.id));
    const newIds = new Set<string>();

    transactions.forEach((tx) => {
      if (!prevTxIdsRef.current.has(tx.id)) {
        newIds.add(tx.id);
      }
    });

    if (newIds.size > 0) {
      setNewTxIds(newIds);

      // Clear "new" status after 3 seconds
      const timer = setTimeout(() => {
        setNewTxIds(new Set());
      }, 3000);

      return () => clearTimeout(timer);
    }

    prevTxIdsRef.current = currentIds;
  }, [transactions]);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  if (isLoading && transactions.length === 0) {
    return (
      <div className="bg-flow-surface/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Live Transactions</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-flow-surface rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-flow-surface/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Live Transactions</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-4">📡</div>
          <p>Waiting for transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-flow-surface/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Live Transactions</h2>
        <span className="text-sm text-gray-400">
          Showing {transactions.length} most recent
        </span>
      </div>

      <div
        ref={parentRef}
        className="h-[400px] overflow-auto rounded-lg"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const transaction = transactions[virtualRow.index];
              const isNew = newTxIds.has(transaction.id);

              return (
                <div
                  key={transaction.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TransactionRow
                    transaction={transaction}
                    isNew={isNew}
                    index={virtualRow.index}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
