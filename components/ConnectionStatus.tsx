'use client';

import { motion } from 'framer-motion';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export function ConnectionStatus() {
  const { status, connectionError } = useConnectionStatus();

  const configs = {
    connected: {
      color: 'bg-flow-primary',
      text: 'Live',
      pulse: true,
    },
    stale: {
      color: 'bg-yellow-500',
      text: 'Reconnecting',
      pulse: true,
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      pulse: false,
    },
  };

  const statusConfig = configs[status as keyof typeof configs];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color}`} />
        {statusConfig.pulse && (
          <motion.div
            className={`absolute inset-0 rounded-full ${statusConfig.color}`}
            animate={{
              scale: [1, 1.8, 1.8],
              opacity: [0.7, 0, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </div>
      <span className="text-sm text-gray-400">{statusConfig.text}</span>
      {connectionError && (
        <span className="text-xs text-red-400">({connectionError})</span>
      )}
    </div>
  );
}
