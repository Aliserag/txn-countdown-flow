'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStatsStore, useWinner } from '@/stores/statsStore';
import { Confetti } from './Confetti';
import { formatAddress, formatNumber } from '@/lib/utils/formatters';

export function WinnerModal() {
  const winner = useWinner();
  const dismissCelebration = useStatsStore((state) => state.dismissCelebration);

  const isVisible = winner && !winner.celebrationShown;

  return (
    <>
      <Confetti trigger={isVisible || false} />

      <AnimatePresence>
        {isVisible && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={dismissCelebration}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-flow-surface rounded-2xl p-8 max-w-lg w-full text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-flow-primary/20 to-transparent" />

              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  1 BILLION REACHED!
                </h2>

                <p className="text-gray-400 mb-6">
                  Flow has reached its 1 billionth transaction!
                </p>

                {/* Winner Transaction */}
                <div className="bg-flow-background/50 rounded-xl p-4 mb-6">
                  <div className="text-sm text-gray-400 mb-2">
                    The 1 Billionth Transaction
                  </div>
                  <div className="font-mono text-flow-primary text-sm break-all">
                    {winner.transaction.id}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded ${
                        winner.transaction.type === 'cadence'
                          ? 'bg-flow-primary/20 text-flow-primary'
                          : 'bg-flow-evm/20 text-flow-evm'
                      }`}
                    >
                      {winner.transaction.type.toUpperCase()}
                    </span>
                    <span className="text-gray-400">
                      Proposer: {formatAddress(winner.transaction.proposer)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={`https://flowscan.io/transaction/${winner.transaction.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-flow-primary text-black font-medium rounded-lg hover:bg-flow-primary/90 transition-colors"
                  >
                    View on Flowscan
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `🎉 Flow just hit 1 BILLION transactions! The historic 1 billionth transaction: flowscan.io/transaction/${winner.transaction.id}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-[#1DA1F2] text-white font-medium rounded-lg hover:bg-[#1DA1F2]/90 transition-colors"
                  >
                    Share on X
                  </a>
                </div>

                <button
                  onClick={dismissCelebration}
                  className="mt-6 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Continue watching
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
