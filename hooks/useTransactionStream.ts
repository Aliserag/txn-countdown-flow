'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTransactionStore } from '@/stores/transactionStore';
import { useStatsStore } from '@/stores/statsStore';
import { Transaction } from '@/lib/flow/types';

interface SSEMessage {
  type: 'transaction' | 'batch' | 'stats' | 'heartbeat' | 'error' | 'winner';
  data: any;
}

export function useTransactionStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const addTransactions = useTransactionStore((state) => state.addTransactions);
  const setStats = useStatsStore((state) => state.setStats);
  const incrementStats = useStatsStore((state) => state.incrementStats);
  const setConnectionStatus = useStatsStore((state) => state.setConnectionStatus);
  const setWinner = useStatsStore((state) => state.setWinner);

  const handleTransaction = useCallback(
    (transaction: Transaction) => {
      addTransaction(transaction);

      // Only count verified on-chain transactions toward the milestone.
      // countedInFirst means this tx was already included in a prior blockTxCount increment.
      if (!transaction.simulated && !(transaction as any).countedInFirst) {
        // blockTxCount: the SSE server already batched the whole block's count into this event
        const count = (transaction as any).blockTxCount ?? 1;
        incrementStats(transaction.type, count);
        // Winner detection is server-side — handled by the 'winner' SSE event
      }
    },
    [addTransaction, incrementStats]
  );

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/transactions');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        reconnectAttemptsRef.current = 0;
        setConnectionStatus(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'transaction':
              handleTransaction(message.data);
              break;

            case 'batch':
              if (Array.isArray(message.data)) {
                addTransactions(message.data);
                message.data.forEach((tx: Transaction) => {
                  if (!tx.simulated) incrementStats(tx.type);
                });
              }
              break;

            case 'stats':
              // Full authoritative sync from server (initial load or EVM update)
              setStats(message.data);
              break;

            case 'winner':
              // Server-side winner confirmed — DB record already written.
              // Use server's transaction if available, otherwise use latest known.
              if (message.data.transaction) {
                setWinner(message.data.transaction);
              } else {
                // EVM-triggered milestone: use latest transaction in feed as display winner
                const latestTx = useTransactionStore.getState().transactions[0];
                if (latestTx) setWinner(latestTx);
              }
              break;

            case 'heartbeat':
              setConnectionStatus(true);
              break;

            case 'error':
              console.error('SSE error:', message.data);
              setConnectionStatus(false, message.data.message);
              break;
          }
        } catch (e) {
          console.error('Error parsing SSE message:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus(false, 'Connection lost');
        eventSource.close();

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setConnectionStatus(false, 'Failed to connect');
    }
  }, [addTransactions, handleTransaction, incrementStats, setConnectionStatus, setStats, setWinner]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus(false);
  }, [setConnectionStatus]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: useStatsStore((state) => state.isConnected),
  };
}
