import React from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion';

interface TiltCardProps extends HTMLMotionProps<'div'> {
  /** Maximum rotation in degrees at the card edges. */
  maxTilt?: number;
  children?: React.ReactNode;
}

const TILT_SPRING = { stiffness: 260, damping: 24, mass: 0.6 };

/**
 * A motion.div that leans toward the mouse in 3D and shows a soft light where the cursor is.
 * Drop-in for an existing `motion.div` card; the card must be `relative overflow-hidden`.
 * Touch input and reduced-motion users get the plain card.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  maxTilt = 7,
  children,
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}) => {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const x = useSpring(pointerX, TILT_SPRING);
  const y = useSpring(pointerY, TILT_SPRING);
  const glareOpacity = useSpring(hover, TILT_SPRING);

  const rotateX = useTransform(y, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(x, [0, 1], [-maxTilt, maxTilt]);
  const glareX = useTransform(x, [0, 1], [0, 100]);
  const glareY = useTransform(y, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(260px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.09), transparent 65%)`;

  if (reducedMotion) {
    return (
      <motion.div style={style} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} {...rest}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...rest}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (e.pointerType !== 'mouse') return;
        const rect = e.currentTarget.getBoundingClientRect();
        pointerX.set((e.clientX - rect.left) / rect.width);
        pointerY.set((e.clientY - rect.top) / rect.height);
        hover.set(1);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        pointerX.set(0.5);
        pointerY.set(0.5);
        hover.set(0);
      }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: glare, opacity: glareOpacity }}
      />
      {children}
    </motion.div>
  );
};
