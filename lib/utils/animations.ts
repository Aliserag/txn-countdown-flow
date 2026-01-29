import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -30
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: { duration: 0.2 }
  }
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

export const digitRoll: Variants = {
  initial: {
    y: -20,
    opacity: 0
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30
    }
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

export const pulseGlow: Variants = {
  initial: {
    scale: 1,
    filter: 'brightness(1)'
  },
  pulse: {
    scale: [1, 1.02, 1],
    filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1)'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    y: -10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  }
};

export const celebrationBurst: Variants = {
  hidden: {
    scale: 0,
    opacity: 0
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      duration: 0.5
    }
  }
};

export const glowPulse: Variants = {
  initial: {
    boxShadow: '0 0 0 0 rgba(0, 239, 139, 0)'
  },
  glow: {
    boxShadow: [
      '0 0 0 0 rgba(0, 239, 139, 0.4)',
      '0 0 20px 10px rgba(0, 239, 139, 0.2)',
      '0 0 0 0 rgba(0, 239, 139, 0)'
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity
    }
  }
};
