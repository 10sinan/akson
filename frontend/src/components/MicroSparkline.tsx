import React, { useId } from 'react';
import { motion } from 'framer-motion';

interface MicroSparklineProps {
  data?: number[];
  color?: 'white' | 'zinc' | 'emerald' | 'blue' | 'amber' | 'purple';
  height?: number;
  className?: string;
  isLive?: boolean;
}

export const MicroSparkline: React.FC<MicroSparklineProps> = ({
  data = [12, 18, 15, 26, 22, 38, 29, 45, 42, 50, 48, 62],
  color = 'white',
  height = 24,
  className = '',
  isLive = true,
}) => {
  const gradientId = useId();

  // Normalize points to SVG coordinate space [0..100, 0..height]
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 100);
  const range = max - min || 1;

  const width = 100;
  const paddingY = 2;
  const availableHeight = height - paddingY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * availableHeight;
    return { x, y };
  });

  // Construct smooth cubic Bezier curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;
    pathD += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  // Area path for gradient fill
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Color mapping strictly monochrome
  const colorMap = {
    white: {
      stroke: '#ffffff',
      stop: '#ffffff',
      glow: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))',
    },
    emerald: {
      stroke: '#ffffff',
      stop: '#ffffff',
      glow: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.3))',
    },
    blue: {
      stroke: '#e4e4e7',
      stop: '#d4d4d8',
      glow: 'none',
    },
    amber: {
      stroke: '#a1a1aa',
      stop: '#71717a',
      glow: 'none',
    },
    purple: {
      stroke: '#ffffff',
      stop: '#a1a1aa',
      glow: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.2))',
    },
    zinc: {
      stroke: '#71717a',
      stop: '#52525b',
      glow: 'none',
    },
  }[color] || {
    stroke: '#ffffff',
    stop: '#ffffff',
    glow: 'none',
  };

  return (
    <div
      className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorMap.stop} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorMap.stop} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Translucent Area Under Curve */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Glowing Bezier Curve */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={colorMap.stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: colorMap.glow }}
          initial={{ pathLength: 0.8, opacity: 0.6 }}
          animate={
            isLive
              ? {
                  opacity: [0.75, 1, 0.8],
                  transition: {
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }
              : { opacity: 0.5 }
          }
        />

        {/* Live Pulse Dot at the latest data point */}
        {isLive && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2"
            fill={colorMap.stroke}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};

