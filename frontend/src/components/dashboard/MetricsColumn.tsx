import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Activity,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AnimatedNumber } from '../AnimatedNumber';
import { ShimmerScan } from '../Skeleton';

interface MetricsColumnProps {
  totalCpu: number;
  totalMemoryMb: number;
  runningCount: number;
  totalCount: number;
  isRefreshing?: boolean;
}

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  totalCpu,
  totalMemoryMb,
  runningCount,
  totalCount,
  isRefreshing = false,
}) => {
  // Aggregate cluster load (0-100)
  const ramPercent = Math.min(100, Math.round((totalMemoryMb / 2048) * 100));
  const cpuPercent = Math.min(100, Math.round(totalCpu));
  const overallLoad = Math.max(1, Math.round((cpuPercent + ramPercent) / 2));

  // Circular gauge circumference for radius 42: 2 * PI * 42 ~= 264
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (circumference * overallLoad) / 100;

  return (
    <section className="space-y-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white tracking-tight font-sans">
            Sistem Sağlığı & Telemetri
          </h2>
        </div>
        <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Canlı
        </span>
      </div>

      {/* Main Hero Card: Arc Gauge + Core Meters */}
      <div className="relative overflow-hidden p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-4">
        {isRefreshing && <ShimmerScan />}

        {/* Visual Hero: Radial Health Donut */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Animated Progress Arc */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-emerald-400"
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeOffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-white tracking-tight font-mono">
                %{overallLoad}
              </span>
              <span className="text-[10px] text-zinc-500 font-sans">Küme Yükü</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{totalCount === 0 ? 'Henüz servis yok' : `${runningCount} / ${totalCount} servis çalışıyor`}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {totalCount === 0
                ? 'Yeni Servis Dağıt ile ilk servisinizi başlatın.'
                : totalCount === runningCount
                ? 'Tüm servisler çalışıyor.'
                : `${totalCount - runningCount} servis durdurulmuş.`}
            </p>
          </div>
        </div>

        {/* Clean Resource Progress Meters (No nested boxed cards!) */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          {/* CPU Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                İşlemci (Konteyner CPU)
              </span>
              <span className="text-white font-mono font-medium">
                <AnimatedNumber value={totalCpu} decimals={1} prefix="%" />
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, totalCpu * 5))}%` }}
              />
            </div>
          </div>

          {/* RAM Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Bellek Tahsisi (RAM)
              </span>
              <span className="text-white font-mono font-medium">
                <AnimatedNumber value={totalMemoryMb} decimals={0} suffix=" MB" />
                <span className="text-zinc-500 text-[10px]"> / 2048 MB</span>
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, ramPercent))}%` }}
              />
            </div>
          </div>

          {/* Disk Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
                <HardDrive className="w-3.5 h-3.5 text-violet-400" />
                NVMe Depolama
              </span>
              <span className="text-white font-mono font-medium">
                128.4 <span className="text-zinc-500 text-[10px]">/ 500 GB (%25.6)</span>
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-violet-400 h-full rounded-full transition-all duration-500"
                style={{ width: '25.6%' }}
              />
            </div>
          </div>
        </div>

        {/* Compact Proxy Footer Pill */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-sans">Traefik v3.0 Rotaları:</span>
          </span>
          <span className="text-zinc-300 font-mono text-[10px]">TLS 1.3 / HTTP2 (Aktif)</span>
        </div>
      </div>
    </section>
  );
};
