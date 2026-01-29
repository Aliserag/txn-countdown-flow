'use client';

import { useStatsStore } from '@/stores/statsStore';

export function useConnectionStatus() {
  const isConnected = useStatsStore((state) => state.isConnected);
  const connectionError = useStatsStore((state) => state.connectionError);
  const lastHeartbeat = useStatsStore((state) => state.lastHeartbeat);

  const timeSinceHeartbeat = lastHeartbeat > 0 ? Date.now() - lastHeartbeat : null;
  const isStale = timeSinceHeartbeat !== null && timeSinceHeartbeat > 60000; // 1 minute

  return {
    isConnected,
    connectionError,
    lastHeartbeat,
    timeSinceHeartbeat,
    isStale,
    status: isConnected ? (isStale ? 'stale' : 'connected') : 'disconnected',
  };
}
