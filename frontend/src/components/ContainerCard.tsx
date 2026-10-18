import React from 'react';
import { motion } from 'framer-motion';
import type { ContainerItem } from '../types/container';
import {
  Globe,
  Database,
  Cpu,
  Layers,
  Zap,
  MoreHorizontal,
} from 'lucide-react';
import { staggerItemVariants, wiseBouncy, wiseSpring } from '../utils/motion';
import { AnimatedNumber } from './AnimatedNumber';
import { ShimmerScan } from './Skeleton';
import { MicroSparkline } from './MicroSparkline';

interface ContainerCardProps {
  container: ContainerItem;
  isSelected: boolean;
  onSelect: (container: ContainerItem) => void;
  isRefreshing?: boolean;
  onContextMenu?: (e: React.MouseEvent, container: ContainerItem) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  isSelected,
  onSelect,
  isRefreshing = false,
  onContextMenu,
}) => {
  // Select appropriate category styling & color
  const getCategoryStyles = () => {
    switch (container.category) {
      case 'core':
        return {
          icon: <Zap className="w-4 h-4 text-sky-400" />,
          badgeClass: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
          sparkColor: 'blue' as const,
        };
      case 'service':
        return {
          icon: <Globe className="w-4 h-4 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
          sparkColor: 'emerald' as const,
        };
      case 'database':
        return {
          icon: <Database className="w-4 h-4 text-amber-400" />,
          badgeClass: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
          sparkColor: 'amber' as const,
        };
      case 'worker':
        return {
          icon: <Cpu className="w-4 h-4 text-violet-400" />,
          badgeClass: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
          sparkColor: 'purple' as const,
        };
      default:
        return {
          icon: <Layers className="w-4 h-4 text-zinc-300" />,
          badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          sparkColor: 'zinc' as const,
        };
    }
  };

  const catStyles = getCategoryStyles();
  const isRunning = container.status === 'running';

  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={wiseBouncy}
      onClick={() => onSelect(container)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, container);
        }
      }}
      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none relative overflow-hidden group ${
        isSelected
          ? 'bg-zinc-900 border-white shadow-lg shadow-black ring-1 ring-white/30'
          : isRunning
          ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 shadow-[0_0_16px_rgba(16,185,129,0.05)]'
          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
      }`}
    >
      {/* Subtle selection ambient accent */}
      {isSelected && (
        <motion.div
          layoutId="cardActiveHighlight"
          className="absolute inset-0 bg-white/[0.04] pointer-events-none"
          transition={wiseSpring}
        />
      )}

      {/* Shimmer Sweep on Refresh */}
      {isRefreshing && <ShimmerScan />}

      {/* Header: Icon, Name, Image and Status */}
      <div className="flex items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
              isRunning ? catStyles.badgeClass : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            {catStyles.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white tracking-tight truncate font-sans">
              {container.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
              <span>{container.image}:{container.tag}</span>
              {container.ports.length > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300">
                    {container.ports[0].hostPort}:{container.ports[0].containerPort}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Dot & Context Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              isRunning
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span
                className={`inline-block rounded-full ${
                  isRunning
                    ? 'h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                    : 'h-1.5 w-1.5 border border-zinc-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-sans font-medium">
              {container.statusText}
            </span>
          </div>

          {onContextMenu && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                onContextMenu(
                  {
                    clientX: rect.left,
                    clientY: rect.bottom + 4,
                    preventDefault: () => {},
                  } as React.MouseEvent,
                  container
                );
              }}
              title="Hızlı İşlemler"
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition opacity-40 group-hover:opacity-100 cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Resource Metrics Strip: Sparkline + Clean Numbers */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono relative z-10">
        {/* Left: CPU with inline sparkline */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-sans">CPU</span>
          <span className="text-white font-medium">
            <AnimatedNumber value={container.cpuPercent} decimals={1} prefix="%" />
          </span>
          <div className="w-16 h-4 opacity-75">
            <MicroSparkline
              data={
                isRunning
                  ? [
                      Math.max(4, Math.round(container.cpuPercent * 8)),
                      Math.max(6, Math.round(container.cpuPercent * 11)),
                      Math.max(3, Math.round(container.cpuPercent * 7)),
                      Math.max(9, Math.round(container.cpuPercent * 13)),
                      Math.max(5, Math.round(container.cpuPercent * 9)),
                      Math.max(12, Math.round(container.cpuPercent * 14)),
                      Math.max(7, Math.round(container.cpuPercent * 10)),
                    ]
                  : [0, 0, 0, 0, 0, 0, 0]
              }
              color={isRunning ? catStyles.sparkColor : 'zinc'}
              height={16}
              isLive={isRunning}
            />
          </div>
        </div>

        {/* Right: RAM usage */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-sans">RAM</span>
          <span className="text-white font-medium">
            <AnimatedNumber value={container.memoryUsageMb} decimals={0} suffix=" MB" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
