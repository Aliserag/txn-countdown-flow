'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { formatNumber } from '@/lib/utils/formatters';

function AnimatedDigit({ digit, index, direction = 'up' }: { digit: string; index: number; direction?: 'up' | 'down' }) {
  const yInitial = direction === 'up' ? 30 : -30;
  const yExit = direction === 'up' ? -30 : 30;

  return (
    <div className="relative w-[1ch] h-[1.2em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${index}-${digit}`}
          initial={{ y: yInitial, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: yExit, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 0.5,
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function DigitGroup({ digits, direction = 'up' }: { digits: string[]; direction?: 'up' | 'down' }) {
  return (
    <div className="flex">
      {digits.map((digit, i) => (
        <AnimatedDigit key={i} digit={digit} index={i} direction={direction} />
      ))}
    </div>
  );
}

export function CountdownDisplay() {
  const { remaining, totalDigits, isComplete, isCritical, isNearMilestone, isInitialized, totalTransactions } = useCountdown();

  // Group digits for total: XXX,XXX,XXX
  const totalGroups = [
    totalDigits.slice(0, 1),   // Billions
    totalDigits.slice(1, 4),   // Millions
    totalDigits.slice(4, 7),   // Thousands
    totalDigits.slice(7, 10),  // Units
  ].filter(group => group.length > 0 && group.some(d => d !== '0' || group === totalDigits.slice(7, 10)));

  if (!isInitialized) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">
          Total Transactions on Flow
        </div>
        <div className="font-display text-6xl md:text-8xl font-bold text-gray-600 animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="text-center py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-4xl md:text-6xl font-bold text-flow-primary"
        >
          1 BILLION REACHED!
        </motion.div>
        <div className="mt-4 text-2xl text-white">
          {formatNumber(totalTransactions)} Total Transactions
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Total Transactions on Flow
      </div>

      <motion.div
        animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
        className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-flow-primary"
      >
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {totalGroups.map((group, i) => (
            <span key={i} className="flex items-center">
              <DigitGroup digits={group} direction="up" />
              {i < totalGroups.length - 1 && (
                <span className="text-flow-primary/50 mx-1">,</span>
              )}
            </span>
          ))}
        </div>
      </motion.div>

      <div className={`mt-6 text-xl md:text-2xl font-semibold ${isCritical ? 'text-red-500' : isNearMilestone ? 'text-yellow-400' : 'text-white/80'}`}>
        <span className="font-mono">{formatNumber(remaining)}</span>
        <span className="text-gray-400 ml-2">remaining to 1 Billion</span>
      </div>
    </div>
  );
}
