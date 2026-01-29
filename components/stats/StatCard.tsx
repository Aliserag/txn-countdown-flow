'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { formatCompactNumber, formatNumber } from '@/lib/utils/formatters';

interface StatCardProps {
  label: string;
  value: number;
  type?: 'total' | 'cadence' | 'evm';
  description?: string;
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current) return;

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 600;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
      {formatCompactNumber(displayValue)}
    </span>
  );
}

export function StatCard({ label, value, type = 'total', description }: StatCardProps) {
  const colors = {
    total: {
      accent: 'bg-text-primary',
      text: 'text-text-primary',
      glow: 'rgba(250, 250, 250, 0.05)',
    },
    cadence: {
      accent: 'bg-flow-green',
      text: 'text-flow-green',
      glow: 'rgba(0, 239, 139, 0.08)',
    },
    evm: {
      accent: 'bg-flow-blue',
      text: 'text-flow-blue',
      glow: 'rgba(99, 102, 241, 0.08)',
    },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative glass-card rounded-2xl p-6 overflow-hidden group"
    >
      {/* Subtle corner glow on hover */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: colors.glow }}
      />

      {/* Content */}
      <div className="relative">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-1.5 h-1.5 rounded-full ${colors.accent}`} />
          <span className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className={`text-2xl md:text-3xl font-semibold ${colors.text}`}>
          <AnimatedCounter value={value} />
        </div>

        {/* Description */}
        {description && (
          <div className="mt-2 text-xs text-text-muted">
            {description}
          </div>
        )}
      </div>
    </motion.div>
  );
}
