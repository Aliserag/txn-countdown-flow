'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { formatNumber } from '@/lib/utils/formatters';

function AnimatedDigit({ digit, index }: { digit: string; index: number }) {
  return (
    <div className="relative w-[1ch] h-[1.2em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${index}-${digit}`}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
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

function DigitGroup({ digits }: { digits: string[] }) {
  return (
    <div className="flex">
      {digits.map((digit, i) => (
        <AnimatedDigit key={i} digit={digit} index={i} />
      ))}
    </div>
  );
}

export function CountdownDisplay() {
  const { remaining, digits, isComplete, isCritical, isNearMilestone, isInitialized } = useCountdown();

  // Group digits: XXX,XXX,XXX
  const groups = [
    digits.slice(0, 1),   // Billions
    digits.slice(1, 4),   // Millions
    digits.slice(4, 7),   // Thousands
    digits.slice(7, 10),  // Units
  ].filter(group => group.length > 0);

  if (!isInitialized) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">
          Transactions Remaining to 1 Billion
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
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Transactions Remaining to 1 Billion
      </div>

      <motion.div
        animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
        className={`
          font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold
          ${isCritical ? 'text-red-500' : isNearMilestone ? 'text-yellow-400' : 'text-white'}
        `}
      >
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {groups.map((group, i) => (
            <span key={i} className="flex items-center">
              <DigitGroup digits={group} />
              {i < groups.length - 1 && (
                <span className="text-gray-500 mx-1">,</span>
              )}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="mt-4 text-gray-400">
        <span className="font-mono">{formatNumber(remaining)}</span> transactions to go
      </div>
    </div>
  );
}
