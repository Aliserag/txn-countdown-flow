'use client';

import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions, useTransactionLoading } from '@/stores/transactionStore';
import { TransactionRow } from './TransactionRow';

export function TransactionFeed() {
  const transactions = useTransactions();
  const isLoading = useTransactionLoading();
  const parentRef = useRef<HTMLDivElement>(null);
  const [newTxIds, setNewTxIds] = useState<Set<string>>(new Set());
  const prevTxIdsRef = useRef<Set<string>>(new Set());

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
      const timer = setTimeout(() => setNewTxIds(new Set()), 3000);
      return () => clearTimeout(timer);
    }

    prevTxIdsRef.current = currentIds;
  }, [transactions]);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  if (isLoading && transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-flow-green pulse-dot" />
            <span className="text-sm font-medium text-text-primary">Transactions</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-surface rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
            <span className="text-sm font-medium text-text-primary">Transactions</span>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 20.5h.01" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">Waiting for transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-flow-green pulse-dot" />
          <span className="text-sm font-medium text-text-primary">Transactions</span>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {transactions.length} recent
        </span>
      </div>

      {/* Transaction List */}
      <div
        ref={parentRef}
        className="h-[360px] overflow-auto"
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
