import type { Transition, Variants } from 'framer-motion';

/**
 * Wise Design System inspired spring physics constants.
 * Natural, tactile, and weighted transitions instead of mechanical bezier easings.
 */

// Bouncy spring for buttons, tabs, pills, and small micro-interactions
export const wiseBouncy: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 26,
  mass: 0.6,
};

// Balanced spring for cards, layout shifts, and modal dialogs
export const wiseSpring: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 0.8,
};

// Gentle, smooth spring for large area transitions, master-detail unfolding, and pages
export const wiseGentle: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 28,
  mass: 1.0,
};

// Micro-interaction presets for tactile tap compression
export const wiseTapProps = {
  whileHover: { y: -2.5, scale: 1.008 },
  whileTap: { scale: 0.972, y: 0 },
  transition: wiseBouncy,
};

// Button press preset
export const wiseButtonTapProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.96 },
  transition: wiseBouncy,
};

// Cascading stagger container for lists (cards, metrics, logs)
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

// Cascading child item variant
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: wiseSpring,
  },
};

// Cascading detail blocks reveal (header -> metrics -> tab content)
export const cascadeBlockVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: wiseSpring,
  },
};
