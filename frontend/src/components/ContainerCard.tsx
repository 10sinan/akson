import React from 'react';
import { motion } from 'framer-motion';
import type { ContainerItem } from '../types/container';
import {
  Globe,
  Database,
  Cpu,
  Layers,
  Zap,
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
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  isSelected,
  onSelect,
  isRefreshing = false,
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

  const getAmbientGlow = () => {
    switch (container.status) {
      case 'running':
        return 'from-emerald-500/10 via-emerald-500/[0.02] to-transparent';
      case 'degraded':
        return 'from-amber-500/10 via-amber-500/[0.02] to-transparent';
      case 'restarting':
        return 'from-blue-500/10 via-blue-500/[0.02] to-transparent';
      case 'stopped':
      default:
        return 'from-zinc-500/[0.04] via-transparent to-transparent';
    }
  };

  const isRunning = container.status === 'running';

  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.972, y: 0 }}
      transition={wiseBouncy}
      onClick={() => onSelect(container)}
      className={`p-4 rounded-xl border transition-colors duration-200 cursor-pointer select-none relative overflow-hidden group ${
        isSelected
          ? 'bg-[#16171d] border-blue-500/80 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
          : 'bg-[#121318] border-[#26282e] hover:border-white/25 hover:bg-[#16171d]/80'
      }`}
    >
      {/* Ambient Status Mesh Glow */}
      <div
        className={`absolute -top-10 -right-10 w-44 h-44 rounded-full bg-gradient-to-br ${getAmbientGlow()} blur-2xl pointer-events-none transition-all duration-700`}
      />

      {/* Active Subtle Gradient Glow */}
      {isSelected && (
        <motion.div
          layoutId="cardActiveHighlight"
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent pointer-events-none"
          transition={wiseSpring}
        />
      )}

      {/* Shimmer Sweep on Refresh */}
      {isRefreshing && <ShimmerScan />}

      {/* Top Header of Card */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1a1b21] border border-[#292a2f] flex items-center justify-center shrink-0 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-mono tracking-tight flex items-center gap-2">
              {container.name}
            </h3>
            <p className="text-[11px] text-[#8e9192] line-clamp-1">{container.subtitle}</p>
          </div>
        </div>

        {/* Status Dot with Breathing Glow */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
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
          <span className="text-[11px] font-mono text-[#c4c7c8]">
            {container.statusText}
          </span>
        </div>
      </div>

      {/* Middle: Tag & Port preview */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-mono relative z-10">
        <span className="px-2 py-0.5 rounded bg-[#1a1b21] text-slate-300 border border-[#292a2f]">
          {container.image}:{container.tag}
        </span>
        {container.ports.length > 0 && (
          <span className="px-2 py-0.5 rounded bg-[#1a1b21] text-blue-300 border border-blue-500/20">
            {container.ports.map((p) => `${p.hostPort}:${p.containerPort}`).join(', ')}
          </span>
        )}
      </div>

      {/* Live Micro Sparkline Wave */}
      <div className="mt-2.5 relative z-10 px-0.5">
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
          height={18}
          isLive={isRunning}
        />
      </div>

      {/* Bottom: Resource Metric Bar with Animated Spring Fill */}
      <div className="mt-2 pt-2.5 border-t border-[#26282e]/60 flex items-center justify-between text-[11px] text-[#8e9192] font-mono relative z-10">
        <div className="flex items-center gap-1.5">
          <span>CPU</span>
          <div className="w-16 h-1.5 rounded-full bg-[#1a1b21] overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                container.cpuPercent > 50 ? 'bg-amber-400' : 'bg-blue-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(container.cpuPercent * 10, 100)}%` }}
              transition={wiseSpring}
            />
          </div>
          <span className="text-white">
            <AnimatedNumber value={container.cpuPercent} decimals={1} suffix="%" />
          </span>
        </div>

        <div>
          <span>
            RAM:{' '}
            <strong className="text-white">
              <AnimatedNumber value={container.memoryUsageMb} decimals={0} suffix=" MB" />
            </strong>
          </span>
        </div>
      </div>
    </motion.div>
  );
};
