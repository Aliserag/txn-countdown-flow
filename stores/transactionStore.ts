import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transaction } from '@/lib/flow/types';

const MAX_TRANSACTIONS = 100;

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  subscribeWithSelector((set, get) => ({
    transactions: [],
    isLoading: true,
    error: null,

    addTransaction: (transaction) => {
      set((state) => {
        // Avoid duplicates
        if (state.transactions.some((tx) => tx.id === transaction.id)) {
          return state;
        }

        // Add to front and limit size
        const newTransactions = [transaction, ...state.transactions].slice(0, MAX_TRANSACTIONS);
        return { transactions: newTransactions };
      });
    },

    addTransactions: (transactions) => {
      set((state) => {
        const existingIds = new Set(state.transactions.map((tx) => tx.id));
        const newTxs = transactions.filter((tx) => !existingIds.has(tx.id));

        if (newTxs.length === 0) return state;

        const allTransactions = [...newTxs, ...state.transactions]
          .sort((a, b) => b.number - a.number)
          .slice(0, MAX_TRANSACTIONS);

        return { transactions: allTransactions };
      });
    },

    setTransactions: (transactions) => {
      set({
        transactions: transactions.slice(0, MAX_TRANSACTIONS),
        isLoading: false,
      });
    },

    setLoading: (loading) => {
      set({ isLoading: loading });
    },

    setError: (error) => {
      set({ error, isLoading: false });
    },

    clearTransactions: () => {
      set({ transactions: [], error: null });
    },
  }))
);

// Selector hooks for optimized re-renders
export const useTransactions = () => useTransactionStore((state) => state.transactions);
export const useTransactionLoading = () => useTransactionStore((state) => state.isLoading);
export const useTransactionError = () => useTransactionStore((state) => state.error);
export const useLatestTransaction = () => useTransactionStore((state) => state.transactions[0]);
