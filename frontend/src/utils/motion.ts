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

