'use client';

import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const fireConfetti = useCallback(() => {
    const duration = 5000;
    const animationEnd = Date.now() + duration;

    // Flow brand colors
    const colors = ['#00EF8B', '#3334F8', '#FFFFFF'];

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        onComplete?.();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from left side
      confetti({
        particleCount: Math.floor(particleCount / 2),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 55,
        gravity: 1.2,
        drift: 0,
        ticks: 300,
      });

      // Confetti from right side
      confetti({
        particleCount: Math.floor(particleCount / 2),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 55,
        gravity: 1.2,
        drift: 0,
        ticks: 300,
      });
    }, 250);

    // Initial burst from center
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors,
      startVelocity: 45,
      gravity: 1,
      ticks: 400,
    });

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      fireConfetti();
    }
  }, [trigger, fireConfetti]);

  return null;
}
