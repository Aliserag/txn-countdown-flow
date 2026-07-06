'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { formatNumber } from '@/lib/utils/formatters';

function Digit({ value, index }: { value: string; index: number }) {
  return (
    <div className="digit-container w-[0.85em] h-[1.4em] md:w-[0.9em] md:h-[1.35em]">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${index}-${value}`}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
          }}
          className="absolute inset-0 flex items-center justify-center text-flow-green"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function DigitGroup({ digits, label }: { digits: string[]; label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1 md:gap-1.5">
        {digits.map((digit, i) => (
          <Digit key={i} value={digit} index={i} />
        ))}
      </div>
      {label && (
        <span className="mt-2 text-[10px] font-mono text-text-muted uppercase tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
}

function Separator() {
  return (
    <div className="flex flex-col items-center justify-center self-start pt-2 md:pt-3">
      <span className="text-text-muted text-2xl md:text-4xl font-light">,</span>
    </div>
  );
}

export function CountdownDisplay() {
  const { remaining, totalDigits, isComplete, isCritical, isNearMilestone, isInitialized, totalTransactions } = useCountdown();

  // Pad to 10 digits for 1 billion
  const paddedDigits = totalDigits.length < 10
    ? Array(10 - totalDigits.length).fill('0').concat(totalDigits)
    : totalDigits;

  // Group: B,MMM,KKK,UUU
  const groups = [
    { digits: paddedDigits.slice(0, 1), label: 'B' },
    { digits: paddedDigits.slice(1, 4), label: 'M' },
    { digits: paddedDigits.slice(4, 7), label: 'K' },
    { digits: paddedDigits.slice(7, 10), label: '' },
  ];

  if (!isInitialized) {
    return (
      <div className="text-center">
        <div className="font-display text-6xl md:text-8xl lg:text-9xl text-text-muted animate-pulse">
          <span className="opacity-30">—</span>
        </div>
        <div className="mt-8 text-sm font-mono text-text-muted">
          Connecting to Flow Network...
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="font-display text-5xl md:text-7xl lg:text-8xl text-flow-green text-glow-green">
            1 BILLION
          </div>
          <div className="absolute inset-0 font-display text-5xl md:text-7xl lg:text-8xl text-flow-green blur-2xl opacity-50">
            1 BILLION
          </div>
        </motion.div>
        <div className="mt-6 text-lg text-text-secondary">
          <span className="font-mono">{formatNumber(totalTransactions)}</span> transactions on Flow
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* Main Counter */}
      <motion.div
        animate={isCritical ? { scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 0.8, repeat: isCritical ? Infinity : 0 }}
        className="font-display text-[7vw] sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-glow-green"
      >
        <div className="flex items-start justify-center gap-2 md:gap-3">
          {groups.map((group, i) => (
            <div key={i} className="flex items-start">
              <DigitGroup digits={group.digits} label={group.label} />
              {i < groups.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Remaining Counter */}
      <div className="mt-10 md:mt-14">
        <div className={`
          inline-flex items-center gap-3 px-6 py-3 rounded-full
          border transition-colors duration-500
          ${isCritical
            ? 'border-flow-green/30 bg-flow-green-dim'
            : isNearMilestone
              ? 'border-yellow-500/20 bg-yellow-500/5'
              : 'border-border bg-surface/50'
          }
        `}>
          <span className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
            Remaining
          </span>
          <span className={`
            text-lg md:text-xl font-mono font-semibold tabular-nums
            ${isCritical ? 'text-flow-green' : isNearMilestone ? 'text-yellow-400' : 'text-text-primary'}
          `}>
            {formatNumber(remaining)}
          </span>
        </div>
      </div>

      {/* Milestone label */}
      <div className="mt-6 text-sm text-text-muted">
        until <span className="text-text-secondary font-medium">1,000,000,000</span>
      </div>
    </div>
  );
}
