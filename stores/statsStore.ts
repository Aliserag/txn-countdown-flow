import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { WinnerInfo, Transaction } from '@/lib/flow/types';

const TARGET_MILESTONE = 1_000_000_000; // 1 billion

interface StatsState {
  totalTransactions: number;
  evmCount: number;
  cadenceCount: number;
  targetMilestone: number;
  winner: WinnerInfo | null;
  blockHeight: number;
  lastUpdated: number;
  isInitialized: boolean;

  // Connection status
  isConnected: boolean;
  connectionError: string | null;
  lastHeartbeat: number;

  // Actions
  setStats: (stats: { total: number; evm: number; cadence: number; blockHeight?: number }) => void;
  incrementStats: (type: 'evm' | 'cadence', count?: number) => void;
  setWinner: (transaction: Transaction | null) => void;
  dismissCelebration: () => void;
  setConnectionStatus: (connected: boolean, error?: string | null) => void;
  updateHeartbeat: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useStatsStore = create<StatsState>()(
  subscribeWithSelector((set, get) => ({
    totalTransactions: 0,
    evmCount: 0,
    cadenceCount: 0,
    targetMilestone: TARGET_MILESTONE,
    winner: null,
    blockHeight: 0,
    lastUpdated: Date.now(),
    isInitialized: false,

    isConnected: false,
    connectionError: null,
    lastHeartbeat: 0,

    setStats: (stats) => {
      set({
        totalTransactions: stats.total,
        evmCount: stats.evm,
        cadenceCount: stats.cadence,
        blockHeight: stats.blockHeight ?? get().blockHeight,
        lastUpdated: Date.now(),
        isInitialized: true,
      });
    },

    incrementStats: (type, count = 1) => {
      set((state) => {
        const newTotal = state.totalTransactions + count;
        const updates: Partial<StatsState> = {
          totalTransactions: newTotal,
          lastUpdated: Date.now(),
        };

        if (type === 'evm') {
          updates.evmCount = state.evmCount + count;
        } else {
          updates.cadenceCount = state.cadenceCount + count;
        }

        return updates;
      });
    },

    setWinner: (transaction) => {
      set({
        winner: {
          transaction,
          timestamp: Date.now(),
          celebrationShown: false,
        },
      });
    },

    dismissCelebration: () => {
      set((state) => {
        if (!state.winner) return state;
        return {
          winner: {
            ...state.winner,
            celebrationShown: true,
          },
        };
      });
    },

    setConnectionStatus: (connected, error = null) => {
      set({
        isConnected: connected,
        connectionError: error,
        lastHeartbeat: connected ? Date.now() : 0,
      });
    },

    updateHeartbeat: () => {
      set({ lastHeartbeat: Date.now() });
    },

    setInitialized: (initialized) => {
      set({ isInitialized: initialized });
    },
  }))
);

// Selector hooks
export const useTotalTransactions = () => useStatsStore((state) => state.totalTransactions);
export const useEvmCount = () => useStatsStore((state) => state.evmCount);
export const useCadenceCount = () => useStatsStore((state) => state.cadenceCount);
export const useTargetMilestone = () => useStatsStore((state) => state.targetMilestone);
export const useRemainingTransactions = () =>
  useStatsStore((state) => Math.max(0, state.targetMilestone - state.totalTransactions));
export const useProgressPercentage = () =>
  useStatsStore((state) => (state.totalTransactions / state.targetMilestone) * 100);
export const useWinner = () => useStatsStore((state) => state.winner);
export const useIsConnected = () => useStatsStore((state) => state.isConnected);
export const useConnectionError = () => useStatsStore((state) => state.connectionError);
export const useIsInitialized = () => useStatsStore((state) => state.isInitialized);
