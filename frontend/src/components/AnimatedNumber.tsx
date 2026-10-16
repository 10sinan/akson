import React, { useEffect, useRef } from 'react';
import { useSpring } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 18,
    mass: 0.6,
  });

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
      }
    });
  }, [spring, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};
