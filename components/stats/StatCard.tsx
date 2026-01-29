'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCompactNumber, formatNumber } from '@/lib/utils/formatters';

interface StatCardProps {
  label: string;
  value: number;
  type?: 'total' | 'cadence' | 'evm';
  showFullNumber?: boolean;
}

function AnimatedCounter({ value, showFull }: { value: number; showFull?: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current) return;

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValueRef.current = value;
  }, [value]);

  return (
    <span className="font-mono tabular-nums">
      {showFull ? formatNumber(displayValue) : formatCompactNumber(displayValue)}
    </span>
  );
}

export function StatCard({ label, value, type = 'total', showFullNumber = false }: StatCardProps) {
  const accentColor = {
    total: 'bg-white',
    cadence: 'bg-flow-primary',
    evm: 'bg-flow-evm',
  }[type];

  const textColor = {
    total: 'text-white',
    cadence: 'text-flow-primary',
    evm: 'text-flow-evm',
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-flow-surface rounded-xl p-6 overflow-hidden"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />

      {/* Content */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400 uppercase tracking-wider">
          {label}
        </div>
        <div className={`text-3xl md:text-4xl font-bold ${textColor}`}>
          <AnimatedCounter value={value} showFull={showFullNumber} />
        </div>
      </div>

      {/* Background glow */}
      <div
        className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-10 ${accentColor}`}
      />
    </motion.div>
  );
}
