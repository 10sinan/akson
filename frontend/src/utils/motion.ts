import type { Transition, Variants } from 'framer-motion';

/**
 * Akson Altın Denge Motion Physics:
 * Fast, crisp start with a silky-smooth natural deceleration.
 * Zero elastic bouncing or rubber-band wobble.
 * Target duration: 160ms - 200ms.
 */

// Snappy critically-damped spring (180ms, zero bounce, firm braking)
export const snappySpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.7,
};

// Natural decelerated curve (starts fast, finishes with an organic silky brake)
export const snappyEase: Transition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
};

// Ultra-fast micro transition for tabs, tooltips, and instant clicks
export const snappyFast: Transition = {
  duration: 0.12,
  ease: [0.16, 1, 0.3, 1],
};

// Aliases mapped to snappy physics for backward compatibility
export const wiseBouncy: Transition = snappySpring;
export const wiseSpring: Transition = snappySpring;
export const wiseGentle: Transition = snappyEase;

// Subtle tactile tap presets without excessive movement
export const wiseTapProps = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985 },
  transition: snappyFast,
};

// Button press preset
export const wiseButtonTapProps = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: snappyFast,
};

// Rapid cascading stagger container for lists (zero perceptual wait)
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.015,
      delayChildren: 0.01,
    },
  },
};

// Crisp cascading child item variant (no heavy blur, micro 4px offset)
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: snappyEase,
  },
};

// Cascading detail blocks reveal
export const cascadeBlockVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: snappyEase,
  },
};


// 3D page turn for tab changes: the incoming view tips up from the screen plane.
// Views must not contain position:fixed children (perspective would re-anchor them).
export const tab3DProps = {
  initial: { opacity: 0, y: 10, rotateX: -5, transformPerspective: 1400 },
  animate: { opacity: 1, y: 0, rotateX: 0, transformPerspective: 1400 },
  exit: { opacity: 0, rotateX: 3, transformPerspective: 1400, transition: { duration: 0.08 } },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  style: { transformOrigin: '50% 0%' },
} as const;

// Detail panel swings in from the right edge like a door.
export const panel3DProps = {
  initial: { opacity: 0, x: 24, rotateY: -10, transformPerspective: 1400 },
  animate: { opacity: 1, x: 0, rotateY: 0, transformPerspective: 1400 },
  exit: { opacity: 0, x: 20, rotateY: -6, transformPerspective: 1400, transition: { duration: 0.08 } },
  transition: snappySpring,
  style: { transformOrigin: '100% 50%' },
} as const;
