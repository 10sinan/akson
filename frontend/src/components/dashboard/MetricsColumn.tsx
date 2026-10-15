import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Cpu,
  Activity,
  HardDrive,
  Network,
  ShieldCheck,
} from 'lucide-react';

interface MetricsColumnProps {
  totalCpu: number;
  totalMemoryMb: number;
}

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  totalCpu,
  totalMemoryMb,
}) => {
  return (
    <section className="space-y-4 bg-[#1a1b21] p-4 rounded-2xl border border-[#26282e] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Sistem Metrikleri
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Canlı Telemetri
        </span>
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.04,
            },
          },
        }}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* Card 1: CPU & RAM Overview */}
        <motion.article
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
          }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="p-4 bg-[#121318] rounded-xl border border-[#26282e] hover:border-white/30 transition-colors space-y-3 cursor-default"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-white">
                İşlemci & Bellek Yük Trendi
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8e9192]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-mono font-medium">+%12.4</span>
                <span>Son 6 saatlik ortalama</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#8e9192] bg-[#16171d] px-2 py-0.5 rounded border border-[#26282e]">
              Canlı 6S
            </span>
          </div>

          {/* 2-col mini boxes */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono">
            <div className="bg-[#0d0e13] p-2.5 rounded-lg border border-[#1e1f25]">
              <div className="text-[10px] text-[#8e9192] flex items-center gap-1">
                <Cpu className="w-3 h-3 text-blue-400" />
                <span>Konteyner CPU</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">
                %{totalCpu.toFixed(1)}
              </div>
              <div className="w-full bg-[#1a1b21] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, totalCpu * 5))}%` }}
                />
              </div>
            </div>

            <div className="bg-[#0d0e13] p-2.5 rounded-lg border border-[#1e1f25]">
              <div className="text-[10px] text-[#8e9192] flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-400" />
                <span>RAM Tahsisi</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {totalMemoryMb} MB
              </div>
              <div className="w-full bg-[#1a1b21] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, (totalMemoryMb / 2048) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.article>

        {/* Card 2: NVMe Disk & Storage Telemetry */}
        <motion.article
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
          }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="p-4 bg-[#121318] rounded-xl border border-[#26282e] hover:border-white/30 transition-colors space-y-3 cursor-default"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-white">NVMe RAID-1 Depolama</span>
            </div>
            <span className="text-[10px] font-mono text-[#8e9192]">nvme0n1</span>
          </div>

          <div className="bg-[#0d0e13] p-3 rounded-lg border border-[#1e1f25] space-y-2">
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-base font-bold text-white">128.4 / 500 GB</span>
              <span className="text-xs text-emerald-400">%25.6 Doluluk</span>
            </div>
            <div className="w-full bg-[#1a1b21] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: '25.6%' }} />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8e9192] pt-1">
              <span>Okuma: 142 MB/s</span>
              <span>Yazma: 86 MB/s</span>
            </div>
          </div>
        </motion.article>

        {/* Card 3: Network & Proxy Health */}
        <motion.article
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
          }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="p-4 bg-[#121318] rounded-xl border border-[#26282e] hover:border-white/30 transition-colors space-y-2.5 cursor-default"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Traefik v3.0 Rotaları</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Aktif
            </span>
          </div>
          <div className="bg-[#0d0e13] p-2.5 rounded-lg border border-[#1e1f25] space-y-1.5 text-[10px] font-mono text-[#8e9192]">
            <div className="flex justify-between items-center">
              <span>Giriş Noktası (Entrypoint):</span>
              <span className="text-white">:80 (HTTP) ➔ :443 (HTTPS)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>SSL Sağlayıcı:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Let's Encrypt TLS-ALPN-01
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>İzole Ağ:</span>
              <span className="text-blue-300">akson-bridge (172.20.0.0/16)</span>
            </div>
          </div>
        </motion.article>
      </motion.div>
    </section>
  );
};
