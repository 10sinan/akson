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
  // Select appropriate icon
  const getIcon = () => {
    switch (container.category) {
      case 'core':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'service':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'worker':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

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
          ? 'bg-[#151720] border-blue-500/80 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
          : 'bg-[#121318] border-[#22242b] hover:border-white/20 hover:bg-[#15161c]'
      }`}
    >
      {/* Subtle selection ambient accent */}
      {isSelected && (
        <motion.div
          layoutId="cardActiveHighlight"
          className="absolute inset-0 bg-gradient-to-r from-blue-500/8 via-transparent to-transparent pointer-events-none"
          transition={wiseSpring}
        />
      )}

      {/* Shimmer Sweep on Refresh */}
      {isRefreshing && <ShimmerScan />}

      {/* Header: Icon, Name, Image and Status */}
      <div className="flex items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#181a22] border border-[#262832] flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white tracking-tight truncate font-sans">
              {container.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8e9192] font-mono mt-0.5 truncate">
              <span>{container.image}:{container.tag}</span>
              {container.ports.length > 0 && (
                <>
                  <span className="text-[#3a3d47]">•</span>
                  <span className="text-blue-400/90">
                    {container.ports[0].hostPort}:{container.ports[0].containerPort}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Dot & Context Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5">
            <span className="relative flex h-2 w-2">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRunning ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </span>
            <span
              className={`text-[11px] font-sans font-medium ${
                isRunning ? 'text-emerald-400' : 'text-[#8e9192]'
              }`}
            >
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
              className="p-1 rounded-md text-[#8e9192] hover:text-white hover:bg-white/5 transition opacity-40 group-hover:opacity-100 cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Resource Metrics Strip: Sparkline + Clean Numbers */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-mono relative z-10">
        {/* Left: CPU with inline sparkline */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8e9192] font-sans">CPU</span>
          <span className="text-white font-medium">
            <AnimatedNumber value={container.cpuPercent} decimals={1} suffix="%" />
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
              color={isRunning ? (container.cpuPercent > 50 ? 'amber' : 'emerald') : 'zinc'}
              height={16}
              isLive={isRunning}
            />
          </div>
        </div>

        {/* Right: RAM usage */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8e9192] font-sans">RAM</span>
          <span className="text-white font-medium">
            <AnimatedNumber value={container.memoryUsageMb} decimals={0} suffix=" MB" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
