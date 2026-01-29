'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStatsStore, useWinner } from '@/stores/statsStore';
import { Confetti } from './Confetti';
import { formatAddress } from '@/lib/utils/formatters';

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-md"
            onClick={dismissCelebration}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="glass-card rounded-3xl p-10 max-w-lg w-full text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-flow-green/10 via-transparent to-transparent" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-flow-green/20 rounded-full blur-[100px]" />

              {/* Content */}
              <div className="relative z-10">
                {/* Number reveal */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <div className="font-display text-6xl md:text-7xl text-flow-green text-glow-green">
                    1B
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-body text-xl md:text-2xl font-semibold text-text-primary mb-2"
                >
                  Milestone Reached
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-text-tertiary mb-8"
                >
                  Flow has processed its one billionth transaction
                </motion.p>

                {/* Winner Transaction */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-surface/50 rounded-xl p-5 mb-8 border border-border"
                >
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">
                    Transaction #1,000,000,000
                  </div>
                  <div className="font-mono text-xs text-flow-green break-all leading-relaxed">
                    {winner.transaction.id}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <span
                      className={`
                        px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider
                        ${winner.transaction.type === 'cadence'
                          ? 'bg-flow-green/10 text-flow-green'
                          : 'bg-flow-blue/10 text-flow-blue'
                        }
                      `}
                    >
                      {winner.transaction.type === 'cadence' ? 'CDC' : 'EVM'}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      {formatAddress(winner.transaction.proposer, 8, 6)}
                    </span>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                  <a
                    href={`https://flowscan.io/transaction/${winner.transaction.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-flow-green text-void font-medium text-sm rounded-lg hover:bg-flow-green/90 transition-all duration-200 hover:shadow-glow-green"
                  >
                    View on Flowscan
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Flow just hit 1 BILLION transactions.\n\nThe historic billionth: flowscan.io/transaction/${winner.transaction.id}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-surface text-text-primary font-medium text-sm rounded-lg border border-border hover:bg-surface-elevated transition-colors duration-200"
                  >
                    Share on X
                  </a>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  onClick={dismissCelebration}
                  className="mt-8 text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
